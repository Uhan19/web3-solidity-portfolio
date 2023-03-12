Audit of **uhan19**'s "ICO" project

- Auditor: [@rpedroni](https://github.com/rpedroni) <rpedroni@rpedroni.com.br>
- Date: 2023-03-10
- Comments: Great job, Yuehan! Awesome to see your web2 skills translating so well to web3. Hope you find my audit useful and let me know if you need any clarification, enjoy!

---

# Table of Contents

1. [SpaceCoin.sol](#Spacecoin.sol)
2. [ICO.sol](#ICO.sol)

---

# SpaceCoin.sol

## Severity: High

**N/A**

## Severity: Medium

**N/A**

## Severity: Low

### **[L-1]** Set `MAX_TOTAL_SUPPLY` and `INITIAL_SUPPLY` as `constant`
- Lines: 13, 14
- Description: `MAX_TOTAL_SUPPLY` and `INITIAL_SUPPLY` never change nor are set in the contract's constructor so both values can be made `constant` to possibly save a small amount of gas
- Suggestion: Change values from `immutable` to `constant`
 
### **[L-2]** Set `MAX_TOTAL_SUPPLY` and `INITIAL_SUPPLY` with their final values instead of performing additional arithmetic
- Lines: 41, 42
- Description: `MAX_TOTAL_SUPPLY` and `INITIAL_SUPPLY` can be set with their final values, which avoids the need to perform additional arithmetic operations and use gas unnecessarily
- Suggestion: Append `ether` to both values and update code to remove additional operations (see also **[L-1]**)
```solidity
  uint256 public constant MAX_TOTAL_SUPPLY = 500_000 ether;
  uint256 public constant INITIAL_SUPPLY = 150_000 ether;

  ...

  constructor(...) {
    ...
    _mint(_treasury, MAX_TOTAL_SUPPLY - INITIAL_SUPPLY);
    _mint(_ico, INITIAL_SUPPLY);
  }
```

### **[L-3]** Overriden `_transfer` emits redudant event with parent contract
- Lines: 68
- Description: `_transfer` emits event `TokenTransferred` which is redundant since the parent `ERC20`'s `_transfer` will already emit the expected `Transfer` event. This will increment gas consumption slightly and might be confusing for clients consuming the emmited sequence of events
- Suggestion: Remove `TokenTransferred` and its emit

## Code Quality & Nitpicks

### **[CQ-1]** Use of `amountToSend` in `_transfer` is unnecesary
- Lines: 61
- Description: Calculation and tax deducation can be done directly on the `amount` parameter, saving the need of an extra memory variable and less gas
- Suggestion: Remove `amountToSend` and use `amount` directly

### **[CQ-2]** Consistent use of errors
- Lines: 24
- Description: Most errors in contract are custom errors but `_onlyOwner` uses a `require` statement instead
- Suggestion: Replace `require` with
```solidity
  if (msg.sender != OWNER) revert OnlyOwner();
```

---

# ICO.sol

## Severity: High

**N/A**

## Severity: Medium

### **[M-1]** Pausing of contribution and redemption should be independent
**Note**: This was my interpretation of the spec but I went through the ICO question channel and admitidely found the answers confusing 🤷‍♂️ So I won't elaborate much more here.
Ref: https://discord.com/channels/870313767873962014/1081268082573590578/1082024413370798192
- Just adding it here if this were the case and possibly a spec mismatch

## Severity: Low

### **[L-1]** Set `TOKEN_REDEEM_RATIO` as `constant`
- Lines: 20
- Description: `TOKEN_REDEEM_RATIO` never changes nor is set in the contract's constructor so the value can be made `constant` to possibly save a small amount of gas
- Suggestion: Change value from `immutable` to `constant`

### **[L-2]** Add a safety check to `advanceICOPhase`
- Lines: 59
- Description: Given `advanceICOPhase` importance and the contracts inability to move back phases, adding an additional check to guarantee the call to the function is performing what is expected is advised
- Suggestion: Add a parameter to the function call that requires the caller to explicitly state which phase they want to move to
```solidity
  function advanceICOPhase(ICOPhase nextPhase) external _onlyOwner {
    ...
    require(isValidNextPhase(nextPhase), "ICO: invalid phase transition");
    ...
  }
```

## Code Quality

### **[CQ-1]** Add an `indexed` paramater to events
- Lines: 29, 30
- Description: Events `ContributionMade` and `TokenRedeemed` would benefit by having an `indexed` parameter for `address` since this will probably be a parameters clients will search upon
- Suggestion: Add `indexed` to `address` parameter

### **[CQ-2]** Prefer using interfaces over `address`
- Lines: 17
- Description: `SPC_ADDRESS` is a reference to the `SpaceCoin` contract and is used as such in the `redeemSPC` function call. To be more explicit of its intent, prefer using the `SpaceCoin` interface type instead of the generic `address`
- Suggestion: Update type
```solidity
  SpaceCoin public immutable SPC;
```

### **[CQ-3]** `contributions[msg.sender]` can be zeroed
- Lines: 116
- Description: `contributions[msg.sender]` can be zeroed instead of decremented since the subtraction effectively is zeroing its value, saving a small amount of gas and making the operation's intent clearer. The variable `contributionAmount` can also be removed since all operations can use `contributions[msg.sender]` directly, since this function is not susceptible to a reentrancy attack
- Suggestion: Update code to below and remove `contributionAmount`
```solidity
  contributions[msg.sender] = 0;
```
