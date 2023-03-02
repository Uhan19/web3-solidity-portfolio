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
    mapping(address => uint256) public badgesEarned;
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
    event NewBadgesMinted(address _sender, uint256 _number);
    event ProjectCanceled(address _sender);

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
        if (contributors[msg.sender] >= 1 ether) {
            badgesEarned[msg.sender] = contributors[msg.sender] / 1 ether;
        }
        // @dev solidity round towards 0 also
        emit NewContribution(msg.sender, msg.value);
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

    // think about whether I need to verify who is calling this function
    function claimNFTBadges() public _reentrant {
        uint256 numOfBadgesToMint = ((badgesEarned[msg.sender] -
            (balanceOf(msg.sender))) / 1);
        require(
            numOfBadgesToMint >= 1,
            "Contribution min level not met to receive badges"
        );
        for (uint256 i = 1; i <= numOfBadgesToMint; i++) {
            uint256 tokenId = totalBadgesAwarded + i;
            _safeMint(msg.sender, tokenId);
        }
        totalBadgesAwarded += numOfBadgesToMint;
        emit NewBadgesMinted(msg.sender, numOfBadgesToMint);
    }

    function cancel() public _onlyOwner _isActive {
        isCanceled = true;
        emit ProjectCanceled(msg.sender);
    }
}
