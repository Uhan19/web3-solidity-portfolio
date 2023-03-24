//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";

import "hardhat/console.sol";

contract SpaceLP is ERC20 {

    // do I need a MINIMUM_LIQUIDITY constant? (avoid division by 0)
    uint256 constant MINIMUM_LIQUIDITY = 1000;
    SpaceCoin public immutable spaceCoin;
    /// @notice The balance of SPC in the LP contract
    uint256 public spcBalance;
    /// @notice The balance of ETH in the LP contract
    uint256 public ethBalance;

    event LiquidityDeposited(address indexed sender, uint256 spcDeposited, uint256 ethDeposited);
    event SPCSwappedForETH(uint256 ethOut);
    event ETHSwappedForSPC(uint256 spcOut);

    error NotEnoughFundsProvided();
    error InsufficientLiquidity(uint256 minimumLiquidity);
    error EthTransferFailed();
    error ZeroAmountToWithdraw(uint8 zero); // check uint8 here
    error ZeroTokenBalance(uint8 zero); // check uint8 here
    error ZeroTokenTotalSupply(uint8 zero); // check uint8 here
    // error SpcTransferFailed(); 

    constructor(SpaceCoin _spaceCoin) ERC20("SPC-ETH LP Token", "SPC-ETH") {
        spaceCoin = _spaceCoin;
    }

    /// @notice Adds ETH-SPC liquidity to LP contract
    /// @param to The address that will receive the LP tokens
    function deposit(address to) external payable returns (uint256 liquidity) {
        uint256 lpTokenSupply = totalSupply();
        uint256 spcDeposited = spaceCoin.balanceOf(address(this)) - spcBalance;
        uint256 ethDeposited = address(this).balance - ethBalance;
        if (spcDeposited == 0 || ethDeposited == 0) revert NotEnoughFundsProvided();
        if (lpTokenSupply == 0) {
            liquidity = sqrt(spcDeposited * ethDeposited);
            if (liquidity < MINIMUM_LIQUIDITY) revert InsufficientLiquidity(MINIMUM_LIQUIDITY);
            _mint(to, liquidity - MINIMUM_LIQUIDITY);
            _mint(address(1), MINIMUM_LIQUIDITY); 
        } else {
            liquidity = min((lpTokenSupply * spcDeposited) / spcBalance, (lpTokenSupply * ethDeposited) / ethBalance);
            // console.log("liquidity: %s", liquidity);
            if (liquidity == 0) revert InsufficientLiquidity(liquidity); // I dont think this is needed, already checking for 0 above
            _mint(to, liquidity);
        }
        spcBalance = spaceCoin.balanceOf(address(this));
        ethBalance = address(this).balance;

        emit LiquidityDeposited(msg.sender, spcDeposited, ethDeposited);
        return liquidity;
    }

    /// @notice Returns ETH-SPC liquidity to liquidity provider
    /// @param to The address that will receive the outbound token pair
    function withdraw(address to) public {
        // if (balanceOf(to) == 0) revert AddressHasNoLpTokens();
        uint256 lpTotalSupply = totalSupply();
        uint256 lpTokenBalance = balanceOf(address(this));
        console.log("lpTotalSupply: %s", lpTotalSupply);
        if (lpTotalSupply == 0) revert ZeroTokenTotalSupply(0);
        if (lpTokenBalance == 0) revert ZeroTokenBalance(0);
        uint256 spcOut = spcBalance * lpTokenBalance / lpTotalSupply;
        uint256 ethOut = ethBalance * lpTokenBalance / lpTotalSupply;
        console.log("spcOut: %s", spcOut);
        console.log("ethOut: %s", ethOut);
        if (spcOut == 0 || ethOut == 0) revert ZeroAmountToWithdraw(0); // is this possible?
        _burn(address(this), balanceOf(address(this)));
        spaceCoin.transfer(to, spcOut);
        (bool success, ) = to.call{value: ethOut}("");
        if (!success) revert EthTransferFailed();
        spcBalance = spaceCoin.balanceOf(address(this)) - spcOut;
        ethBalance = address(this).balance - ethOut;
    }

    /// @notice Swaps ETH for SPC, or SPC for ETH
    /// @param to The address that will receive the outbound SPC or ETH
    /// @param isETHtoSPC Boolean indicating the direction of the trade
    function swap(address to, bool isETHtoSPC) public payable { 
        if (spcBalance == 0 || ethBalance == 0) revert InsufficientLiquidity(0);
        uint256 kBeforeSwap = spcBalance * ethBalance;
        if (isETHtoSPC) {
            // calulate ETH minus swap fee (1%)
            uint ethDeposited = address(this).balance - ethBalance;
            uint newEthBalanceWithFee = ethBalance + (ethDeposited - (ethDeposited / 100));
            uint256 newSPCBalance = (spcBalance * ethBalance) / newEthBalanceWithFee;
            console.log("spcOout", spcBalance - newSPCBalance);
            spaceCoin.transfer(to, spcBalance - newSPCBalance); // how do I check if this is successful before the event is emitted? 
            emit SPCSwappedForETH(spcBalance - newSPCBalance);
            spcBalance = newSPCBalance;
            ethBalance = address(this).balance;
        } else {
            // calulate SPC minus swap fee (1%)
            uint256 spcDeposited = spaceCoin.balanceOf(address(this)) - spcBalance;
            // console.log("spcDeposited", spcDeposited);
            uint256 newSPCBalanceWithFee = spcBalance + (spcDeposited - spcDeposited / 100);
            uint256 newEthBalance = (ethBalance * spcBalance) / newSPCBalanceWithFee;
            // console.log("newSPCBalanceWithFee", newSPCBalanceWithFee);
            // console.log("newEthBalance", newEthBalance);
            // console.log("ethBalance", ethBalance);
            // console.log("ethOut", ethBalance - newEthBalance);
            (bool success, ) = to.call{value: ethBalance - newEthBalance}("");
            if (!success) revert EthTransferFailed();
            emit SPCSwappedForETH(ethBalance - newEthBalance);
            spcBalance = spaceCoin.balanceOf(address(this));
            ethBalance = address(this).balance;
        }
        uint256 kAfterSwap = spcBalance * ethBalance;
        assert(kAfterSwap > kBeforeSwap);
    }

    /// @notice this function is a recovery method for when the external and internal state of the LP is out of sync
    /// i.e. if someone sent funds directly to the LP contract, but failed to call deposit() or swap() to update the reserves
    // function sync() public {
    //     // update the reserves
    // }

    /// @notice returns the minimum of two numbers
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    } 

    /// @notice returns the square root of a number
    /** @dev this function uses the Babylonian method to calculate the square root
        https://ethereum.stackexchange.com/questions/2910/how-to-calculate-square-root-in-solidity
    */
    function sqrt(uint256 num) public pure returns (uint256 y) {
        uint z = (num + 1) / 2;
        y = num;
        while (z < y) {
            y = z;
            z = (num / z + z) / 2;
        }
    }

}