https://github.com/0xMacro/student.Uhan19/tree/1900cc2988efd24ecd64028aa6f08f30fda105ab/ico

Audited By: Leoni Mella (MrLeoni)

# General Comments

Hey Yuehan! 👋

Nice job completing your ICO project! I found your project and code very concise and easy to understand. More specifically, I enjoy the way you organize the logic of your `contribute` function!

The majority of the topics in this audit are code quality, but nonetheless I found one low level issue.

Keep up the great work! 🚀

# Design Exercise

Good answer of the design exercise, you are definitely on the right track!

It's also nice to think more deeply about the `vestingStartTime`.

Imagine that a user makes more than one contribution in the same phase or in different phases, how would you consider this variable then? How about defining the vesting time when the Phase.Open is achieved? This would simplify things since all the contributors would have the same vesting start time.

# Issues

## **[L-1]** Dangerous phase transitions (1 point)

If the `advanceICOPhase` function is called twice, a phase can accidentally be skipped. There are a few situations where this might occur:

1. Front-end client code malfunction calling the function twice.
2. Human error double-clicking a button on the interface on accident.
3. Repeat invocations with intent - Uncertainty around whether or not a transaction went through, or having a delay before a transaction processes, are common occurrences on Ethereum today.

Phase transitions are especially problematic, because once the ICO has advanced to the next phase there is no going back. Compare this to the toggle tax functionality, where it is easy for the owner to fix.

Consider refactoring this function by adding an input parameter that specifies either the expected current phase, or the expected phase to transition to.

## **[Q-1]** Variables should be marked as `constants`

On your `SpaceCoin.sol` and `Ico.sol` contracts they declare the following state variables:

```solidity
// SpaceCoin
uint256 public immutable MAX_TOTAL_SUPPLY = 500_000;
uint256 public immutable INITIAL_SUPPLY = 150_000;
uint256 public immutable TAX_RATE = 2;

// Ico
uint256 public immutable TOKEN_REDEEM_RATIO = 5;
```

Since they are initialized with a default value, you can change them to `constants` instead of `immutable`:

```solidity
// SpaceCoin
uint256 public constant MAX_TOTAL_SUPPLY = 500_000;
uint256 public constant INITIAL_SUPPLY = 150_000;
uint256 public constant TAX_RATE = 2;

// Ico
uint256 public constant TOKEN_REDEEM_RATIO = 5;
```

`immutable` is used only when the variable must be initialized by the `constructor`, which is not the case for the ones above.

Consider changing it to `constants` instead of `immutable` in such cases.

## **[Q-2]** Unnecessary math in `redeemSPC` method

At your `redeemSPC` function you are subtracting the `contributionAmount` from the `contributions` mapping, at line 116, but since all the eligible SPC tokens will be transferred at once, you could just set it to zero:

```solidity
uint256 contributionAmount = contributions[msg.sender];
contributions[msg.sender] = 0;
```

This makes your code easier to understand and save a bit of gas since no math operations are required.

## **[Q-3]** Wrong access modifier in `redeemSPC` and `contribute` functions

Both functions are declared using the `public` modifier, but they are not used by any other method inside the contract. The `external` modifier is more suitable when you have a function that is only called outside of your contract.

## **[Q-4]** Events lacking parameter names

In both `Ico.sol` and `SpaceCoin.sol` you declared some events with only the type of the parameter:

```solidity
event PauseToggled(bool);
event ContributionMade(address, uint256);
event TokenRedeemed(address, uint256);
```

Although you can do this, it is considered a best practice to name them so other developers or possible users that integrate with your contract know exactly what to expect from those fields:

```solidity
event PauseToggled(bool pause);
event ContributionMade(address indexed contributor, uint256 amount);
event TokenRedeemed(address indexed contributor, uint256 amount);
```

Consider adding names to events parameters always!

## **[Q-5]** No use of indexed parameters in events
Indexing parameters in events are a great way to keep track of specific outputs from events, allowing the creation of topics to sort and track data from them. For example:

``` solidity
event TokenRedeemed(address indexed contributor, uint256 value);
```

Using `address indexed contributor` in the event above will allow dapps to track the specific TokenRedeemed events of an address with ease.

## **[Q-6]** Prefer Custom Errors over `require`

In your project you use the word `require` to check user input and contract state which reverts if the expression is false. The modern-Solidity way to do this is with custom errors, which are preferable because:
1) they allow you to include dynamic values (i.e. local variables) in the error
2) they are slightly more gas efficient

This is an excellent blog post by the Solidity team about custom errors if you are interested: https://blog.soliditylang.org/2021/04/21/custom-errors/

# Nitpicks

## **[N-1]** Redundant event in `_transfer` method at SpaceCoin

In your override `_transfer` function you're adding a new event: `TokenTransferred`, but the ERC20 implementation will also trigger a `Transfer` event for the same function.

It would be better to have just the default `Transfer` event rather than two different events for the same function.

## **[N-2]** Token decimals are directly declared

At `SpaceCoin.sol` contract, on the `constructor` method you are `_mint` the initials supplies using `10 ** 18`. Nothing technically wrong with that.

Generally I would prefer to use the already define function `decimals` at ERC20 contract from OZ:

```solidity
_mint(_treasury, (MAX_TOTAL_SUPPLY - INITIAL_SUPPLY) * decimals());
_mint(_ico, INITIAL_SUPPLY * decimals());
```

Making it a bit easier to read.

## **[N-3]** Large numbers formatting

When you check for big ETH values in your `Ico.sol` contract you can use the `_` separator to make it easier to read large numbers.

Instead of:
```solidity
totalContributions + msg.value <= 30000 ether
```

You can do:
```solidity
totalContributions + msg.value <= 30_000 ether
```

Making it easier to read the correct amount.


# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | 0     |
| Unfinished features        | 0     |
| Extra features             | 0     |
| Vulnerability              | 1     |
| Unanswered design exercise | 0     |
| Insufficient tests         | 0     |
| Technical mistake          | 0     |

Total: 1

Great Job!
