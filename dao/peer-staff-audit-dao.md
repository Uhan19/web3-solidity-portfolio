**This is the staff audit for the code you performed a peer audit on. We give you this so you can compare your peer audit against a staff audit for the same project.**

https://github.com/0xMacro/student.danyalprout/tree/252d9622db07d8188d4db616f59f05151cfdf794

Audited By: CheeChyuan Ang

# General Comments

Hello! I always enjoy reading your contract. Your code is very neat and your tests are very complete. Good job too on your design exercise. I don't see any serious issues with your code, just some code quality issues which I have highlighted below!

# Design Exercise

1. Good answer
However,
I noticed that the delegatee does not have its voting power included

```solidity
    uint256 totalVotes = delegatedVotingPowerCount[sender];
    // Only count sender's voting power if they are not delegating
    if (delegatedVotingPowerTo[sender] == address(0)) {
        totalVotes += votingPower[sender];
    }
```

2. Yup thats right. The larger problem will be that is is an expensive process and have a risk of the transaction running out of gas


# Issues

## **[Q-1]** Storing ` _signedVotes.length` in memory before for loop saves gas

In line 282, instead of: 

```solidity
for (uint256 i = 0; i < _signedVotes.length; ++i) {
```

You can instead write: 

```solidity
uint256 length = _signedVotes.length;
for (uint256 i = 0; i < length; ++i) {
```

## **[Q-2]** Remove `import "forge-std/console.sol"`
In Eip712.sol line4, remove `import "forge-std/console.sol"`


## **[Q-3]** Use `== 0` for unsigned integer
Line 163 `if (votingPower[msg.sender] <= 0)` can be rewritten as `if (votingPower[msg.sender] == 0)`.

Since votingPower is an unsigned integer, it cannot be a negative number.

# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 0
