# SpaceLP.sol

# Issues

## **[L-1]** Minmum Liquidity Minted to `address(1)`
In `deposite` you mint the minimum liquidity to `address(1)`. I'm noty clear on this but i believe this should be `address(0)`. 
I wasn't able to find anything on `address(1)`. I checked it on etherscan and I could only find `IN` transactions which is a relieving. However, if I understannd this correctly, `address(1)` is a valid address and it's possible that someone could get or have access to it's private keys and move these LP tokens.

```solidity
_mint(address(1), MINIMUM_LIQUIDITY);
```

https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol#L121

## **[Q-1]** Redundant to pass `0` into `Zero...` error
It's redundant to pass `0` into these errors and opens more possibilities for bugs. Consider removing the `uint8 zero` parameter from these errors.

```solidity
error ZeroAmountToWithdraw(uint8 zero);
error ZeroTokenBalance(uint8 zero);
```

## **[Q-2]** Comment doesn't match code
You're comment refers to `unlocked` but your `lock` modifier uses `locked` variable.

## **[Q-3]** Consider doi
```solidity
uint256 liquidity =
    min((lpTokenSupply * spcDeposited) / spcBalance, (lpTokenSupply * ethDeposited) / ethBalance);
```

## **[Q-4]** Shared logic in `swap` and `getSwapPrice`
There appears to me a lot of shared logic between `swap` and `getSwapPrice`. Consider refactoring to reduce code duplication.


## **[NIT-1]** Misleading Error Name

Replace error `ReentrantDetected` with `ReentrancyDetected` to be more clear.

```solidity
/// @notice modifier to prevent reentrancy
/**
 * @dev if the contract the 'unlocked' bool is true, then that means a
 *       function is already being executed, and the modifier will revert.
 *       Once the function has finished executing, the 'unlocked' bool is set to false again.
 *
 */

modifier lock() {
    // q: ReentrancyDetected is a better name
    if (locked) revert ReentrantDetected();
    locked = true;
    _;
    locked = false;
}
```

## **[NIT-2]** totalSupply() maybe clearer
`uint256 lpTokenSupply = totalSupply();` is unnecessary. You can just use `totalSupply()` it clearer and more standard to the OpenZeppelin ERC20 contract.

## **[NIT-3]** Error `NotEnoughFundsProvided` should be `NoFundsProvided`.

## **[NIT-4]** Consider breaking into multiple lines for clarity
```solidity
uint256 liquidity =
    min((lpTokenSupply * spcDeposited) / spcBalance, (lpTokenSupply * ethDeposited) / ethBalance);
```

## **[NIT-5]** Unused variable
You initialize:
```solidity
uint256 lpTokenBalance = balanceOf(address(this));
```
and then you don't use it, here:
```solidity
_burn(address(this), balanceOf(address(this)));
```

# SpaceRouter.sol
## **[Q-5]** Clearer to check `msg.sender` balance delta directly
In your swap functions you are calculating expected prices with your `getSwapPrice` function. I don't know what is more gas efficent, but it seems clearer to me to just make the swap, and then compare the balance before and after the swap if balance after the swap is less than the expected amount, then revert

## **[NIT-5]** Varable nam doesn't match comment
Your comment refeers to an optimal amount of ETH but your variable is named `ethToBeDeposited`. Consider renaming the variable to `optimalETH` for clarity. 

```solidity
// calculate the optimal amount of ETH given the amount of SPC to be deposited
uint256 ethToBeDeposited =
    spaceLP.ethBalance() == 0 ? msg.value : (spaceLP.ethBalance() * spcAfterTax) / spaceLP.spcBalance();
```

## **[NIT-6]** Unneed variable declaration
```solidity
uint256 spcToBeDeposited = spcExpected;
```
