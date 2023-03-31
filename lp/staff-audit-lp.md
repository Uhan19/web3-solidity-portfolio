https://github.com/0xMacro/student.Uhan19/tree/f3652c3b69291fb915e22da79807e538dd64784a

Audited By: CheeChyuan Ang

# General Comments

Hi, very well done on the design exercise and very well done too on the assignment. I only see one low vulnerability issue. Tests are very thorough as well.

# Design Exercise

1. Very thorough answer and I agree to the risks that you mentioned especially on impermanent loss and protocol risk as we often see that after the staking period is over, stakers will rush to exit and dump the token. Also I would add that by staking your LP, you are basically trusting the protocol of all your funds. Careless users will be rug pulled by dishonest protocols

2. A cool simple staking contract that rewards users with a constant return (ie. regardless of how large the LP is, the reward rate will always be x%). There is a more complicated contract that aims to reward Y amount of tokens per time period and the reward is shared by all the LP stakers in accordance to their percentage they staked in the pool. Checkout this [contract](https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol)

# Issues

## **[L-1]** Ability to drain more SPC than desired from the user

In SpaceRouter.sol line 66, you correctly check if the expected SPC to be added into the pool as liquidity is more than the desired SPC and the contract reverts if the expected SPC is greater than the desired SPC.

However when tax is enabled, the amount of SPC to be added to the pool as liquidity will now be greater than the expected. In a borderline case where `spcExpected == spc` and the condition passes, the tax will result in `spcToBeDeposited > spc`. Depending on the allowance the user has given to the router, this will result in either pulling more SPC than desired or in the transaction reverting.

## **[Q-1]** Storing value in `memory` instead of reading it from global state

In the swap function, `ethBalance` and `spcBalance` are read from storage multiple times. It would be cheaper if we stored the value in a memory and continued reading from the memory for gas efficiency.

Similarly in `addLiquidity`, `spaceLP.spcBalance()` is called multiple times and user can benefit from having this read once from global and store in memory and reading from memory afterwards.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 1     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 1

Great work!
