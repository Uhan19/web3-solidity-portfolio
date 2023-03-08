//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SpaceCoin is ERC20 {
    address public treasury;
    address public owner;

    bool public taxEnabled;

    event TaxToggled(bool);
    event TokenTransferred(address, uint256);
    event TokenTransferredFrom(address, address, uint256);

    modifier _onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor(
        address _treasury,
        uint256 _maxTotalSupply,
        uint256 _initialSupply
    ) ERC20("SpaceCoin", "SPC") {
        treasury = _treasury;
        owner = msg.sender;

        _mint(_treasury, (_maxTotalSupply - _initialSupply) * 10 ** 18);
        _mint(address(this), _initialSupply * 10 ** 18);
    }

    function toggleTax() external _onlyOwner {
        taxEnabled = !taxEnabled;
        emit TaxToggled(taxEnabled);
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (taxEnabled) {
            uint256 tax = (amount * 2) / 100;
            amount = amount - tax;
            super.transfer(treasury, tax);
        }
        super.transfer(recipient, amount);
        emit TokenTransferred(recipient, amount);
        return true;
    }

    // called by the approved spender, and when it is sent, the spender's allowance will be reduced by the amount transferred
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        if (taxEnabled) {
            uint256 tax = (amount * 2) / 100;
            amount = amount - tax;
            super.transfer(treasury, tax);
        }
        super.transferFrom(sender, recipient, amount);
        emit TokenTransferredFrom(sender, recipient, amount);
        return true;
    }
}
