**This is the staff audit for the code you performed a peer audit on. We give you this so you can compare your peer audit against a staff audit for the same project.**

https://github.com/0xMacro/student.modelB/tree/b86767201df5b0a4e44703090b8e816c3e93f7c1/ico

Audited By: Benedict Lee

# General Comments

Great job. The amount of work put into the design exercise is incredible, it is thorough with explaination on the choice you made. Your code is clean and has a vast amount of comments associated with it. Keep up the good work!

# Design Exercise

Great response! Thank you for providing such a details solution, it is concise and clear on the implementation. For your vesting start time you have choose timestamping the contribution time which does require extra data storage. Another simpler solution (lower chance of security vulnerbility) would be to start the vesting when ICO enters its OPEN phase.

Additional resources:

i) [Open Zeppelin VestingWallet](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/finance/VestingWallet.sol) - Very simple but well audited vesting contract.

ii) [Sablier ("Money Streaming")](https://github.com/sablierhq/sablier/blob/develop/packages/protocol/contracts/Sablier.sol) - Sablier protocol is another solution that handles vesting for ERC-20 with unlimited amount of vesting schedules.

# Issues

## **[H-1]** SpaceCoins can be stolen (3 points)

`transferFrom()` is overridden from the inherited ERC20 contract in your SpaceCoin contract. However the check to see if the amount was approved by the from address is not included in your `transferFrom()` function. This code is missing: `super._spendAllowance(from, spender, amount);`.

As a result, an address can call `transferFrom()` and transfer SpaceCoins from anyone including the treasury into their own address.

Consider overriding the `ERC20._transfer` function to implement your tax functionality. Then, at the end of your overriden `_transfer`, use `super._transfer` to execute the parent contract's transfer functionality.

## **[Q-1]** Transfer overrides could be combined

Rather than individually overriding the OZ `transfer` and `transferFrom` functions to collect tax, you could just override `_transfer` which they both call.

## **[Q-2]** Unnecessary initialization of storage variables

This is not needed (and wastes gas) because every variable type has a default value it gets set to upon
declaration.

For example:

```
address a;  // will be initialized to the 0 address (address(0))
uint256 b;  // will be initialized to 0
bool c;     // will be initialized to false
```

```
// Line 39  in `ICO.sol`
Phase public phase = Phase.Seed;     // Phase.Seed equates to 0, which the phase would default to anyways
```

# Nitpicks

## **[N-1]** Use `1 ether` instead of `10 ** decimals()`

A value like `1 ether` is common and familiar enough that you may as well just use it directly.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 3     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 3
