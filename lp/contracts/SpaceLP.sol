//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";

contract SpaceLP is ERC20 {

    constructor(SpaceCoin _spaceCoin) ERC20("FILL_ME_IN", "FILL_ME_IN") { }

    /// @notice Adds ETH-SPC liquidity to LP contract
    /// @param to The address that will receive the LP tokens
    function deposit(address to) public { }

    /// @notice Returns ETH-SPC liquidity to liquidity provider
    /// @param to The address that will receive the outbound token pair
    function withdraw(address to) public { }

    /// @notice Swaps ETH for SPC, or SPC for ETH
    /// @param to The address that will receive the outbound SPC or ETH
    /// @param isETHtoSPC Boolean indicating the direction of the trade
    function swap(address to, bool isETHtoSPC) public { }

}