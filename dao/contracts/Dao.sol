// // SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./INftMarketPlace.sol";
import "hardhat/console.sol";

/// @title DAO contract to allow members to vote on NFTs to buy
/// @author Yuehan Duan
contract Dao {
    /// @notice name for the contract
    string public constant name = "Collector Dao";

    /// @notice Membership fee is 1 ETH
    uint256 public constant MEMBERSHIP_FEE = 1 ether;
    /// @notice Voting period is 7 days
    uint256 public constant VOTING_PERIOD = 7 days;
    /// @notice Reward for executing a proposal is 0.01 ETH
    uint256 public constant REWARD = 0.01 ether;
    /// @notice Quorum is 25%
    uint256 public constant QUORUM = 25;

    /// @notice domain separator typehash for EIP-712
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );

    /// @notice The EIP-712 typehash for the ballot struct used by the contract
    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,bool support)");

    /// @notice Total number of members used to calulate quorum
    uint256 public totalMembers;

    /// @notice Total number of proposals
    uint256 public totalProposals;

    /// @notice contract balance
    uint256 public balance;

    /// @notice executor rewards
    mapping(address => uint256) public rewards;

    /// @notice Proposal for each proposer
    mapping(address => uint256) public proposalIds;

    /// @notice Mapping to store member information
    mapping(address => Member) public membership;

    /// @notice Mapping to store proposal information
    mapping(uint256 => Proposal) public proposals;

    /// @notice Struct to store proposal information
    struct Proposal {
        /// @notice nounce for each proposal
        uint256 nounce;
        /// @notice address of the proposer
        address proposer;
        /// @notice the timestamp that the proposal will be available for execution, set once the vote succeeds
        // uint256 eta;
        /// @notice the time of the proposal's creation
        uint256 startTime;
        /// @notice the time of the proposal's expiration
        uint256 endTime;
        /// @notice the total number of votes in support of this proposal
        uint256 forVotes;
        /// @notice the total number of votes in opposition to this proposal
        uint256 againstVotes;
        /// @notice the total number of members at the time of proposal creation
        uint256 totalMembersAtCreation;
        /// @notice the total number of members who have voted on this proposal
        uint256 totalParticipants; // do I need this?
        /// @notice bool value to check if proposal has been canceled
        bool canceled;
        /// @notice bool value to check if proposal has been executed
        bool executed;
        /// @notice mapping to store voter information
        mapping(address => bool) hasVoted;
    }

    /// @notice Struct to store voter information
    struct Receipt {
        /// @notice whether or not a vote has been cast
        bool hasVoted;
        /// @notice whether or not the voter supports the proposal
        bool forProposal;
        /// @notice the number of votes the voter had, which were cast
        uint256 votes;
    }

    /// @notice Enum to store proposal state
    enum ProposalState {
        Active,
        Succeeded,
        Defeated,
        Expired,
        Executed
    }

    /// @notice Struct to store member information
    struct Member {
        /// @notice the member's voting power
        uint256 votingPower;
        /// @notice the time of the member's creation
        uint256 memberSince;
        /// @notice bool value to check if member is a member
        bool isMember;
        /// @notice member position in order of joining
        uint256 positionOrder;
    }

    /// @notice proposal created event
    event ProposalCreated(uint256 proposalId, address proposer, uint256 nounce);
    /// @notice proposal executed event
    event ProposalExecuted(uint256 proposalId, address sender);
    /// @notice nft purchased event
    event NftPurchased(uint256 price, uint256 nftId, address nftContract);
    /// @notice member joined event
    event MemberJoined(address member);
    /// @notice vote cast event
    event VoteCast(
        address voter,
        uint256 proposalId,
        bool support,
        uint256 votes
    );
    /// @notice onERC721Received event
    event ERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes data
    );
    /// @notice member redeemed execution reward event
    event RewardRedeemed(address member, uint256 reward);

    // constructor(address _nftMarketplace) {
    //     nftMarketplace = _nftMarketplace;
    // }

    /// @notice Allows a member to create a proposal;
    /// @param targets The address of the contract to call
    /// @param values The amount of ETH to send
    /// @param calldatas The data to pass to the function
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    )
        public
        returns (
            uint256,
            address,
            uint256
        )
    {
        if (!membership[msg.sender].isMember) revert NotAMember();
        if (targets.length != values.length)
            revert ProposalFuncInformationMisMatch();
        if (targets.length != calldatas.length)
            revert ProposalFuncInformationMisMatch();
        if (targets.length == 0) revert NoActionsProvided();

        totalProposals++;
        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            totalProposals
        );
        Proposal storage newProposal = proposals[proposalId];
        newProposal.nounce = totalProposals;
        newProposal.proposer = msg.sender;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;
        newProposal.totalMembersAtCreation = totalMembers;

        emit ProposalCreated(proposalId, msg.sender, newProposal.nounce);
        return (proposalId, msg.sender, newProposal.nounce); // other contract can have access to this info
    }

    /// @notice creates a proposal Id by hashing the encoded parameters
    /// @param targets The address of the contract to call
    /// @param values The amount of ETH to send
    /// @param calldatas The data to pass to the function
    /// @param proposalCount The current number of proposals
    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 proposalCount
    ) internal pure returns (uint256) {
        return
            uint256(
                keccak256(abi.encode(targets, values, calldatas, proposalCount))
            );
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        // if (proposalId > totalProposals) revert ProposalDoesNotExist();
        Proposal storage proposal = proposals[proposalId];
        if (proposal.nounce == 0) {
            revert InvalidProposalId();
        }
        if (
            proposal.forVotes > proposal.againstVotes &&
            passQuorum(proposalId) &&
            block.timestamp >= proposal.endTime // look at this
        ) {
            return ProposalState.Succeeded;
        } else if (
            proposal.forVotes <= proposal.againstVotes &&
            passQuorum(proposalId) &&
            block.timestamp >= proposal.endTime // look at this
        ) {
            return ProposalState.Defeated;
        } else if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        } else {
            return ProposalState.Expired;
        }
    }

    /// @notice Calculates the quorum threshold for a proposal
    /// @dev Quorum is calculated using the total number of members at the time of proposal creation
    /// @param proposalId The id of the proposal to calculate quorum for
    /// need to augment this to deal with floating decimals
    function passQuorum(uint256 proposalId) public view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        return
            (proposal.totalParticipants * 100) /
                proposal.totalMembersAtCreation >=
            QUORUM;
    }

    /// @notice Allows a member to directly vote on a proposal;
    function vote(uint256 proposalId, bool forProposal) public {
        return _vote(msg.sender, proposalId, forProposal);
    }

    /// @notice Allows a member to cast a vote on a proposal by signature;
    function castVoteBySignature(
        uint256 proposalId,
        bool forProposal,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                block.chainid,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(BALLOT_TYPEHASH, proposalId, forProposal)
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        _vote(signer, proposalId, forProposal);
    }

    /// @notice Allows bulk voting on proposals by signature;
    function castBulkVotesBySignature(
        uint256[] memory proposalId,
        bool[] memory forProposal,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public {
        if (proposalId.length == 0) revert NoActionsProvided();
        if (proposalId.length != forProposal.length)
            revert ProposalFuncInformationMisMatch();
        if (proposalId.length != v.length)
            revert ProposalFuncInformationMisMatch();
        if (proposalId.length != r.length)
            revert ProposalFuncInformationMisMatch();
        if (proposalId.length != s.length)
            revert ProposalFuncInformationMisMatch();

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                block.chainid,
                address(this)
            )
        );

        for (uint256 i = 0; i < proposalId.length; i++) {
            bytes32 structHash = keccak256(
                abi.encode(BALLOT_TYPEHASH, proposalId[i], forProposal[i])
            );

            bytes32 digest = keccak256(
                abi.encodePacked("\x19\x01", domainSeparator, structHash)
            );

            address signer = ecrecover(digest, v[i], r[i], s[i]);
            if (signer == address(0)) revert InvalidSignature();
            _vote(signer, proposalId[i], forProposal[i]);
        }
    }

    /// @notice Allows a member to cast a vote on a proposal;
    function _vote(
        address voter,
        uint256 proposalId,
        bool forProposal
    ) internal {
        if (state(proposalId) != ProposalState.Active)
            revert ProposalNotActive();
        if (!membership[voter].isMember) revert NotAMember();
        if (membership[voter].votingPower == 0) revert NoVotingPower();
        /* The if condition below checks 2 scenarios
          1. If the member joined after the proposal was created
          2. If the member joined at the same time as the proposal was created (same block), 
            and the member join transaction was executed after the proposal creation transaction
        */
        if (
            membership[voter].memberSince > proposals[proposalId].startTime ||
            (membership[voter].memberSince == proposals[proposalId].startTime &&
                membership[voter].positionOrder >
                proposals[proposalId].totalMembersAtCreation)
        ) revert NotAMemberAtTimeOfProposal();
        Proposal storage proposal = proposals[proposalId];
        if (proposal.hasVoted[voter]) revert AlreadyVoted();
        proposal.totalParticipants += 1;
        proposal.hasVoted[voter] = true;
        if (forProposal) {
            proposal.forVotes += membership[voter].votingPower;
        } else {
            proposal.againstVotes += membership[voter].votingPower;
        }
        emit VoteCast(
            voter,
            proposalId,
            forProposal,
            membership[voter].votingPower
        );
    }

    /// @notice function to buy membership for exactly 1 ETH and add to mapping
    function buyMembership() external payable {
        if (msg.value != MEMBERSHIP_FEE) {
            revert IncorrectMembershipFee();
        }
        if (membership[msg.sender].isMember) {
            revert AlreadyAMember();
        }
        Member memory member;
        member.votingPower = 1;
        totalMembers += 1;
        balance += msg.value;
        member.memberSince = block.timestamp;
        member.positionOrder = totalMembers;
        member.isMember = true;
        membership[msg.sender] = member;
    }

    /// @notice function to execute proposals that have succeeded
    /// @dev anyone can execute a proposal that has succeeded
    /// @param proposalId the id of the proposal to execute
    function execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 nouce
    ) external {
        Proposal storage proposal = proposals[proposalId];
        uint256 proposalExecuteId = hashProposal(
            targets,
            values,
            calldatas,
            nouce
        );
        if (proposalExecuteId != proposalId) {
            revert InvalidProposalId();
        }
        if (state(proposalId) != ProposalState.Succeeded) {
            revert ProposalNotSucceeded();
        }
        proposal.executed = true;
        membership[msg.sender].votingPower += 1;
        for (uint256 i = 0; i < targets.length; i++) {
            uint256 value = values[i];
            values[i] = 0;
            balance -= value;
            (bool success, ) = targets[i].call{value: value}(calldatas[i]);
            if (!success) {
                revert ProposalExecutionFailed(targets[i], value, calldatas[i]);
            }
        }
        if (balance >= 5 ether) {
            balance -= REWARD;
            rewards[msg.sender] = REWARD;
        }
        emit ProposalExecuted(proposalId, msg.sender);
    }

    function redeemReward() external {
        if (rewards[msg.sender] == 0) revert NoReward();
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: reward}("");
        if (!success) revert RewardRedemptionFailed();
        emit RewardRedeemed(msg.sender, reward);
    }

    /// @notice inaccordance with the ERC721 standard, this function is called when an NFT is transferred to this contract
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        // Emit an event or perform other actions when your contract receives a token
        emit ERC721Received(operator, from, tokenId, data);

        // Return the function selector of the onERC721Received function to confirm the receipt
        return this.onERC721Received.selector;
    }

    /// @notice Purchases an NFT for the DAO
    /// @param marketplace The address of the INftMarketplace
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @param maxPrice The price above which the NFT is deemed too expensive
    function buyNFTFromMarketplace(
        INftMarketplace marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    ) external {
        if (msg.sender != address(this)) revert InvalidSender();
        uint256 price = marketplace.getPrice(nftContract, nftId);
        if (balance < price) revert InsufficientFunds();
        if (price > maxPrice) revert NftTooExpensive(price, maxPrice);
        emit NftPurchased(price, nftId, nftContract);
        balance -= price;
        marketplace.buy{value: price}(nftContract, nftId);
    }

    error NftTooExpensive(uint256 price, uint256 maxPrice);
    error NotAMember();
    error ProposalFuncInformationMisMatch();
    error NoActionsProvided();
    error FoundExistingProposalFromProposer();
    error ProposalDoesNotExist();
    error IncorrectMembershipFee();
    error AlreadyAMember();
    error NoVotingPower();
    error ProposalNotActive();
    error NotAMemberAtTimeOfProposal();
    error InvalidSignature();
    error AlreadyVoted();
    error ProposalNotSucceeded();
    error ProposalExecutionFailed(address, uint256, bytes);
    error SendRewardFailed();
    error InvalidProposalId();
    error InvalidSender();
    error InsufficientFunds();
    error NoReward();
    error RewardRedemptionFailed();
}
