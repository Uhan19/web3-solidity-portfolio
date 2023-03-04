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

**N/A**

## Severity: Medium

**N/A**

## Severity: Low

### **[L-1]** `checkStage` modifier can change state

obvious

## Code Quality

### **[CQ-1]** nat-spec comment format

This format helps anyone looking at an external/public function to quickly understand everything related to the function. Like input parameters and their types. The returned variables and their type.
Any emitted events or possible reverts.
