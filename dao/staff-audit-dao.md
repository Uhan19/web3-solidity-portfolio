https://github.com/0xMacro/student.Uhan19/tree/459cb1b85e645b429477efed5400b5241b5d453f/dao

Audited By: Karolis Ramanauskas

# General Comments

This is a rather complex contract so good job on implementing it! Overall, it's clear you gained an understanding behind how DAO voting works, along with EIP-712 standard used for generating and verifying signatures, as well as how a smart contract may execute arbitraty functions given correct calldata. Your code is well documented and overall pretty well structured. Also, nice usage of "pull" pattern to reward the executor!

In summary, I have found only 1 low vulnerability, along with some code quality improvements and nitpicks. Excellent job!

# Design Exercise

Your solution to non-transitive voting correctly identifies that voting power of delegatee gets increased, and that of delegator gets decreased. However, current solution is incomplete as it does not keep track of who delegeated voting power to whom making it impossible to later undelegate correctly. A final solution to the non-transitive voting may look like this:

1. Have a mapping of delegateable voting power for each DAO member, starting at 1:

```solidity
/// @dev when a new member joins, they start with 1 votePower
mapping votePower (address => uint);
```

2. Have a mapping of delegations, which keeps track of delegator to delegatee:

```solidity
/// @notice mapping delegator => delegatee
mapping delegating(address => address); 
```

3. Having a mechanism to delegate voting power by decreasing your own voting power and increasing your delegatee’s voting power:

```solidity
function delegateTo(address to) external onlyMember {
  votePower[msg.sender]--;
  votingPower[to]++;
  delegating[msg.sender] = to;
}
```

4. Having a mechanism to undelegate voting power by increasing your own voting power and decreasing your delegatee’s voting power:

```solidity
function undelegate() external onlyMember {
  address oldDelegatee = delegating[msg.sender];
  votingPower[oldDelegatee] --;
  votingPower[msg.sender] ++;
  delegating[msg.sender] = address(0);
}
```

As for the 2nd part, it's correct that transitive voting makes concentration of power a more pronounced potential problem than with non-transitive voting. However, there is another glaring problem which is that keeping track of such delegation requires a directed acyclic graph, which is computationally expensive and may result in transactions running out of gas.

Consider the following example:

A delegates to B
B delegates to C
C delegates to A

This chain of delegations results in a cycle in the delegation graph, causing the voting system to be unable to determine the number of votes to give A, B or C.

We could ensure that the graph remains acyclic upon each delegation (using an algorithm such as topological sorting), but common implementations of this algorithm are typically done in linear time.

If the delegation chain gets too long, this could result in our transaction running out of gas!

# Issues

## **[L-1]** `buyNFTFromMarketplace` does not handle unsuccessful `buy` calls (1 point)

`marketplace.buy()` returns a `bool success` indicating whether the purchase was successful. Your `buyNFTFromMarketplace` is not taking the return of this function into account. This will cause an unsuccessful NFT purchase to be registered as executed proposal.

Consider checking if the external call was success:

```solidity
bool success = marketplace.buy{value: currentPrice}(
    nftContract,
    nftId
);
require(success, "NFT_BUY_FAILED");
```

## **[Q-1]** Unused variable `Proposal.startTime`

Unused variable `startTime` in `Proposal` struct unnecessarily wastes gas when creating a proposal. Consider removing it if not used.

## **[Q-2]** Low number of "runs" in hardhat.config.ts optimizer config

You set "runs" to be only `200`, which implies you think this contract's functions will be called around 200 times.

If you increase it to `100_000` (I think a more reasonable number), then this shaved off several hundreds of gas, at the cost of increasing deployment by about 300_000 gas. Since you're only going to deploy 1 of these DAO's, that seems like a worthwhile tradeoff (especially when you can choose to deploy at a period of low congestion, but your users do not always have that luxury).

## **[Q-3]** Incomplete NatSpec documentation

Kudos for providing rather detailed and helpful NatSpec documentation! However, in some places it's lacking. For example, `propose()` returns 3 values `uint256`, `address` and `uint256`, yet they are not documented.

## **[Q-4]** Overlapping branch conditions in `state` function:

In lines 193-200 of Dao.sol, you have:

```solidity
} else if (
    proposal.forVotes <= proposal.againstVotes &&
    passQuorum(proposalId) &&
    block.timestamp >= proposal.endTime
) {
    return ProposalState.Defeated;
} else if (block.timestamp <= proposal.endTime) {
    return ProposalState.Active;
```

This is correct, however it's a code smell to have different branch conditions of your function overlap. In this case in the first `else if` you have:

`block.timestamp >= proposal.endTime`

and in the second `else if` you have

`block.timestamp <= proposal.endTime`

which will both be true when

`block.timestamp == proposal.endTime`

Consider changing the second one to be:

`block.timestamp < proposal.endTime`

so that the conditions are distinct.

Note: this is a trivial non-important problem in this case; but there have been hacks where the difference between `>=` and `>` was 80 million dollars of lost funds! See the Compound governance bug: https://rekt.news/overcompensated/ and Ctrl + F for `>=`

# Nitpicks

## **[N-1]** Combine arity checking into one statement

In Dao.sol on line 141, we have the following check:

```solidity
if (targets.length != values.length)
    revert ProposalFuncInformationMisMatch();
if (targets.length != calldatas.length)
    revert ProposalFuncInformationMisMatch();
```

Consider combining these into one statement that does the same check but is easier to read:

```solidity
if (targets.length != values.length || targets.length != calldatas.length)
    revert ProposalFuncInformationMisMatch();
```

Same applies to arity checking of function parameters in `castBulkVotesBySignature()`.

## **[N-2]** Redundant check for `proposalId` in `execute`

In Dao.sol on line 365, we have the following check:

```solidity
if (proposalExecuteId != proposalId) {
  revert InvalidProposalId();
}
```

And in the following line we check if the proposal is successful, and thus valid for execution:

```solidity
if (state(proposalId) != ProposalState.Succeeded) {
  ...
}
```

I'd consider removing the first check comparing `proposalExecuteId` to `proposalId` since it's redundant given we already check proposal state in the following line. This makes `proposalId` function parameter unnecessary as well.

## **[N-3]** Redundant setting of function call value to 0 in `execute()`

In Dao.sol on line 381, we have the following line in `execute()`:

```solidity
values[i] = 0;
```

If I had to guess, it seems it was added as an extra prevention against reentrancy attacks. However, it does nothing to prevent it since it only updates the local `values` array. Thus, I'd consider it safe to remove this line saving a little gas.

# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | 1 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 1
