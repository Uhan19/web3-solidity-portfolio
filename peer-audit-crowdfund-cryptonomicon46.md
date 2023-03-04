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

### **[M-1]** uint256`goalAmount` multiplied by large number

## Severity: Low

### **[L-1]** Unused immutable `owner`

### **[L-2]** Redundancy within `numProjects` and `proj_arr.length`

## Code Quality

### **[CQ-1]** Unused event `Unauthorized`

### **[CQ-2]** Requirement of having `proj_arr`, `projToIndex` and `numProjects`

### **[CQ-3]** Function `numberOfProjects` is redundant

---

# Project.sol

## Severity: High

**N/A**

## Severity: Medium

**N/A**

## Severity: Low

### **[L-1]** `checkStage` modifier can change state

### **[L-2]** `projectTotal` is unnecessary or can be simplified

### **[L-3]** Unclear purpose of `_owner` and `_transferOwnership`

### **[L-4]** `contributed` is unnecessary

### **[L-5]** Unnecessary multiple calls to `_hasClaimableNFTs`

### **[L-6]** `contributorsRefund` can be reordered to make Check-Effects-Pattern (CEI) pattern more obvious

## Code Quality

### **[CQ-1]** Incorrect comment

### **[CQ-2]** Break apart amount of logic handled by `_updateAndReturnStage` function

### **[CQ-3]** `creatorWithdraws` does not require reentrancy check

### **[CQ-4]** `claimNFT` does not require reentrancy check nor `onlyContributors` modifier

### **[CQ-5]** `contributorsRefund` does not require `onlyContributors` modifier

### **[CQ-6]** Remove `indexed amount` from events
