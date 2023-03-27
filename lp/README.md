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

> 2. Describe (using pseudocode) how you could add staking functionality to your LP.

## Testnet Deploy Information

| Contract  | Address Etherscan Link                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| SpaceCoin | `https://sepolia.etherscan.io/address/0xdFcb7bf63A19022c5B15284e615F7d693A8cbC57#code` |
| ICO       | `https://sepolia.etherscan.io/address/0xd5B7a768a5BFc8c5e64605B2B339B61833C5A8b6#code` |
| Router    | `https://sepolia.etherscan.io/address/0xAa7171d18f588DfF8A0a1b50AD2E0e882784BCc9#code` |
| Pool      | `https://sepolia.etherscan.io/address/0x1DA96f80f17F286e96F53ad542A0aD19cDDb2032#code` |
