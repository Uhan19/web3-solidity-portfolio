**This is the staff audit for the code you performed a peer audit on. We give you this so you can compare your peer audit against a staff audit for the same project.**

https://github.com/0xMacro/student.zzzuhaibmohd/tree/808f96b74c732c6a74b67dfabc92144023240ca9/crowdfund

Audited By: Benedict Lee

# General Comments

Good effort on your first project! You have demonstrating a good understanding of the ERC721 standard by using `_safeMint()`. However please keep in mind on implementing the Check-Effect-Interaction pattern to prevent re-entrancy vulnerabilities.

1 high, 1 low and 1 technical mistake were found. There is also room for improvement in terms of code quality such as Natspec, remove unused variable and comments, etc.

# Design Exercise

Yes, off-chain storage is an solution to store additional off-chain data related to each specific NFT. Please include more details and pseudo-code. Also consider other alternative solutions to compare the pros and cons.

Other alternative to consider:
i) Additional Mapping - An alternative approach is to create a mapping that keeps track of the tier of each NFT.

```Solidity
enum NFTLevel { BRONZE, SILVER, GOLD }
mapping (uint256 -> NFTLevel) nftTiers; // NFT ID => Level of NFT
```

ii) ERC-1155 - This token standard combines both ERC-20 (fungible token) and ERC-721 (non-fungible token), which could potentially provide more flexibility in tracking NFT tiers.

Please check out the Staff Solution so you can see the sort of detail we are expecting in these Design Exercise answers: https://learn.0xmacro.com/training/project-crowdfund/p/2

# Issues

## **[H-1]** Attacker can drain all project (3 points)

In your `unpledge()` function, `project_contributors[msg.sender]` is updated after external calls are made.

A malicious contract can re-call `unpledge()` multiple times in the same transaction before full resolution to withdraw more than their balance.

Consider updating contract state (setting project_contributors[msg.sender] to 0) before sending funds externally. This is called the "checks-effects-interactions" pattern, which you can read about here: https://docs.soliditylang.org/en/latest/security-considerations.html#use-the-checks-effects-interactions-pattern.

Another, simpler (though more gas costly) way of protecting against this is to use a reentrancyguard on all of your state-mutating functions. See the OZ docs for a explainer of how to use it. You can implement your own for use during the Fellowship very easily. https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard

## **[L-1]** Use of transfer for sending ETH instead of call (1 point)

On line 79, 99, and 107 in Project.sol, you are using `transfer()` function to send ETH. Although this will work it is no longer the recommended approach. `Transfer()` limits the gas sent with the transfer call and has the potential to fail due to rising gas costs. `call()` is currently the best practice way to send ETH.

For a full breakdown of why, check out [this resource](https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/)

For example: instead of using

```solidity
payable(msg.sender).transfer(amount_to_withdraw);
```

The alternative, admittedly somewhat clumsy looking, recommendation is:

```solidity
(bool success,) = msg.sender.call{value:amount_to_withdraw}("");
require(success, "transfer failed")
```

Consider replacing your `transfer()` functions with `call()` to send ETH.

## **[Extra Feature-1]** `fallback()` function not needed (1 point)

Your contract includes a `fallback()` function is not needed. Its presence means that anyone mistakenly sending ETH to the factory will lose it. If this function was not implemented then such a transaction would be reverted, similar to the revert you've coded here.

Consider removing your `fallback()` function from you contract code.

## **[Q-1]** Add Natspec comments for your public contracts, storage variables, events, and functions

Solidity contracts can use a special form of comments to provide rich documentation for functions, return variables, and more. This special form is named the Ethereum Natural Language Specification Format (NatSpec).

Solidity contracts are recommended to be fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others to audit and make your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.

## **[Q-2]** Unused storage variables

1. In ProjectFactory.sol, you declare `project_deadline`. However, it is never accessed or updated anywhere in your contract code.

Consider removing `project_deadline` from your contract.

2. `project_id` in both Project.sol and ProjectFactory.sol does not serve any purpose here. This will add more complexity and cost more gas for storage and execution. Suggestion to remove any reference of `project_id`.

## **[Q-3]** Unchanged variables should be marked constant or immutable

`project_deadline` on line 17 of Project.sol:

```solidity
uint256 public project_deadline = block.timestamp + 30 days;
```

Your contract includes storage variables that are not updated by any functions and do not change. For these cases, you can save gas and improve readability by marking these variables as either `constant` or `immutable`.

What's the difference? In both cases, the variables cannot be modified after the contract has been constructed. For `constant` variables, the value has to be fixed at compile-time, while for `immutable`, it can still be assigned at construction time.

Compared to regular state variables, the gas costs of `constant` and `immutable` variables are much lower. For a `constant` variable, the expression assigned to it is copied to all the places it is accessed and re-evaluated each time. This allows for local optimizations. `immutable` variables are evaluated once at construction time, and their value is copied to all the places in the code where they are accessed. For these values, 32 bytes are reserved, even if they would fit in fewer bytes. Due to this, `constant` values can sometimes be cheaper than `immutable` values.

Consider marking unchanged storage variables as either `constant` or `immutable`.

## **[Q-4]** Code duplication and increase complexity on unpledged

Line 99-101 and line 107-109 in Project.sol are exactly the same.

```Solidity
payable(msg.sender).transfer(project_contributors[msg.sender]);
emit unpledged(msg.sender, project_contributors[msg.sender]);
project_contributors[msg.sender] = 0;
```

Consider removing those if condition and use `require()` check to revert on undesirable condition.

For example:

```Solidity
require(project_contributors[msg.sender] > 0, "Not a contributor");
require(project_cancelled == true || block.timestamp > project_deadline, "Project not failed");
```

## **[Q-5]** Unnecesary setting of storage variables

On Line 26 and 27 of `Project.sol` you set `project_cancelled` and `project_goal_reached` to `false`. And `uint256 tokenCounter = 0`

Every variable type has a default value it gets set to upon declaration. Unnecessarily setting a variable.

For example:

```solidity
uint256 tokenCounter;       // will be initialized to 0
bool project_cancelled;     // will be initialized to false
```

Consider not setting values for storage variables that would otherwise be equal to their default values.

## **[Q-6]** Clean up commented code

On line 72 and 121 in Project.sol, there are commented code that are not cleaned up. Since we are expecting production level of code, it is a mistake to left those in.

# Nitpicks

## **[N-1]** Unchanged variables/constant naming should be in capital casing

The `min_contribution_amount` on line 16 of Project.sol:

```solidity
uint256 public constant min_contribution_amount = 0.01 ether;
```

It is an industry standard to have constant variable all capital casing.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | 1     |
| Vulnerability              | 4     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 0     |

Total: 5
