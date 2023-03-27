//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ERC20 Token with tax functionality
/// @author Yuehan Duan
/// @notice Override ERC20 transfer function to add tax functionality
/// @dev Owner of the contract can toggle tax on/off
contract SpaceCoin is ERC20 {
    address public immutable TREASURY;
    address public immutable OWNER;
    uint256 public immutable MAX_TOTAL_SUPPLY = 500_000;
    uint256 public immutable INITIAL_SUPPLY = 150_000;
    uint256 public immutable TAX_RATE = 2;

    bool public taxEnabled;

    event TaxToggled(bool);
    event TokenTransferred(address, address, uint256);

    /// @dev Modifier to restrict access to the owner of the contract
    modifier _onlyOwner() {
        require(msg.sender == OWNER, "Only the owner is allowed");
        _;
    }

    /// @notice The treasury is the address that receives the tax
    /// @dev calls _mint to mint initial supply to ICO contract and rest to treasury
    /// @param _owner The address of the owner of the contract
    /// @param _treasury The address of the treasury
    /// @param _ico The address of the ICO contract
    constructor(
        address _owner,
        address _treasury,
        address _ico
    ) ERC20("SpaceCoin", "SPC") {
        TREASURY = _treasury;
        OWNER = _owner;

        _mint(_treasury, (MAX_TOTAL_SUPPLY - INITIAL_SUPPLY) * 10 ** 18);
        _mint(_ico, INITIAL_SUPPLY * 10 ** 18);
    }

    /// @notice Toggle tax on/off by owner
    function toggleTax() external _onlyOwner {
        taxEnabled = !taxEnabled;
        emit TaxToggled(taxEnabled);
    }

    /// @notice Override ERC20 transfer function to add tax functionality
    /// @dev If tax is enabled, tax is calculated based on TAX_RATE and deducted from the amount
    /// @param from The address of the sender
    /// @param recipient The address of the recipient
    /// @param amount The amount of tokens to be transferred
    function _transfer(
        address from,
        address recipient,
        uint256 amount
    ) internal virtual override {
        uint256 amountToSend = amount;
        if (taxEnabled) {
            uint256 tax = (amount * TAX_RATE) / 100;
            amountToSend -= tax;
            super._transfer(from, TREASURY, tax);
        }
        super._transfer(from, recipient, amountToSend);
        emit TokenTransferred(from, recipient, amountToSend);
    }
}
