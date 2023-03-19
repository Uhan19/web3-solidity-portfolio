# Peer Audit of DAO Project








Audited By: Eman Herawy (emanherawy)








**The commit hash used for auditing:** [DAO](
https://github.com/0xMacro/student.Uhan19/commit/459cb1b85e645b429477efed5400b5241b5d453f)








Hello Uhan ,


I had the pleasure to audit your code. Your code is very organized, well documented and easy to understand 👏 🎉👏 🎉👏 🎉. What I found in the code is related to missing some points in the spec as well as being over concerned about handling contract balance. This concern was even obvious in our discussion in the breakout room. In your contract you were also concerned about the user's wrong inputs. I do understand your point of view as a developer but as long as there is no risk or vulnerability of removing this check and the transaction will fail if the end user sends wrong inputs, why do we add extra cost in deploying as well as calling the contract ? to give you some examples, what will happen if you didn't check the arrays length in these functions
- `execute`
- `propose`
- `castBulkVotesBySignature`


What would happen if you didn't recreate and compare the  generated and given proposal id in the `execute` function ?






## Issues




### **[M-1]** Executors are not getting rewards in the correct order.
splitting execute the proposal from getting the reward leads to several issues
- The first executor might not get his reward while the last executor gets it only because he was able to run `redeemReward` before the first one .
- Increase gas cost
 - have two transaction instead of one
 - extra storage used
- It might be intended not to reward the executor based on the balance constraint in execution time but with the current implementation . you are saving these reward to be claimed anytime regardless the execution time


### **[Q-1]** unneeded extra function to handle contract ether.
In order to protect the contract from receiving unexpected ether through `selfdestruct`, you  declared
- `balance`
- `rewards` mapping
 and you had to trace this balance in `execute` , `redeemReward`,`buyNFTFromMarketplace` & `buyMembership` which means extra cost with no need.
-
### **[Q-2]** assign `domainSeparator` once and use it as many times as you want.
In each voting , you are calculating `domainSeparator` which increases gas cost . There's no chance that this variable changes after contract deployment and will be more gas efficient if you could calculate it once and save it.




### **[Q-3]** Checking array length only when there's a potential risk.


Checking array length is good but if you evaluate the potential risk of removing them , you will get zero risk because the expectation is to set arrays in the same order and length. If the end user sends wrong data, it means that the transaction will fail, no more risk. while having these checks will increase the transaction cost in vital functions which are called a lot.
- `execute`
- `propose`
- `castBulkVotesBySignature`


### **[Q-4]** Recalculating  proposal id and comparing it with the function parameter `proposalId` increases gas cost with no need.


Since the only way to execute any proposal is by sending the function data,` targets`,`values`,`calldatas`,`nouce`, there's no need to pass `proposalId` and compare it with `proposalExecuteId`, you can omit it and depend on `proposalExecuteId`
```
   Proposal storage proposal = proposals[proposalId];
       uint256 proposalExecuteId = hashProposal(
           targets,
           values,
           calldatas,
           nouce
       );
       if (proposalExecuteId != proposalId) {
           revert InvalidProposalId();
       }
```
### **[Q-5]** increase the gas cost and function complexly to O(2n) with no need in the `execute` function.


In the below code, you are looping twice, the first time is to calculate the total ether that will be spent in this function call and the second time is to  send the external calls. By doing so you are increasing the function complexity to O(2n) and of course increasing the gas cost. What will happen if the contract doesn't have the required balance ? the transaction and all internal transactions will be reverted.  Same for defining new variable to read from memory variable `uint256 value = values[i];` this increase the gas cost with no need
```
     uint256 totalValue;
       for (uint256 i = 0; i < targets.length; i++) {
           totalValue += values[i];
       }
       if (balance < totalValue) revert InsufficientBalance();
       balance -= totalValue;
       for (uint256 i = 0; i < targets.length; i++) {
           uint256 value = values[i];
           values[i] = 0;
           (bool success, ) = targets[i].call{value: value}(calldatas[i]);
           if (!success) {
               revert ProposalExecutionFailed(targets[i], value, calldatas[i]);
           }
       }


```
### **[Q-6]** Avoid saving proposal `nonce` on contract storage.
Saving proposal `nonce` in contact increase the gas cost and the value gained is less the cost paid


