# DAO Project

## Setup

See [README-Setup.md](./README-Setup.md)

## Technical Spec

<!-- Here you should list your DAO specification, so that your staff micro-auditor knows what spec to compare your implementation to. -->

    - [x]  Implement a voting system that allows voting with EIP-712 signatures.
    - Implement a proposal system that:
        - [x]  Supports proposing the execution of a series of arbitrary function calls.
        - [x]  Incentivizes positive interactions with governance proposals by offering financial rewards and voting power increases.
    - [x]  Allows anyone to buy a membership for 1 ETH.
    - [x]  Allows a member to create governance proposals, which include a series of proposed arbitrary functions to execute.
    - Allows members to vote on proposals:
        - [x]  Members can vote over 7 day period, beginning immediately after the proposal is generated.
        - [x]  A vote is either "Yes" or "No" (no “Abstain” votes).
        - [x]  A member's vote on a proposal cannot be changed after it is cast.

        > Any time duration should be measured in seconds, not the number of blocks that has passed.
        >
    - A proposal is considered passed when **all of the following** are true:
        - [x]  The voting period has concluded.
        - [x]  There are more Yes votes than No votes.
        - [x]  A 25% quorum requirement is met.
    - [x]  Allows any address to execute successfully passed proposals.
    - [x]  Reverts currently executing proposals if **any** of the proposed arbitrary function calls fail. (Entire transaction should revert.)
    - Incentivizes positive interactions with the DAO's proposals, by:
        - [x]  Incentivizing rapid execution of successfully passed proposals by offering a 0.01 ETH execution reward, provided by the DAO contract, to the address that executes the proposal.

        > In cases where the DAO contract has less than a 5 ETH balance, execution rewards should be skipped
        >

        .


    ### **Implementation Requirements**

    - [x]  A standardized NFT-buying function called **`buyNFTFromMarketplace`** should exist on the DAO contract so that DAO members can include it as one of the proposed arbitrary function calls on routine NFT purchase proposals.
    - [x]  Even though this DAO has one main purpose (collecting NFTs), the proposal system should support proposing the execution of **any** arbitrarily defined functions on any contract.
    - [x]  A function that allows an individual member to vote on a specific proposal should exist on the DAO contract.
    - [x]  A function that allows any address to submit a DAO member's vote using off-chain generated EIP-712 signatures should exist on the DAO contract.
        - [x]  Another function should exist that enables bulk submission and processing of many EIP-712 signature votes, from several DAO members, across multiple proposals, to be processed in a single function call.

    ### **Proposal System Caveats**

    - [x]  It should be possible to submit proposals with identical sets of proposed function calls.
    - [x]  The proposal's data should not be stored in the contract's storage. Instead, only a hash of the data should be stored on-chain.

    ### **Voting System Caveats**

    - [x]  DAO members must have joined before a proposal is created in order to be allowed to vote on that proposal.
        - [x]  Note: This applies even when the two transactions - member joining and proposal creation - fall in the same block. In that case, the ordering of transactions in the block is what matters.
    - [x]  A DAO member's voting power should be increased each time they perform one of the following actions:
        - [x]  +1 voting power (from zero) when an address purchases their DAO membership
        - [x]  +1 voting power to the creator of a successfully executed proposal

    ### **Testing Requirements**

    - [x]  In addition to the usual expectation that you will test all the main use cases in the spec, you must also write a test case for buying an NFT via a proposal.

## Code Coverage Report

<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->

42 passing (15s)

-------------------------|----------|----------|----------|----------|----------------|
File | % Stmts | % Branch | % Funcs | % Lines |Uncovered Lines |
-------------------------|----------|----------|----------|----------|----------------|
contracts/ | 100 | 90.54 | 100 | 97.54 | |
Dao.sol | 100 | 92.42 | 100 | 99.08 | 388 |
DaoTest.sol | 100 | 100 | 100 | 100 | |
INftMarketPlace.sol | 100 | 100 | 100 | 100 | |
MockNftMarketPlace.sol | 100 | 75 | 100 | 81.82 | 43,47 |
-------------------------|----------|----------|----------|----------|----------------|
All files | 100 | 90.54 | 100 | 97.54 | |
-------------------------|----------|----------|----------|----------|----------------|

## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

One approach is to create another function called delegateVotingPower, where the function would have two parameters: to and votesToDelegate. The to address would the the member that the votes would be delegated to, and the votesToDelegate would be the amount of votes to be delegated. We can further augment the Member struct to include an indicator to keep track of the amount of votes that was received. This way they can still delegate their own votes, but not the ones that were received from others.

    ` struct Member {
        /// @notice the member's voting power
        uint256 votingPower;
        /// @notice bool value to check if member is a member
        bool isMember;
        /// @notice member position in order of joining
        uint256 positionOrder;
        /// @notice number of votes received from others
        uint256 amountOfVotesReceived
    }`

    `function delegateVotingPower(address to, uint256 votesToDelegate) external {
        if (membership[msg.sender].votingPower == 0) revert NoVotingPowersToDelegate();
        if (votesToDelegate > membership[msg.sender].votingPower) revert InsufficientVotingPower();
        membership[msg.sender].votingPower -= votesToDelegate;
        membership[to].amountOfVotesReceived += votesToDelegate;
    }`

this approach will ensure that the delegated votes are non-transitive.

> What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

If there are malicious groups they could coordinate and pull all of the votes to one person and have a skewed representation during voting. Overall, it would just cause vote imbalance in terms of representation among the DAO members. Non-transitive voting will not completely solve this problem but make it a bit less prounounced.
