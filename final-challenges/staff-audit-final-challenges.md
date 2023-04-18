https://github.com/0xMacro/student.Uhan19/tree/5927f370d841f3cc9d83bd71e411007b2367f4bb/final-challenges

Audited By: Melville


# Sudoku Challenge

Below you will find the staff audit for both of the interview question solutions you submitted. For the Sudoku Exchange problem, the audit will look a little different than you're used to. Instead of issues in the code you submitted, you will find several checklists of known vulnerabilities and known gas optimizations. We've added an `[x]` next to each item if you correctly identified that item in your submission, and a `[]` if not.

## General Comments

1. A gentle heads up: the Sudoku Exchange problem is intentionally very difficult. Usually only 1 student manages to find enough vulnerabilities and gas optimizations to pass. Please, use this as a benchmark for how much you've learned in the last 6 weeks (only 6 weeks!). Even better, for those items you missed we hope you use it as a guide for the attack vectors to look out for on your next interview/audit.

## Issues

### High Severity Vulnerabilities

- [ ] `createReward()`'s `ERC20.transferFrom` call does not check the return value for success.

- [ ] `createReward()` allows overwriting of existing challenge reward/token/solved.

- [x] Need to change the `.transfer` call to transfer to `msg.sender` so that it rewards the caller.

- [x] Need to change data type from `memory` to `storage` so that it changes the storage value of the `ChallengeReward`.

- [ ] `claimReward` can be front-run. `SudokuExchange` needs to change the `claimReward` logic to use a 2-stage commit-reveal process where the first transaction commits `keccak256(msg.sender + random_salt)`, and then, after some number of a blocks, in a second transaction the actual solution is provided. The `msg.sender + random_salt` hash ensures that the second transaction cannot be front-run.

- [x] Can be double-claimed. Need to check that it's not solved (or remove it from mapping).

- [x] `claimReward` is vulnerable to a reentrancy attack. (It would not be if it followed checks-effects-interactions.)

### Low Severity Vulnerabilities

- [ ] `claimReward`'s `ERC20.transfer` call does not check the return value for success.

- [ ] `createReward()` allows creating an already solved challenge (`solved=true`), locking tokens.

- [ ] `createReward` does not handle feeOnTransfer tokens, because it assumes the amount sent in `transferFrom` is the amount received by the SudokuExchange.

### Gas Optimizations

- [x] Turn solc gas optimizations on.
- [ ] Gas savings from shorter error strings or Solidity Custom Errors.
- [ ] Do not create new contract with every challenge, instead store within `Challenge` struct on `SudokuExchange`.
- [ ] Only store hash of challenge and verify the hashed input challenge matches (similar to the implementation [here](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/governance/Governor.sol#L256))
- [ ] Eliminate duplicate information from `ChallengeReward` struct. The `challenge` struct member on line 20 is identical to the key of `rewardChallenges` on line 30. Consider removing the `challenge` struct member.
- [ ] Remove an unnecessary stack variable setup by getting rid of the `isCorrect` local variable in `claimReward`. It can be passed directly to the `require` on the next line.
- [ ] Mark the `challenge` storage variable in SudokuChallenge.sol as `immutable`.
- [ ] `challengeReward` can be loaded from storage onto memory once at the top of `claimReward`.

### Code Quality Issues

- [ ] There are no tests!
- [ ] The documentation is sparse. Consider using the NatSpec format for comments, and add more variable, function, and contract comments.
- [x] Explicitly mark the visibility of contract fields like `rewardChallenges` to be `public`.
- [x] Add events to signify changes in the contract state.
- [x] Mark `createReward` and `validate` as external

## Score

In order to pass this interview:
1) You must find all but 1 of the High and Medium severity vulnerabilities.
2) You must find at least 1 Low severity vulnerability.
3) You must find at least 3 Gas Optimizations.

Interview failed. :slightly_frowning_face

# Signature MerkleDrop

## Issues

## **[Technical Mistake]** block.chainid calculated only in the constructor does not protect against replay attacks (1 point)

Inside of your constructor you have the following code:

```solidity
EIP712_DOMAIN = keccak256(
    abi.encode(
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        keccak256(bytes("Airdrop")),
        keccak256(bytes("v1")),
        block.chainid,
        address(this)
    )
);
```

Because you're calculating the EIP-712 domain hash at compile time, it means forever after that signatures generated for this contract must use the same `block.chainid` calculated in the constructor. Let's assume you're deploying to Ethereum Mainnet, where the `chainid == 1`

Now, if Ethereum has a fork and the fork's `chainid == 42`, then that new fork will continue to accept signatures with `chainid == 1`, when it should only accept signatures with `chainid == 42`. The domain hash is no longer doing its job of providing replay protection.

Consider calculating the EIP-712 domain hash dynamically inside of your `signatureClaim` function, or using a caching mechanism and recalculating the domain hash when a new `chainid` is detected. It costs a little bit more gas, but will correctly protect against replays in cases of forks.

## **[Q-1]** Events are not implemented

Though they are not an explicit requirement in the spec, it is a good practice to include events in your contract. Without them there is no easy way to track who has claimed the Airdrop. In addition, they're useful for front end applications interacting with your contracts if you eventually implement them. In this case, merkleClaim, signatureClaim, and are disableECDSAVerification are all worthy of an event.

Consider adding events to your contracts.

## Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 1 |

Total: 1

