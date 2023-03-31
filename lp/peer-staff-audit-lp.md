**This is the staff audit for the code you performed a peer audit on. We give you this so you can compare your peer audit against a staff audit for the same project.**

https://github.com/0xMacro/student.EmanHerawy/tree/e32f539c12919bcecaf89a6e61260b5d412d9199/lp

Audited By: Leoni Mella (MrLeoni)

# General Comments

Hi Eman! 👋

Great job completing your LP Project! In your Pool contract, you did not correctly implement the constant product formula for swaps, meaning that your pool could easily become very one-sided. I also found one small detail in your Router contract that I explained below. One thing that was hard to understand though was your test and deployments scripts since they are in a different place than usual.

# Design Exercise

Good work answering the Design Exercise, your answer detailed both benefits and downsides. Also good job with the pseudo code illustrating how you would implement such feature!

# Issues

## Insufficient Tests (1 point)

The project's tests aren't enough to cover all requirements for this project and the main subject for your tests were the spc tax and they are basically duplicated in the two scenarios.

## **[Technical-Mistake-1]** Swap math is incorrect (2 points)

The math in your Pool's `swap` function is incorrect. In particular, you aren't using the constant product formula properly. 

Let's take an example - suppose `isETHtoSPC = true`, `newReserve = 40`, `reserve0_ = 20`, and `reserve1_ = 100`. Note that the input amount is equal the current ETH balance of the pool - this is a large trade.

On line 118, we have
```solidity
out = ((newReserve0 - reserve0_) * reserve1_) / reserve0_;
```

The result of this calculation will be `100`. After applying the fee on line 123, we would have `out = 99`. In other words, we would send almost the entire balance of SPC out, making the pool extremely uneven. If I increased `reserved1_` to `100 / (99 / 100) = 10000 / 99` the result would be entirely draining the pool of SPC.

The constant product formula serves as a way to penalize large trades. In this case, if we ignored the fee, a user who sends in ETH equal to the ETH balance of the pool should receive SPC equal to only _half_ the balance of the pool, if the formula is used properly. This is the effect of price impact. You did the output calculation using proportions instead of the constant product formula, and there is no effect of price impact in your output. Another thing to note is that you maintain a `kLast` variable that is never used in any calculations or checks, which hints that the constant product formula was not used.

## **[Technical-Mistake-2]** `claimRefund` function allows initiating refund for another user (1 point)

In your `claimRefund` function, you take in an `address to` argument and then send any refund owed to that address. This has the disadvantage that someone can initiate a refund for someone else, even if that other user doesn't want to receive the refund yet. For example, the recipient may want to hold off on getting their refund for tax reasons.

Consider removing the `to` argument and simply sending the refund for `msg.sender` in this function.

## **[Q-1]** Outdated Solidity Compiler version

The contracts are using the `0.8.9` Solidity version, but the most recent is `0.8.19`. Consider updating the language version on the contracts.

## **[Q-2]** Empty `revert()` call in `withdraw` function

You call the `revert()` function when an eth transfer fails in the `withdraw` function on the ICO contract. Consider adding a custom error to help users to understand the reason for a reverted transaction.

## **[Q-3]** Router should be stateless

In your `addLiquidity` function, in cases where the user has provided more ETH than needed, you keep track of the owed refund in the `userRefunds` mapping. Then you have a `claimRefund` function which can be used by the user to get their refund. In general, we have advocated for using a "pull" pattern over a "push", and it's good to see you had that in mind with your implementation. However, in the context of the Router/Pool relationship, it's best for the Router to be fully stateless. This way the protocol can seamlessly upgrade to a new Router without needing to migrate state from the old Router.

Consider sending the refund in the `addLiquidity` call itself.

# Nitpicks

## **[N-1]** Better name for reserve variables variables

You could use `spcReserves` and `ethReserves` instead of `reserve0` and `reserve1` so we it is more easy to read what they are through the contract.

I had to constantly check what were the correct reserves for each of the variables.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | 0     |
| Unfinished features        | 0     |
| Extra features             | 0     |
| Vulnerability              | 0     |
| Unanswered design exercise | 0     |
| Insufficient tests         | 1     |
| Technical mistake          | 3     |

Total: 4

Great Job!
