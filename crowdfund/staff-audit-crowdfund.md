https://github.com/0xMacro/student.Uhan19/tree/28ae4624dc60df1ce0a1b2a115977d26aae1b0e0/crowdfund

Audited By: Benedict Lee

# General Comments

Great job on your first project! You have successfully applied the concepts learned in class, including (i) implementing the Check-Effect-Interaction pattern to prevent re-entrancy vulnerabilities and (ii) demonstrating a good understanding of the ERC721 standard by using `_safeMint()`.

# Design Exercise

Excellent work in providing a detailed explanation and pseudo-code for implementing this feature. The additional `contributorTiers` mapping would be useful in tracking the tier of each NFT. However, it is important to note that the size of the `Tiers` mapping grows linearly with the number of NFTs minted, which can result in expensive storage writes.

To address this concern, we can explore alternative solutions such as:
i) Off-chain storage - An alternative approach is to use ERC721 metadata to store additional off-chain data related to each specific NFT. This can be done with no transaction fees.
ii) ERC-1155 - This token standard combines both ERC-20 (fungible token) and ERC-721 (non-fungible token), which could potentially provide more flexibility in tracking NFT tiers.

# Issues

## **[M-1]** Contributors can exploit NFT awards to get more than deserved (2 points)

A contributor should be awarded an NFT for each 1 ETH contributed to a project.

When you calculate the number of NFTs to award, you're basing it on a contributor's total contributions to date and the number of NFTs they currently own (i.e. you're using `(balanceOf(msg.sender))) / 1`). 

Edge cases where this can be manipulated: 
1. A contributor buys NFTs from someone else
2. A contributor sells previously awarded NFTs or transfers them away 

This exposes an exploit whereby a contributor can continually transfer NFTs to an associate or to another account they own, while getting replacement NFTs in exchange for minimal subsequent contributions.

Consider checking deserved NFTs against past NFTs awarded instead of NFTs currently owned.

## **[Technical Mistake-1]** _reentrant() does not actually revert if a reentrant call is made (1 point)

In line 56 of Project.sol, you have a `_reentrant()` modifier. However this modifier does not do what it's supposed to do, because it will not revert if an attacker tries to reenter into the `_reentrant`-protected function.

You are missing a check for if `isBalanceLocked == true`, and if so, reverting. Something like:

https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/security/ReentrancyGuard.sol#L58

Thankfully, none of your `_reentrant`-protected functions are vulnerabe to reentrancy attacks because you followed the checks-effects-interactions pattern, but this is still an issue you need to prevent in all future smart contracts you write.

## **[Extra Feature-1]** `receive()` function not needed (1 point)

Your contract includes a `receive()` function is not needed. Its presence means that anyone mistakenly sending ETH to the factory will lose it. If this function was not implemented then such a transaction would be reverted, similar to the revert you've coded here.

Consider removing your `receive()` function from you contract code.

## **[Missing-Feature]** Code coverage report is missing in the README (1 point)

Each project requires proof that you generated a coverage report, and included the output in your README.md

See the **Solidity Code Coverage** section of the Testing resources here: https://learn.0xmacro.com/training/project-crowdfund/p/4

## **[Q-1]** Consider adding indexed parameters in events

Events with indexed parameters are a great way to keep track of specific outputs from events. Which allow the creation of topics to sort and track data from them.

Suggestion for line 59 and 68, in Project.sol:

```solidity
event NewContribution(address indexed _sender, uint256 amount);
event RefundSent(address indexed _sender, uint256 amount);
```

Using `address indexed _sender` in the events above will allow dapps to track the specific `NewContribution` and `RefundSent` events of an address with ease.

## **[Q-2]** Add Natspec comments for your public contracts, storage variables, events, and functions

Solidity contracts can use a special form of comments to provide rich documentation for functions, return variables, and more. This special form is named the Ethereum Natural Language Specification Format (NatSpec).

Solidity contracts are recommended to be fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others to audit and make your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.

## **[Q-3]** Unnecessary zero-address check in `constructor`

The `require` statement on Project.sol line 30 used to be a standard practice, though now is largely deemed no longer necessary or valuable:

```solidity
        require(sender != address(0));
```

There are innumerable invalid addresses (e.g. `address(1)`, `address(2)`, etc) which are impossible to comprehensively exclude.

This check used to be useful before an old version of the Solidity compiler started adding in checks to make sure the proper calldata length was provided. This protects against the case where a untyped language such as Javascript builds a transaction but casts an empty address argument to the 0 address (rather than throwing an error and preventing the transaction from ever being created)

## **[Q-4]** Unchanged variables should be marked constant or immutable

`owner`, `fundingGoal`, and `deadline` on line 11-13 of Project.sol:

```solidity
address public owner;
uint256 public fundingGoal;
uint256 public deadline;
```

Your contract includes storage variables that are not updated by any functions and do not change. For these cases, you can save gas and improve readability by marking these variables as either `constant` or `immutable`.

What's the difference? In both cases, the variables cannot be modified after the contract has been constructed. For `constant` variables, the value has to be fixed at compile-time, while for `immutable`, it can still be assigned at construction time.

Compared to regular state variables, the gas costs of `constant` and `immutable` variables are much lower. For a `constant` variable, the expression assigned to it is copied to all the places it is accessed and re-evaluated each time. This allows for local optimizations. `immutable` variables are evaluated once at construction time, and their value is copied to all the places in the code where they are accessed. For these values, 32 bytes are reserved, even if they would fit in fewer bytes. Due to this, `constant` values can sometimes be cheaper than `immutable` values.

Consider marking unchanged storage variables as either `constant` or `immutable`.

## **[Q-5]** Leaving hardhat/console.sol in production project

Your contract imports hardhat/console.sol, which is a development package.

Consider removing hardhat/console.sol from your production code.

## **[Q-6]** Unnecesary setting of storage variables

On Line 28 and 29 of `Project.sol` you set `isBalanceLocked` and `isCanceled` to `false`.

Every variable type has a default value it gets set to upon declaration. Unnecessarily setting a variable.

For example:

```solidity
bool isBalanceLocked;     // will be initialized to false
```

Consider not setting values for storage variables that would otherwise be equal to their default values.

# Nitpicks

## **[N-1]** Unchanged variables/constant naming should be in capital casing

The `minContributionAllowed` on line 19 of Project.sol:

```solidity
uint256 public constant minContributionAllowed = 0.01 ether;
```

It is an industry standard to have constant variable all capital casing.

```solidity
uint256 public constant MIN_CONTRIBUTION_ALLOWED = 0.01 ether;
```

## **[N-2]** All projects has the same name and symbol

While having all created projects share the same `name` and `symbol` may not be considered a vulnerability, it would be beneficial to provide creators with the flexibility to name their projects and symbols. It is recommended to include this as part of the constructor.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | 1     |
| Extra features             | 1     |
| Vulnerability              | 2     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 1     |

Total: 5
