# Sudoku

Audit by: Yuehan Duan

## High Severity Issues

## **[H-1]** `claimReward` functions lacks a `solved` check

The function only checks whether the solution is correct and not whether the puzzle has already been solved. This means that users could just submit the solution to the `claimReward` function repeatedly to drain the contract. This can be done because when the tokens are transferred in they are sent to `address(this)`. There is no contract mapping/account for the funds that are associated with each puzzle and the reward that they are allowed to claim.

suggestions: Implement a check for the `challengeReward.solved`

```
    if (challengeReward.solved) revert PuzzleAlreadySolved();
```

also we want to but this check as early in the function logic as possible to be gas efficient.

## **[H-2]** `claimReward` is not sending the tokens to the right recipient

In the function the transfer logic is as follows:

```
    challengeReward.token.transfer(address(this), challengeReward.reward)
```

This is incorrect, as it is sending the token back to the contract itself. Instead it should be sending the token to the msg.sender (the solver of the puzzle):

```
    challengeReward.token.transfer(msg.sender, challengeReward.reward)
```

## **[H-3]** Reentrancy detected in the `claimReward` function

The function does not have a reentrancy guard nor does it follow the `check-effect-interaction` pattern. Related to the lack of `solved` check in the function, but even if the check is implemented in the contract, a reentrancy guard should still be implemented. Otherwise, we can follow the `check-effect-interation` and flip the order of the token transfer and setting the puzzle to solved.

current code:

```
    challengeReward.token.transfer(address(this), challengeReward.reward);
    challengeReward.solved = true;
```

check-effect-interaction:

```
    challengeReward.solved = true;
    challengeReward.token.transfer(address(this), challengeReward.reward);
```

keep in mind, the above example is focused on teh `check-effec-interaction` pattern, the wrong recipient issue is covered in `H-2`

## **[H-4]** Incorrect state variable update `claimReward`

In the function the `challengeReward` struct is being set to memory, that means when we update the solved status of the puzzle: `challengeReward.solved = true` we are updating the solved property in memory. This is insufficient as the change will not persist to storage. That means the contract funds can be drained when users calls `claimReward` repeatedly. Instead, we should set the `challengeReward` struct to storage like this:

```
    ChallengeReward storage challengeReward = rewardChallenges[address(challenge)]
```

## Medium Severity Issues

## **[M-1]** Centralization of funds

The current architecture of the contract stores all of the funds sent in the contract itself and relies on the `rewardChallenges` mapping to keep track of the funds associted with each puzzle. This is a risky design as it creates a single point of failure and increases the attack vector. As can be seen above, even though the amount sent is based on the `challengeReward.reward`, the funds are still be drained. We could set the `challengeReward.reward` back to 0 as the funds are sent as an additional safe guard, but I think a better approach is to create an internal mapping to keep track of the funds associated with each puzzle.

Recommendation:

```
    mapping(address => uint256) rewards;

    function createReward(ChallengeReward memory challengeReward) publick {
        ...
        rewards[address(challengeReward.token)] = challengeReward.reward;
        ...
    }

    function claimReward(SudokuChallenge challenge, uint8[81] calldata solution) public {
        ...
        rewards[address(challengeReward.token)] = 0;
        ...
    }
```

This approach will reduce the centralization of funds and reduce vulnerabilities.

## **[M-2]** Contract functions does not check for 0 rewards

In the current implementation, the `createReward` function does not check that the `challengeReward.reward` is non-zero. From a UX perspective, this should not be a possibility. The incentive of solving the puzzle includes a financial component, so there should be a minimum reward requirement if someone wants to create an reward. There should be a check for minimum reward amount in the function.

```
    uint256 public constant MIN_REWARD = 0.1 ether

    if (challengeReward.reward < MIN_REWARD) revert MinRewardAmountNotMet()
```

## Low Severity Issues

## **[L-1]** Missing visibility modifier on the `rewardChallenges` mapping

There is no visibility modifier being defined in the `rewardChallenges` mapping.

```
    mapping(address => ChallengeReward) rewardChallenges
```

That means by default the solidity will the the visibility to `internal`, this could be problematic if we want to access this mapping outside of the contract.

Recommendation:

```
    mapping(address => ChallengeReward) public rewardChallenges
```

## Gas Optimizations

## **[G-1]** Hardhat config optimization

In the `hardhat.config.js` file we can include the following code to add optimization:

```
    settings: {
        viaIR: true,
        optimizer: {
            enabled: true,
            runs: 1000000,
        },
    },
```

The number of runs can be increased or decreased as we see fit. We can set it as high as possible until the gas savings from teh relevant functions are no longer decreasing. The runs can be a projection of the number of times that we think the functions will be called by the end user. The higher the number, the greater the cost of the deployment, but it will save the end user gas costs. Therefore, we should keep that in mind and find the right balance.

with the above settings these are the gas cost savings:

```
UNOPTIMIZED
deployment
·············································|··············|·············|·············|···············|··············
|  SudokuChallenge                           ·           -  ·          -  ·     319199  ·        1.1 %  ·          -  │
·············································|··············|·············|·············|···············|··············
|  SudokuExchange                            ·           -  ·          -  ·     670966  ·        2.2 %  ·          -  │

function call
|  SudokuExchange           ·  createReward  ·           -  ·          -  ·     132360  ·            1


OPTIMIZED
deployment
·············································|·············|·············|·················|···············|··············
|  SudokuChallenge                           ·          -  ·          -  ·         248175  ·        0.8 %  ·          -  │
·············································|·············|·············|·················|···············|··············
|  SudokuExchange                            ·          -  ·          -  ·         394175  ·        1.3 %  ·          -  │

function call
|  SudokuExchangeOptimized  ·  createReward  ·          -  ·          -  ·         129321  ·

```

It can be seen from both the function call and the deployment standpoint the gas costs have gone down.

## **[G-2]** Unecessary require check for `0x00` address in `claimRewards`

This check is unecessary since if the user were to try to call `createReward` with a `0x00` token address, the function call will fail. If we remove this unecessary check we can save `207` gas.

## **[G-3]** Function visibility modifiers in `SudokuChallenge` and `SudokuExchange`

The three functions: `createReward, claimReward, validate` all have the `public` visibility modifier, but the functions are not being called within their respective contracts. We can change the modifier to `external` to save on gas costs.

## Code Quality Issues

## **[Q-1]** constructor visibility is ignored

in `SudokuChallenge.sol` the constructor has a visibility modifier `public`, this is not needed as the constructor visibility is ignored. Constructors are only run once during deployment, they cannot be called afterwards, therefore defining a visibility modifier is not needed

## **[Q-2]** remove hardhat console import

in `SudokuChallenge.sol` and `SudokuExchange.sol` there is an import of hardhat/console.sol, this should be removed before deploying the app.

## **[Q-3]** remove unecessary constructor in `SudokuExchange.sol`

There is no code in the constructor, the contract can be turned into an `abstract contract` by removing the constructor.

## **[Q-4]** missing event emissions

For better off-chain compaptibility and functionality, we should emit events when crucial functions are called. For example the `createReward` and `claimReward` functions.

examples:

```
    event RewardsCreated()
    event RewardsClaimed()
```

parameters can be added to the events as necessary.
