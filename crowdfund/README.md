# Crowdfund Project

## Setup

See [README-Setup.md](./README-Setup.md)

## Technical Spec

<!-- Here is the list the technical requirements of the project. We include them here by default for your first project, but for future projects we encourage you to develop a healthy habit of thinking + writing out the project specs and pasting them in your README. You may find you come up with additional specifications, in which case you should add them here.

The goal here is to help you think through the possible edge cases of all your contracts -->

- There should be a `ProjectFactory` contract with a `create` method that deploys instances of the `Project` contract using the factory create pattern.

  - Each `Project` instance should be able to receive contributions independent of the others.
  - Each project has a goal amount, in ETH, which cannot be changed after a project gets created.

- The requirements for contributions are as follows:

  - The contribution amount must be at least 0.01 ETH.
  - There is no upper limit on contribution size.
  - Anyone can contribute to the project, including the creator.
  - One address can contribute as many times as they like.
  - No one can withdraw their funds until the project either fails or gets cancelled.

- The requirements for contributor badges are as follows:

  - Each project should use its own NFT contract.
  - An address earns 1 badge for each 1 ETH in their **total contribution** for that project.
  - One address can earn multiple badges for a single project, but should only earn 1 badge per 1 ETH.
    - For example, if Alice contributes 0.4 ETH to Project A, she is owed 0 badges. If she then contributes 0.7 ETH to Project A, her total contribution to that project is now 1.1 ETH, so she is owed 1 badge. If she then contributes 1 ETH, her total contribution is now 2.1 ETH, and she has earned 2 badges total.
  - The minting of badges should not happen in the same contract call as the contribution. In other words, there should be a separate function for a user to claim the contributor badges they are owed.
    - When an address calls this claim function, they should receive the correct number of badges based on their total contribution so far, while accounting for any badges that were previously claimed.
    - When the claim function is called by a contract, that contract must [indicate it is able to handle NFTs](https://stackoverflow.com/a/71191158) or else the transaction should revert.
  - Regardless of the end result of the crowdfunding effort, the project's badges are left alone. They should still be transferable.

- The terminal states of a project are as follows:

  - If the project is not fully funded within 30 days:

    - The project goal is considered to have failed.
    - No one can contribute anymore.
    - Contributors can get a refund of their contribution.

  - Once a project becomes fully funded:

    - No one else can contribute (however, the last contribution can go over the goal).
    - The creator cannot cancel the project.
    - The creator can withdraw any amount of contributed funds.

  - Before the 30 days are over and if the project is not yet fully funded, the creator can cancel the project.
    - This should have the same effect as a project failing to reach its goal within the 30 days.

## Code Coverage Report

51 passing (7s)

--------------------------------|----------|----------|----------|----------|----------------|
File | % Stmts | % Branch | % Funcs | % Lines |Uncovered Lines |
--------------------------------|----------|----------|----------|----------|----------------|
contracts/ | 100 | 90 | 100 | 100 | |
Project.sol | 100 | 90 | 100 | 100 | |
ProjectFactory.sol | 100 | 100 | 100 | 100 | |
contracts/malicious-contracts/ | 100 | 50 | 100 | 100 | |
AttackProject.sol | 100 | 50 | 100 | 100 | |
--------------------------------|----------|----------|----------|----------|----------------|
All files | 100 | 88.1 | 100 | 100 | |
--------------------------------|----------|----------|----------|----------|----------------|

## Design Exercise Answer

Answer: To be able to have the Crowdfundr smart contract support contribution tiers without having to creat multiple contracts, a mapping of the contributors's address and their contribution tiers could be implemented. We can create a struct to keep track of whether the NFT has been claimed yet.

    struct ContributorTier {
      uint256 contributionTier
      bool hasClaimedTierNFT
    }
    mapping(address => ContributorTier) public contributorTiers;

Depending on how many contribution tiers we would like we could create a unique id for each tier (e.g. 1, 2, 3). Depending on the minimum requirement of each tier, when a contributor sends funds to the contract, we can check their contribution balance and update their tier mapping.

Assuming that their tier NFTs are not minted until the project has ended, we can create a function:

    function claimTierNFT () external {
      // check if the contributor has claimed their NFT or not: !contributorTiers[msg.sender].hasClaimedTierNFT
      // change their has claimed status to true
      // check for contributor's tier: contributorTiers[msg.sender]
      // mint NFT depending on the tier that is returned (use exsting tokenId logic)
    }

if we keep the same logic that each time 1ETH is contributed by the customer, we credit them with 1 NFT, then we would need to account for that logic. When they claim their badges, we can check whether they have claimed their tier NFT and adjust the number of badge NFT minted accordingly.

With this high level structure, the contract will be able to support contribution tiers without creating separate NFT contracts.

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?
