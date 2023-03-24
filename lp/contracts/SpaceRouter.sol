//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceLP.sol";
import "./SpaceCoin.sol";

contract SpaceRouter {
    /// @notice The SpaceLP contract
    SpaceLP public immutable spaceLP;
    /// @notice The SpaceCoin contract
    SpaceCoin public immutable spaceCoin;

    error InsufficientSPCDeposit(uint256 spc);
    error InsufficientETHDeposit(uint256 eth);
    error ETHRefundFailed();
    error SlippageExceeded(uint256 amount);
    error LpTokenBalanceExceeded(uint256 lpToken);

    constructor(SpaceLP _spaceLP, SpaceCoin _spaceCoin) { 
        spaceLP = _spaceLP;
        spaceCoin = _spaceCoin;
    }

    /// @notice Provides ETH-SPC liquidity to LP contract
    /// @param spc The desired amount of SPC to be deposited
    /// @dev The desired amount of ETH to be deposited is indicated by 
    //    msg.value
    // add a reentrancy guard to protect against .call() reentry
    function addLiquidity(uint256 spc) public payable returns (uint256 liquidity) {
        // uint256 ethOutOfSync = address(spaceLP).balance - spaceLP.ethBalance() + msg.value;
        // uint256 spcOutOfSync = spaceCoin.balanceOf(address(spaceLP)) - spaceLP.spcBalance() + spc;
        uint256 spcAfterTax = spaceCoin.taxEnabled() ? spc - (spc * spaceCoin.TAX_RATE()) / 100 : spc;
        uint256 ethToBeDeposited = spaceLP.ethBalance() == 0 ? msg.value :
            (spaceLP.ethBalance() * spcAfterTax) / spaceLP.spcBalance(); // optimalETH given deposited SPC
        uint256 spcToBeDeposited = spaceLP.spcBalance() == 0 ? spc :
            (spaceLP.spcBalance() * msg.value) / spaceLP.ethBalance(); // optimalSPC given deposited ETH
        if (msg.value >= ethToBeDeposited) {
            spaceCoin.transferFrom(msg.sender, address(spaceLP), spc);
            liquidity = spaceLP.deposit{value: ethToBeDeposited}(msg.sender);
            if (msg.value > ethToBeDeposited) {
                (bool success, ) = msg.sender.call{value: msg.value - ethToBeDeposited}("");
                if (!success) revert ETHRefundFailed();
            }
            return liquidity;
        } else {
            if (spcToBeDeposited > spc) revert InsufficientSPCDeposit(spcToBeDeposited);
            uint256 ethDeposit = msg.value;
            if (spaceCoin.taxEnabled()) {
                uint256 spcToBeDepositedTaxed = spcToBeDeposited - (spcToBeDeposited * spaceCoin.TAX_RATE()) / 100;
                ethDeposit = (spaceLP.ethBalance() * spcToBeDepositedTaxed) / spaceLP.spcBalance(); 
            }
            spaceCoin.transferFrom(msg.sender, address(spaceLP), spcToBeDeposited);
            liquidity = spaceLP.deposit{value: ethDeposit}(msg.sender);
            if (msg.value > ethDeposit) {
                (bool success, ) = msg.sender.call{value: msg.value - ethDeposit}("");
                if (!success) revert ETHRefundFailed();
            }
            return liquidity;
        }
    }

    /// @notice Removes ETH-SPC liquidity from LP contract
    /// @param lpToken The amount of LP tokens being returned
    function removeLiquidity(uint256 lpToken) public { 
        if (lpToken > spaceLP.balanceOf(msg.sender)) revert LpTokenBalanceExceeded(lpToken);
        spaceLP.transferFrom(msg.sender, address(spaceLP), lpToken);
        spaceLP.withdraw(msg.sender);
    }

    /// @notice Swaps ETH for SPC in LP contract
    /// @param spcOutMin The minimum acceptable amout of SPC to be received
    function swapETHForSPC(uint256 spcOutMin) public payable {
        if(msg.value == 0) revert InsufficientETHDeposit(msg.value);
        uint256 newEthBalanceWithFee = spaceLP.ethBalance() + (msg.value - (msg.value / 100));
        uint256 expectedSPC = spaceLP.spcBalance() - (spaceLP.ethBalance() * spaceLP.spcBalance() / (newEthBalanceWithFee));
        if (expectedSPC < spcOutMin) revert SlippageExceeded(expectedSPC);
        spaceLP.swap{value: msg.value}(msg.sender, true);
    }

    /// @notice Swaps SPC for ETH in LP contract
    /// @param spcIn The amount of inbound SPC to be swapped
    /// @param ethOutMin The minimum acceptable amount of ETH to be received
    function swapSPCForETH(uint256 spcIn, uint256 ethOutMin) public {
        if (spcIn == 0) revert InsufficientSPCDeposit(spcIn);
        uint256 newSpcBalanceWithFee = spaceLP.spcBalance() + (spcIn - (spcIn / 100));
        uint expectedETH = spaceLP.ethBalance() - (spaceLP.ethBalance() * spaceLP.spcBalance() / newSpcBalanceWithFee);
        if (expectedETH < ethOutMin) revert SlippageExceeded(expectedETH);
        spaceCoin.transferFrom(msg.sender, address(spaceLP), spcIn);
        spaceLP.swap(msg.sender, false);
    }

}