# LP Project

## Setup

See [README-Setup.md](./README-Setup.md)

## Technical Spec

ICO:

Update your contracts to:

- [x] Add a withdraw function to your ICO contract that allows you to move the invested funds out of the ICO contract and into the treasury address.
- [x] In one of your tests, test the end-to-end process of raising funds via the ICO, withdrawing them to the treasury, and then depositing an even worth of ETH and SPC into your liquidity contract.

### **Liquidity Pool Contract**

Implement a liquidity pool for ETH-SPC. You will need to:

- [x] Write an ERC-20 contract for your pool's LP tokens
- Write a liquidity pool contract that:
  - [x] Mints LP tokens for liquidity deposits (ETH + SPC tokens)
  - [x] Burns LP tokens to return liquidity to holder
  - [x] Accepts trades with a 1% fee

### **SpaceRouter**

Transferring tokens to an LP pool requires two transactions:

- [x] Trader grants allowance on the Router contract for Y tokens.
- [x] Trader executes a function on the Router which pulls the funds from the Trader and transfers them to the LP Pool.

Write a router contract to handles these transactions. Be sure it can:

- [x] Add and remove liquidity, without wasting or donating user funds.
- [x] Swap tokens, allowing traders to specify a minimum amount out for the output token

## **Testnet Deployment and Etherscan Verification**

### **Deployment**

Once you complete these contracts, **[deploy them to the Sepolia testnet](https://hardhat.org/tutorial/deploying-to-a-live-network.html)**.

You must include Etherscan links to the following contract addresses in your README.md:

- [x] SpaceCoin (for instance **[like this contract deployment tx](https://sepolia.etherscan.io/address/0x06E8C853D643bf913a1CeBaB062317a385973EEA#code)**)
- [x] ICO
- [x] Router
- [x] Pool

### **Etherscan Verification**

You must verify the source code of each contract you deploy to testnet.

## **Code Coverage**

Include the code coverage output (e.g. what you get when you run **`npx hardhat coverage`**) in the **Code Coverage Report** section of your project's README.md.

## **Frontend**

Extend the given frontend code (coming soon) to enable:

1. LP Management
   - [x] Allow users to deposit ETH and SPC for LP tokens
   - [x] Allow users to redeem LP tokens to get back ETH and SPC
2. Trading
   - [x] Allow users to trade ETH for SPC, and vice-versa.
   - [x] Users should be able to configure a slippage tolerance for their trade.
     - [x] This should be translated into a "minimum amount out" value in the call to the router.
   - [x] Show an estimated amount out the user will receive. This should equal the amount they would recieve if the trade executed with no slippage.

## Code Coverage Report

83 passing (11s)

------------------|----------|----------|----------|----------|----------------|
File | % Stmts | % Branch | % Funcs | % Lines |Uncovered Lines |
------------------|----------|----------|----------|----------|----------------|
contracts/ | 100 | 82.88 | 100 | 100 | |
Ico.sol | 100 | 93.18 | 100 | 100 | |
SpaceCoin.sol | 100 | 100 | 100 | 100 | |
SpaceLP.sol | 100 | 69.23 | 100 | 100 | |
SpaceRouter.sol | 100 | 86.36 | 100 | 100 | |
------------------|----------|----------|----------|----------|----------------|
All files | 100 | 82.88 | 100 | 100 | |
------------------|----------|----------|----------|----------|----------------|

## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> 1. Many liquidity pools incentivize liquidity providers by offering additional rewards for staking their LP tokens - What are the tradeoffs of staking? Consider the tradeoffs for the LPs and for the protocols themselves.

LP Risks

- Impermanent loss: Even though staking LP tokens can offer rewards, LP provider are still exposed to impermanent loss which can easily offset the rewards gained from staking. Impermanent loss occurs when the relative value of the pool changes which reduces the value of liquidity provider's shares in comparison to if they had just held their assets outside of the LP.

- Lock up periods: If there are lock periods defined for staking LP tokens, then this poses a liquidity risk to the liquidity providers. During this lock period, they will not have access to their funds. This can cause additional issues for the liquidity providers as their could be opportunity costs associated with not being able to withdraw their funds.

- Inherent risks with staking pools: If the LP staking pool allows different stake holders to pool their LP tokens together to earn additional rewards, then the stake holders could be exposed to dishonest behaviors by the pool admin. Furthermore, there could be technical risks such as vulnerabilities in the smart contracts of the LP staking pools that might result in the loss of funds for the stake holders.

Protocal Risks

- Speculative risk: If protocols offer attractive short-term staking rewards, this might attract speculators who are focused on earning staking rewards but not necessarily helping provid consistent stability to the liquidity pool. This can cause fluctuation in the LP and it's user base.

- Long term robustness vs short-term user acquisition: Similar to speculative risks, protocols who is focused on building a robust ecosystem should be concerned with the sustainability of their staking structure to make sure that they are not trading long term growth for short term gain in assets. If the staking reward structure requires constant acquisition of assets, this might not be sustainable in the long run as it could create issues like downward token price pressure.

- Risks with growing in scale too quickly: If the protocol's staking reward structure is relatively attractive, it will run the risk of growing too quickly which can have associated risks. One this could cause a centralization of liquidity which has inherent systemic risks. There could has be governance risks as users who accumulates large amount of tokens might have have the interests of the community in mind. All of these risks could require the protocol to dedicate addtional resources to make sure that the issues are properly resolved. This could divert their attention away from their core product offering, which might affect their long-term growth. Furthermore, if these issues are not resolved properly, there could be potential reputation risks that will hurt the protol. Overall, offering attractive staking rewards could be a effective way in attrating users and assets, but it does come with additional complexities that should be considered.

> 2. Describe (using pseudocode) how you could add staking functionality to your LP.
>    We could implement a staking functionality by first adding a contribute functions that allows the user to stake their LP token. The function can register how many tokens that they have contributed and mark a timestamp with the amount that they have staked. The contract should also have some way of determining how much rewards user should gain per token staked and the amount of time that the rewards have been staked.

```solidity
    // lock up period
    lockupPeriod = 7 days;
    bool lock;
    // reward rate
    uint256 public rewardRatePerToken;
    // rewards mapping to keep track of all of the users stakes
    mapping(address => mapping(uint => UserStake)) public rewards
    // total number of times a user has staked rewards
    mapping(address => uint) public userTotalNumStakes
    mapping(address => uint) public userTotalDeposits

    // struct to keep track of the timestamp of each staking deposit
    struct UserStake {
      uint256 timeDeposited,
      uint256 totalStakes
    }

    error NoDepositsMade();
    error NoReentrancy();

    modifier lock() {
      if(lock) revert NoReentrancy();
      lock = true;
      _;
      lock = false;
    }

  // function to calculate the rewards
  function calculateReward(uint amount) internal {
    // determine the award amount based on rate defined
    return amount * rewardRatePerToken;
    // this function can be further augmented depending on the reward structure dictated by the contract
  }

  function stakeLpTokens(uint amount) public {
    // transfer the token to the user
    lpToken.transferFrom(msg.sender, address(this), amount)
    // credit the stakeholder with the amount staked and time stamp
    rewards[msg.sender][userTotalNumStakes[msg.sender]] = UserStake(block.timestamp, calculateReward(amount));
    userTotalDeposits += calculateReward(amount);
    userTotalNumStakes[msg.sender] += 1;
  }

  function withdrawReward(amount) lock public {
    // check if the user has any rewards staked
    if (userTotalDeposits[msg.sender] == 0) revert NoDepositsMade();
    uint totalWithdrawAmount;
    for (uint i = 0; i < userTotalNumStakes[msg.sender]; i++) {
      if (rewards[msg.sender][i].timeDeposited <= block.timestamp - lockupPeriod) {
        totalWithdrawAmount += rewards[msg.sender][i].totalStakes;
      }
    }

    // rewardToken is not initialied in the contract, but in real project it can be and we can transfer the token to the user
    rewardToken.transfer(msg.sender, totalWithdrawAmount);
  }

```

## Testnet Deploy Information

| Contract  | Address Etherscan Link                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| SpaceCoin | `https://sepolia.etherscan.io/address/0xdFcb7bf63A19022c5B15284e615F7d693A8cbC57#code` |
| ICO       | `https://sepolia.etherscan.io/address/0xd5B7a768a5BFc8c5e64605B2B339B61833C5A8b6#code` |
| Router    | `https://sepolia.etherscan.io/address/0xAa7171d18f588DfF8A0a1b50AD2E0e882784BCc9#code` |
| Pool      | `https://sepolia.etherscan.io/address/0x1DA96f80f17F286e96F53ad542A0aD19cDDb2032#code` |
