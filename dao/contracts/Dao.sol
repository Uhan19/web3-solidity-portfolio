// // SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./INftMarketPlace.sol";

/// @title DAO contract to allow members to vote on NFTs to buy
/// @author Yuehan Duan
contract Dao {
    address public nftMarketplace;

    /// @notice name for the contract
    string public constant name = "Collector Dao";

    /// @notice Membership fee is 1 ETH
    uint256 public constant MEMBERSHIP_FEE = 1 ether;
    /// @notice Voting period is 7 days
    uint256 public constant VOTING_PERIOD = 7 days;

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

    /// @notice Proposal for each proposer
    mapping(address => uint) public proposalIds;

    /// @notice Mapping to store member information
    mapping(address => Member) public membership;

    /// @notice Mapping to store proposal information
    mapping(uint256 => Proposal) public proposals;

    /// @notice Struct to store proposal information
    struct Proposal {
        /// @notice unique id for each proposal
        uint256 id;
        /// @notice address of the proposer
        address proposer;
        /// @notice the addresses to call
        address[] targets;
        /// @notice the values to send
        uint[] values;
        /// @notice the data to pass to the functions to be called
        bytes[] calldatas;
        /// @notice the timestamp that the proposal will be available for execution, set once the vote succeeds
        uint256 eta;
        /// @notice the time of the proposal's creation
        uint256 startTime;
        /// @notice the time of the proposal's expiration
        uint256 endTime;
        /// @notice the total number of votes in support of this proposal
        uint256 forVotes;
        /// @notice the total number of votes in opposition to this proposal
        uint256 againstVotes;
        /// @notice bool value to check if proposal has been canceled
        bool canceled;
        /// @notice bool value to check if proposal has been executed
        bool executed;
    }

    /// @notice Enum to store proposal state
    enum ProposalState {
        Active,
        Pending,
        Queued,
        Canceled,
        Expired,
        Executed
    }

    /// @notice proposal created event
    event ProposalCreated(uint256 proposalId, address proposer);

    /// @notice Struct to store member information
    struct Member {
        uint256 votingPower;
        uint256 memberSince;
        bool isMember;
    }

    constructor(address _nftMarketplace) {
        nftMarketplace = _nftMarketplace;
    }

    /// @notice Allows a member to create a proposal;
    /// @param targets The address of the contract to call
    /// @param values The amount of ETH to send
    /// @param calldatas The data to pass to the function
    function propose(
        address[] memory targets,
        uint[] memory values,
        bytes[] memory calldatas
    ) public returns (uint256) {
        if (!membership[msg.sender].isMember) revert NotAMember();
        if (
            targets.length != values.length &&
            targets.length != calldatas.length
        ) revert ProposalFuncInformationMisMatch();
        if (targets.length == 0) revert NoActionsProvided();
        if (proposalIds[msg.sender] != 0)
            revert FoundExistingProposalFromProposer();
        if (proposalIds[msg.sender] != 0)
            // check proposal state
            totalProposals++;
        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            totalProposals
        );

        Proposal storage newProposal = proposals[proposalId];

        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.calldatas = calldatas;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + VOTING_PERIOD;

        proposalIds[msg.sender] = proposalId;
        emit ProposalCreated(proposalId, msg.sender);
        return newProposal.id;
    }

    /// @notice creates a proposal Id by hashing the encoded parameters
    /// @param targets The address of the contract to call
    /// @param values The amount of ETH to send
    /// @param calldatas The data to pass to the function
    /// @param proposalCount The current number of proposals
    function hashProposal(
        address[] memory targets,
        uint[] memory values,
        bytes[] memory calldatas,
        uint256 proposalCount
    ) internal pure returns (uint256) {
        return
            uint256(
                keccak256(abi.encode(targets, values, calldatas, proposalCount))
            );
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        if (proposalId > totalProposals) revert ProposalDoesNotExist();

        Proposal storage proposal = proposals[proposalId];

        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.timestamp <= proposal.startTime) {
            return ProposalState.Pending;
        } else if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        } else if (!proposal.executed) {
            return ProposalState.Queued;
        } else {
            return ProposalState.Expired;
        }
    }

    // /// @notice Allows a member to vote on a proposal;
    // function vote(uint256 proposalId, bool forProposal, address voter) public {
    //     if (!membership[msg.sender].isMember) revert NotAMember();
    //     if (membership[msg.sender].votingPower == 0) revert NoVotingPower(); // do I need this?
    //     if (state(proposalId) != ProposalState.Active)
    //         revert ProposalNotActive();
    //     if (
    //         membership[msg.sender].memberSince < proposals[proposalId].startTime
    //     ) revert NotAMemberAtTimeOfProposal();

    //     // look at at _castVote function in GovernorAlpha.sol
    // }

    /// @notice Allows a member to vote on a proposal by signature;
    function castVoteBySignature(
        uint proposalId,
        bool forProposal,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                getChainId(),
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(BALLOT_TYPEHASH, proposalId, forProposal)
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        address signatory = ecrecover(digest, v, r, s);
        if (signatory == address(0)) revert InvalidSignature();
    }

    /// @notice Allows bulk voting on proposals by signature;
    function castBulkVotesBySignature() public {
        // TODO
    }

    function getChainId() internal view returns (uint) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
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
        member.votingPower += 1;
        member.memberSince = block.timestamp;
        member.isMember = true;
        membership[msg.sender] = member;
        totalMembers += 1;
    }

    /// @notice Purchases an NFT for the DAO
    /// @param marketplace The address of the INftMarketplace
    /// @param nftContract The address of the NFT contract to purchase
    /// @param nftId The token ID on the nftContract to purchase
    /// @param maxPrice The price above which the NFT is deemed too expensive
    /// and this function call should fail
    function buyNFTFromMarketplace(
        INftMarketplace marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    ) external {
        uint256 price = marketplace.getPrice(nftContract, nftId);

        if (price > maxPrice) {
            revert NftTooExpensive(price, maxPrice);
        }

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
}
