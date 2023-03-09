//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceCoin is ERC20 {
    address public immutable TREASURY;
    address public immutable OWNER;
    uint256 public immutable MAX_TOTAL_SUPPLY = 500_000;
    uint256 public immutable INITIAL_SUPPLY = 150_000;
    uint256 public immutable TAX_RATE = 2;

    bool public taxEnabled;

    event TaxToggled(bool);
    event TokenTransferred(address, address, uint256);

    modifier _onlyOwner() {
        require(msg.sender == OWNER, "Only the owner is allowed");
        _;
    }

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

    function toggleTax() external _onlyOwner {
        taxEnabled = !taxEnabled;
        emit TaxToggled(taxEnabled);
    }

    function _transfer(
        address from,
        address recipient,
        uint256 amount
    ) internal virtual override {
        if (taxEnabled) {
            uint256 tax = (amount * TAX_RATE) / 100;
            amount = amount - tax;
            super._transfer(from, TREASURY, tax);
        }
        super._transfer(from, recipient, amount);
        emit TokenTransferred(from, recipient, amount);
    }
}
