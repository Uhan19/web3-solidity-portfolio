//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";

contract SpaceLP is ERC20 {

    /// @notice The minimum amount of liquidity that must be provided to create a pool
    uint256 constant MINIMUM_LIQUIDITY = 1000; //wei
    /// @notice The SpaceCoin token contract
    SpaceCoin public immutable spaceCoin;
    /// @notice The balance of SPC in the LP contract
    uint256 public spcBalance;
    /// @notice The balance of ETH in the LP contract
    uint256 public ethBalance;
    /// @notice bool to prevent reentrancy
    bool private locked;

    /// @notice Emitted when liquidity is deposited
    event LiquidityDeposited(address indexed sender, uint256 spcDeposited, uint256 ethDeposited);
    /// @notice Emitted when SPC is Swapped for ETH
    event SPCSwappedForETH(uint256 ethOut);
    /// @notice Emitted when ETH is Swapped for SPC
    event ETHSwappedForSPC(uint256 spcOut);
    /// @notice Emitted when liquidity is withdrawn
    event LiquidityWithdrawn(address indexed to, uint256 spcOut, uint256 ethOut);

    /// @notice error returned when not enough funds are deposited
    error NotEnoughFundsProvided();
    /// @notice error returned when there is not enough liquidity in the pool 
    error InsufficientLiquidity(uint256 minimumLiquidity);
    /// @notice error returned when sending ETH fails
    error EthTransferFailed();
    /// @notice error returned when there are no funds to be withdrawn
    error ZeroAmountToWithdraw(uint8 zero);
    /// @notice error returned when there are no LP tokens
    error ZeroTokenBalance(uint8 zero); 
    /// @notice error returned when there are no LP token supply
    error ZeroTokenTotalSupply(uint8 zero);
    /// @notice error returned when the input value provided are invalid when obtaining swap price quotes
    error InvalidSwap();
    /// @notice error returned when the new K is less than the old K, indicating a swap failure
    error SwapFailed();
    /// @notice reentrancy guard
    error ReentrantDetected();
    /// @notice error returned when the transfer of SPC fails
    error SpcTransferFailed();

    /// @notice initialize the spaceCoin contract
    constructor(SpaceCoin _spaceCoin) ERC20("SPC-ETH LP Token", "SPC-ETH") {
        spaceCoin = _spaceCoin;
    }

    /// @notice modifier to prevent reentrancy
    /** @dev if the contract the 'unlocked' bool is true, then that means a 
     *       function is already being executed, and the modifier will revert.
     *       Once the function has finished executing, the 'unlocked' bool is set to false again.
     *  */ 
    modifier lock() {
        if (locked) revert ReentrantDetected();
        locked = true;
        _;
        locked = false;
    }

    /// @notice Adds ETH-SPC liquidity to LP contract
    /// @param to The address that will receive the LP tokens
    function deposit(address to) external lock payable {
        uint256 lpTokenSupply = totalSupply();
        uint256 spcDeposited = spaceCoin.balanceOf(address(this)) - spcBalance;
        uint256 ethDeposited = address(this).balance - ethBalance;
        if (spcDeposited == 0 || ethDeposited == 0) revert NotEnoughFundsProvided();
        if (lpTokenSupply == 0) {
            uint256 liquidity = sqrt(spcDeposited * ethDeposited);
            if (liquidity < MINIMUM_LIQUIDITY) revert InsufficientLiquidity(MINIMUM_LIQUIDITY);
            _mint(to, liquidity - MINIMUM_LIQUIDITY);
            _mint(address(1), MINIMUM_LIQUIDITY); 
        } else {
            uint256 liquidity = min((lpTokenSupply * spcDeposited) / spcBalance, (lpTokenSupply * ethDeposited) / ethBalance);
            if (liquidity == 0) revert InsufficientLiquidity(liquidity);
            _mint(to, liquidity);
        }
        spcBalance = spaceCoin.balanceOf(address(this));
        ethBalance = address(this).balance;

        emit LiquidityDeposited(msg.sender, spcDeposited, ethDeposited);
    }

    /// @notice Returns ETH-SPC liquidity to liquidity provider
    /// @param to The address that will receive the outbound token pair
    function withdraw(address to) public lock {
        uint256 lpTokenBalance = balanceOf(address(this));
        if (totalSupply() == 0) revert ZeroTokenTotalSupply(0);
        if (lpTokenBalance == 0) revert ZeroTokenBalance(0);
        uint256 spcOut = spcBalance * lpTokenBalance / totalSupply();
        uint256 ethOut = ethBalance * lpTokenBalance / totalSupply();
        if (spcOut == 0 || ethOut == 0) revert ZeroAmountToWithdraw(0);
        _burn(address(this), balanceOf(address(this)));

        bool transferSuccess = spaceCoin.transfer(to, spcOut);
         if (!transferSuccess) revert SpcTransferFailed();
        (bool success, ) = to.call{value: ethOut}("");
        if (!success) revert EthTransferFailed();

        emit LiquidityWithdrawn(to, spcOut, ethOut);
        spcBalance = spaceCoin.balanceOf(address(this));
        ethBalance = address(this).balance;
    }

    /// @notice Swaps ETH for SPC, or SPC for ETH
    /// @param to The address that will receive the outbound SPC or ETH
    /// @param isETHtoSPC Boolean indicating the direction of the trade
    function swap(address to, bool isETHtoSPC) public lock payable { 
        if (spcBalance == 0 || ethBalance == 0) revert InsufficientLiquidity(0);
        uint256 kBeforeSwap = spcBalance * ethBalance;
        if (isETHtoSPC) {
            uint256 ethDeposited = address(this).balance - ethBalance;
            uint256 newEthBalanceWithFee = ethBalance + (ethDeposited - (ethDeposited / 100));
            uint256 newSPCBalance = kBeforeSwap / newEthBalanceWithFee;
            bool success = spaceCoin.transfer(to, spcBalance - newSPCBalance);
            if (!success) revert SpcTransferFailed();
            emit ETHSwappedForSPC(spcBalance - newSPCBalance);
        } else {
            uint256 spcDeposited = spaceCoin.balanceOf(address(this)) - spcBalance;
            uint256 newSPCBalanceWithFee = spcBalance + (spcDeposited - spcDeposited / 100);
            uint256 newEthBalance = (ethBalance * spcBalance) / newSPCBalanceWithFee;
            (bool success, ) = to.call{value: ethBalance - newEthBalance}("");
            if (!success) revert EthTransferFailed();
            emit SPCSwappedForETH(ethBalance - newEthBalance);
        }
        spcBalance = spaceCoin.balanceOf(address(this));
        ethBalance = address(this).balance;
        uint256 kAfterSwap = spcBalance * ethBalance;
        assert(kAfterSwap > kBeforeSwap);
    }


    /// @notice provides FE with a price quote for a swap
    /// @param ethAmount The amount of ETH to be swapped for SPC
    /// @param spcAmount The amount of SPC to be swapped for ETH
    function getSwapPrice(uint256 ethAmount, uint256 spcAmount) external view returns (uint256) {
        if ((ethAmount == 0 && spcAmount == 0) || (ethAmount != 0 && spcAmount != 0)) revert InvalidSwap();
        // swapping ETH for SPC
        if (ethAmount > 0) {
            // get eth amount after swap fee to calculate price quote
            uint256 ethAmountWithFee = ethAmount - (ethAmount / 100);
            // get total ETH balance after swap
            uint256 expectedEthBalance = ethBalance + ethAmountWithFee; 
            // get total SPC balance after swap
            uint256 expectedSpcBalance = (spcBalance * ethBalance) / expectedEthBalance;
            uint256 ethFinalBalance = ethBalance + ethAmount;
            if (expectedSpcBalance * ethFinalBalance < spcBalance * ethBalance) revert SwapFailed();
            uint256 spcPriceQuote = spcBalance - expectedSpcBalance;
            return spcPriceQuote;
        } else {
            // swapping SPC for ETH
            // get spc amount after swap fee to calculate price quote
            uint256 spcAmountWithFee = spcAmount - (spcAmount / 100);
            // get total SPC balance after swap
            uint256 expectedSpcBalance = spcBalance + spcAmountWithFee;
            // get total ETH balance after swap
            uint256 expectedEthBalance = (ethBalance * spcBalance) / expectedSpcBalance;
            uint256 spcFinalBalance = spcBalance + spcAmount;
            if (spcFinalBalance * expectedEthBalance < spcBalance * ethBalance) revert SwapFailed();
            uint256 ethPriceQuote = ethBalance - expectedEthBalance;
            return ethPriceQuote;
        }
    }

    /// @notice returns the minimum of two numbers
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    } 

    /// @notice returns the square root of a number
    /** @dev this function uses the Babylonian method to calculate the square root
        https://ethereum.stackexchange.com/questions/2910/how-to-calculate-square-root-in-solidity
    */
    /// @param num The number to be square rooted
    function sqrt(uint256 num) public pure returns (uint256 y) {
        uint z = (num + 1) / 2;
        y = num;
        while (z < y) {
            y = z;
            z = (num / z + z) / 2;
        }
    }

}