Audit of **cryptonomicon46's** "Crowdfund" project

- Auditor: Sand (Sandip Nallani) [@cryptonomicon46](https://github.com/cryptonomicon46)
- Date: 3rd March 2023
- Comments:

---

# Table of Contents

1. [ProjectFactory.sol](#ProjectFactory.sol)
2. [Project.sol](#Project.sol)

---

# ProjectFactory.sol

## Severity: High

**N/A**

## Severity: Medium

**N/A**

## Severity: Low

## **[L-1]** receive function has been implemented without any logic in it.

In the `receive` function on lines 62, you have:

```solidity
    receive() external payable {}
```

The project constructor doesn't indicate a 'payable' modifer. So the 'receive' function technically doesn't do anything.
It would've made sense to call the 'contribute' function in this fallback function.
But since the visibility of the 'contribute' function is 'external' even this wouldn't work.
It's recommended to delete this function from the contract.

This is low impact and doesn't cause any loss of funds or incorrect business logic.

## Code Quality

### **[CQ-1]** nat-spec comments

Although the code is simple to understand, it would be good practice implement natspec comments on top of the external/public functions like 'create' which requires an input parameter. For example.

///@notice 'create' function creates and deploys a new instance of the Project contract.
///@param "\_fundingGoal' is the input goal amount to raise in ether
///@dev emits a 'ProjectCreated' event with the address of the new project.

---

# Project.sol

## Severity: High

### **[H-1]** '\_reentrant()' modifier doesn't revert for reentrant calls

In the '\_reentrant()' modifer on lines 56-60 you have,

```
    /// @dev prevent reentrancy attacks
    modifier _reentrant() {
        isBalanceLocked = true;
        _;
        isBalanceLocked = false;
    }
```

This is incorrect and doens't perform the function of reverting a reentrant call on a function like 'withdraw' on lines 79-92.

The following correction needs to be implemented to make the reentrancy guard revert upon receiving reentrant calls.

```
     modifier _reentrant() {
        require(!isBalanceLocked, "ReentrancyGuard: reentrant call");
        isBalanceLocked = true;
        _;
        isBalanceLocked = false;
    }
```



## Severity: Medium

**N/A**

## Severity: Low

### **[L-1]** `checkStage` modifier can change state

obvious

## Code Quality

### **[CQ-1]** nat-spec comment format

This format helps anyone looking at an external/public function to quickly understand everything related to the function/event/error.

Please refer to the https://docs.soliditylang.org/en/v0.8.17/natspec-format.html
for the correct format of the natspec comments to include in your contract.

### **[CQ-2]** setting boolean variables 'isBalanceLocked' and 'isCanceled' to 'false in the constructor

In the constructor on lines 28,29 you have

```
        isBalanceLocked = false;
        isCanceled = false;
```

This serves no purpose. As all boolean variables in solidity are by default initialized to '0' or 'false'.

### **[CQ-3]** Unecessary initialization of variables to their default state of '0' or 'false' in the 'constructor'

In the constructor on lines 28,29 you have

```
        isBalanceLocked = false;
        isCanceled = false;
```

This serves no purpose. As all boolean variables in solidity are by default initialized to '0' or 'false'.

### **[CQ-4]** Using 'reverts' with custom error messages instead of strings after solidity version '0.8.0'.

Please refer to the below document and snippet on how to implement 'reverts' with custom error messages that provides more details on the failed transactions and is cheaper on gas.

```
https://docs.soliditylang.org/en/v0.8.18/control-structures.html#revert

Using a custom error instance will usually be much cheaper than a string description, because you can use the name of the error to describe it, which is encoded in only four bytes. A longer description can be supplied via NatSpec which does not incur any costs.
```
