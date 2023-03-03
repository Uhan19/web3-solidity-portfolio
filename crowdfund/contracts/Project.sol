//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

/// @title Crowdfundr
/// @author Yuehan Duan
/// @notice This is a contract that will allow the user to create a crowdfunding campaign.
contract Project is ERC721 {
    address public owner;
    uint256 public fundingGoal;
    uint256 public deadline;
    uint256 public totalAmountRaised;
    uint256 public totalAmountWithdrawn;
    mapping(address => uint256) public contributors;
    mapping(address => uint256) public badgesEarned;
    bool public isCanceled;
    uint256 public constant minContributionAllowed = 0.01 ether;
    uint256 public totalBadgesAwarded;
    bool private isBalanceLocked;

    constructor(address _sender, uint256 _fundingGoal) ERC721("Fundr", "FDR") {
        require(_sender != address(0), "Creator cannot be the zero address");
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

    /// @dev checking that the sender is the owner of the contract
    modifier _onlyOwner() {
        require(msg.sender == owner, "Access restricted");
        _;
    }

    /// @dev check if the contract is active, based on project deadline, fundGoal status, and if the contract is canceled
    modifier _isActive() {
        require(
            !isCanceled &&
                block.timestamp <= deadline &&
                totalAmountRaised < fundingGoal,
            "Action is not allowed at this time"
        );
        _;
    }

    /// @dev prevent reentrancy attacks
    modifier _reentrant() {
        isBalanceLocked = true;
        _;
        isBalanceLocked = false;
    }

    receive() external payable {}

    /// @dev allows users to contribute to the campaign if they meet the 0.01 ETH min
    function contribute() external payable _isActive {
        require(
            msg.value >= minContributionAllowed,
            "Must send at least 0.01 ETH"
        );
        totalAmountRaised += msg.value;
        contributors[msg.sender] += msg.value;
        if (contributors[msg.sender] >= 1 ether) {
            badgesEarned[msg.sender] = contributors[msg.sender] / 1 ether;
        }
        emit NewContribution(msg.sender, msg.value);
    }

    /// @dev only allows the owner to withdraw the funds if the campaign is successful
    function withdraw(uint256 _amount) external _onlyOwner _reentrant {
        require(
            totalAmountRaised >= fundingGoal,
            "Funding goal has not been reached"
        );
        require(
            _amount <= totalAmountRaised - totalAmountWithdrawn,
            "Not enough funds!"
        );
        totalAmountWithdrawn += _amount;
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Fund transfer failed");
        emit FundWithdrawn(msg.sender, _amount);
    }

    /// @dev only allows contributors to get refund if the campaign failed or is canceled
    function refund() external _reentrant {
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

    /// @dev allows contributors to claim NFT badges, if they have contributed at least 1 ETH
    function claimNFTBadges() external _reentrant {
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

    /// @dev allows the owner to cancel the campaign
    function cancel() external _onlyOwner _isActive {
        isCanceled = true;
        emit ProjectCanceled(msg.sender);
    }
}
