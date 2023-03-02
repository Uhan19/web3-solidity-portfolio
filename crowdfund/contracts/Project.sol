//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

contract Project is ERC721 {
    address public owner;
    uint256 public fundingGoal;
    uint256 public deadline;
    uint256 public totalAmountRaised;
    mapping(address => uint256) public contributors;
    bool public isCanceled;
    uint256 public constant minContributionAllowed = 0.01 ether;
    uint256 public totalBadgesAwarded;
    bool private isBalanceLocked;

    constructor(address _sender, uint256 _fundingGoal) ERC721("Fundr", "FDR") {
        owner = _sender;
        fundingGoal = _fundingGoal;
        deadline = block.timestamp + 30 days;
        isBalanceLocked = false;
        isCanceled = false;
    }

    event NewContribution(address _sender, uint256 _amount);
    event FundWithdrawn(address _sender, uint256 _amount);
    event RefundSent(address _sender, uint256 _amount);

    modifier _onlyOwner() {
        require(msg.sender == owner, "Access restricted");
        _;
    }

    modifier _isActive() {
        require(
            !isCanceled &&
                block.timestamp <= deadline &&
                totalAmountRaised < fundingGoal,
            "Action is not allowed at this time"
        );
        _;
    }

    modifier _reentrant() {
        isBalanceLocked = true;
        _;
        isBalanceLocked = false;
    }

    receive() external payable {}

    function contribute() public payable _isActive {
        require(
            msg.value >= minContributionAllowed,
            "Must send at least 0.01 ETH"
        );
        totalAmountRaised += msg.value;
        contributors[msg.sender] += msg.value;
        // @dev solidity round towards 0 also
        emit NewContribution(msg.sender, msg.value);
        uint256 numOfBadgesToMint = ((contributors[msg.sender] -
            (balanceOf(msg.sender) * 1 ether)) / 1 ether);
        if (numOfBadgesToMint >= 1) {
            mintNFTBadges(msg.sender, numOfBadgesToMint);
        }
    }

    function withdraw(uint256 _amount) public _onlyOwner _reentrant {
        require(
            totalAmountRaised >= fundingGoal,
            "Funding goal has not been reached"
        );
        require(_amount <= totalAmountRaised, "Not enough funds!");
        totalAmountRaised -= _amount;
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Fund transfer failed");
        emit FundWithdrawn(msg.sender, _amount);
    }

    function refund() public _reentrant {
        require(
            (totalAmountRaised < fundingGoal && block.timestamp > deadline) ||
                isCanceled,
            "Unable to withdraw funds due to project status"
        );
        require(contributors[msg.sender] > 0, "No balance to be withdrawn");
        uint256 refundAmount = contributors[msg.sender];
        totalAmountRaised -= refundAmount;
        contributors[msg.sender] -= refundAmount;
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");
        emit RefundSent(msg.sender, refundAmount);
    }

    function mintNFTBadges(address _sender, uint256 _number) private {
        for (uint256 i = 1; i <= _number; i++) {
            uint256 tokenId = totalBadgesAwarded + i;
            _safeMint(_sender, tokenId);
        }
        totalBadgesAwarded += _number;
        // emit an event that badges has been created
    }

    function cancel() public _onlyOwner _isActive {
        isCanceled = true;
    }
}
