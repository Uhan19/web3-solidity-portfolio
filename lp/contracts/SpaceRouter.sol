//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "./SpaceLP.sol";
import "./SpaceCoin.sol";

contract SpaceRouter {
    /// @notice The SpaceLP contract
    SpaceLP public immutable spaceLP;
    /// @notice The SpaceCoin contract
    SpaceCoin public immutable spaceCoin;

    /// @notice error returned when there are not enough SPC to be deposited
    error InsufficientSPCDeposit(uint256 spc);
    /// @notice error returned when there are not enough ETH to be deposited
    error InsufficientETHDeposit(uint256 eth);
    /// @notice error returned when the ETH refund fails
    error ETHRefundFailed();
    /// @notice error returned when the swap amount returned is less than the min amount defined by the user
    error SlippageExceeded(uint256 amount);
    /// @notice error returned when the amount of LP tokens to be withdrawn exceeds the user's balance
    error LpTokenBalanceExceeded(uint256 lpToken);
    /// @notice error returned when the LP token transfer fails
    error LpTokenTransferFailed(uint256 lpToken);
    /// @notice error returned when the SPC transfer fails
    error SpcTokenTransferFailed(uint256 spc);
    /// @notice error returned when deposit is invalid
    error InsufficientDeposit();
    /// @notice error returned when the amount of LP tokens to be withdrawn is zero
    error ZeroLpTokenSent();

    constructor(SpaceLP _spaceLP, SpaceCoin _spaceCoin) { 
        spaceLP = _spaceLP;
        spaceCoin = _spaceCoin;
    }

    /// @notice Provides ETH-SPC liquidity to LP contract
    /// @param spc The desired amount of SPC to be deposited
    /// @dev The desired amount of ETH to be deposited is indicated by 
    //    msg.value
    function addLiquidity(uint256 spc) public payable {
        if (spc == 0 || msg.value == 0) revert InsufficientDeposit();
        // calculate spc if spaceCoin.taxEnabled() is true
        uint256 spcAfterTax = spaceCoin.taxEnabled() ? spc - (spc * spaceCoin.TAX_RATE()) / 100 : spc;

        // calculate the optimal amount of ETH given the amount of SPC to be deposited
        uint256 ethToBeDeposited = spaceLP.ethBalance() == 0 ? msg.value :
            (spaceLP.ethBalance() * spcAfterTax) / spaceLP.spcBalance();

        // calculate the optimal amount of SPC given the amount of ETH to be deposited
        uint256 spcExpected = spaceLP.spcBalance() == 0 ? spc : 
            (spaceLP.spcBalance() * msg.value) / spaceLP.ethBalance();

        // if the amount of ETH sent is greater than or equal to the optimal amount of ETH
        if (msg.value >= ethToBeDeposited) { 
            (bool SpcSuccess) = spaceCoin.transferFrom(msg.sender, address(spaceLP), spc);
            if (!SpcSuccess) revert SpcTokenTransferFailed(spc);
            spaceLP.deposit{value: ethToBeDeposited}(msg.sender);
            // if the amount of ETH sent is greater than the optimal amount of ETH, we need to send back the excess ETH
            if (msg.value > ethToBeDeposited) {
                (bool success, ) = msg.sender.call{value: msg.value - ethToBeDeposited}("");
                if (!success) revert ETHRefundFailed();
            }
        } else {
            // if the amount of ETH sent is less than the optimal amount of ETH
            if (spcExpected > spc) revert InsufficientSPCDeposit(spcExpected);
            uint256 spcToBeDeposited = spcExpected;
            if (spaceCoin.taxEnabled()) {
                // if the tax is enabled, we need to calculate the amount of SPC sent, so that after the tax is applied, 
                // the amount of SPC sent is the optimal amount of SPC given msg.value
                spcToBeDeposited = (spcExpected * 100) / (100 - spaceCoin.TAX_RATE());
            } 
            (bool success) = spaceCoin.transferFrom(msg.sender, address(spaceLP), spcToBeDeposited);
            if (!success) revert SpcTokenTransferFailed(spcToBeDeposited);
            spaceLP.deposit{value: msg.value}(msg.sender);
        }
    }

    /// @notice Removes ETH-SPC liquidity from LP contract
    /// @param lpToken The amount of LP tokens being returned
    function removeLiquidity(uint256 lpToken) public { 
        if (lpToken > spaceLP.balanceOf(msg.sender)) revert LpTokenBalanceExceeded(lpToken);
        if (lpToken == 0) revert ZeroLpTokenSent();
        (bool success) = spaceLP.transferFrom(msg.sender, address(spaceLP), lpToken);
        if (!success) revert LpTokenTransferFailed(lpToken);
        spaceLP.withdraw(msg.sender);
    }

    /// @notice Swaps ETH for SPC in LP contract
    /// @param spcOutMin The minimum acceptable amout of SPC to be received
    function swapETHForSPC(uint256 spcOutMin) public payable {  
        if(msg.value == 0) revert InsufficientETHDeposit(msg.value);
        uint256 expectedSPC = spaceLP.getSwapPrice(msg.value, 0);
        uint256 expectedSPCWithTax = spaceCoin.taxEnabled() ? expectedSPC - (expectedSPC * spaceCoin.TAX_RATE()) / 100 : expectedSPC;
        if (expectedSPCWithTax < spcOutMin) revert SlippageExceeded(expectedSPCWithTax);
        spaceLP.swap{value: msg.value}(msg.sender, true);
    }

    /// @notice Swaps SPC for ETH in LP contract
    /// @param spcIn The amount of inbound SPC to be swapped
    /// @param ethOutMin The minimum acceptable amount of ETH to be received
    function swapSPCForETH(uint256 spcIn, uint256 ethOutMin) public {
        if (spcIn == 0) revert InsufficientSPCDeposit(spcIn);
        uint256 spcInWithTax = spaceCoin.taxEnabled() ? spcIn - (spcIn * spaceCoin.TAX_RATE()) / 100 : spcIn;
        uint256 expectedETH = spaceLP.getSwapPrice(0, spcInWithTax);
        if (expectedETH < ethOutMin) revert SlippageExceeded(expectedETH);
        (bool success) = spaceCoin.transferFrom(msg.sender, address(spaceLP), spcIn);
        if (!success) revert LpTokenTransferFailed(spcIn);
        spaceLP.swap(msg.sender, false);
    }
}