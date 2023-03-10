# ICO Project

## Setup

```bash
npm install
```

```bash
npx hardhat compile
```

See [README-Setup.md](./README-Setup.md)

## Technical Spec

<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

### SpaceCoin.sol

- Maximum supply of the SPC token will be `500_000`.
- The initial `150_000` will be minted and to the ICO contract address, the rest of the `350_000` tokens will be minted to the `treasury` address passed in during deployment.
- the decimals of SPC will be the same as ETH, which is `18`.
- SpaceToken inherits from ERC20, but overrides the `_transfer` function to charge a `2%` tax when it is turned on by the `OWNER`.
- The tax will be turned off at contract initialization and only the owner of the contract will be able to turn it on.
- The `2%` tax, if turned on, will be charged on every transfer and will be sent to the `treasury` address.
- The `OWNER` and `TREASURY` cannot be changed after contract deployment.

### ICO.sol

- The ICO contract is responsible for managing SPC ICO.
- The total contribution goal of the ICO is `30_000 ether`, after which point no more contribution can be made.
- There will be three phases of the ICO, `SEED`, `GENERAL` and `OPEN`.
- During the `SEED` phase of the ICO, only contributors that are on the whitelist will be able to contribute.
  - whitelist is set during the ICO contract initialization and cannot be changed after.
  - There is an individual contribution limit during the `SEED` phase of `1500 ether`, the total contribution limit is set at `15_000 ether`.
- During the `GENERAL` phase of the ICO, investment is opened to the public including anyone that is not on the whitelist.
  - There will be an individual contribution limit of `1000 ether`.
  - Individual contribution limits are set cumulatively, that means for those that are on the whitelist and have invested more than `1000 ether`, they will not be able to contribute more during the `GENERAL` phase.
- During the `OPEN` phase of the ICO, there will be no inidividual contribution limit. However, there is a total contribution limit as mentioned before, capped at `30_000 ether`.
- The owner will be the only one that is allowed to advance the ICO phases, there is no automactive phase advancement. The Phases can only be advanced one at a time, only forward not back.
- Owner of the ICO will have an option to pause/resume the ICO, if the ICO is paused no contribution/redemption is allowed. However, the owner can still advance the phase of the ICO.
- Investors who have contributed during the ICO, will be allowed to redeem their SPC tokens at a `1 to 5` ratio, i.e. alice contributes `1 ETH`, she will be able to redeem `5 SPC`. Redemption is only allowed during the `OPEN` phase of the ICO.

## Code Coverage Report

42 passing (3s)

----------------|----------|----------|----------|----------|----------------|
File | % Stmts | % Branch | % Funcs | % Lines |Uncovered Lines |
----------------|----------|----------|----------|----------|----------------|
contracts/ | 100 | 95.45 | 100 | 100 | |
Ico.sol | 100 | 94.74 | 100 | 100 | |
SpaceCoin.sol | 100 | 100 | 100 | 100 | |
----------------|----------|----------|----------|----------|----------------|
All files | 100 | 95.45 | 100 | 100 | |
----------------|----------|----------|----------|----------|----------------|

> Istanbul reports written to ./coverage/ and ./coverage.json

## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> The base requirements give contributors their SPC tokens immediately. How would you design your contract to vest the awarded tokens instead, i.e. award tokens to users over time, linearly?

> Answer: To introduce an vesting schedule, I can add logic to redeem and send the SPC tokens to investors based on a fix time. For example, there can be logic that send 25% of the owed SPC tokens after 30 days from the start of the OPEN phase. Depending on the length of time that we would want the vesting schedule to be, it could take multiple years, we can also front-load or back-load the vests depending on preference. Currently, we only map the contributions like mapping (address => uint256), which only keeps track of their totalContribution. We could introduce a more complicated structructre.

```
    Struct IndividualContributions {
        uint256 totalConbribution
        uint256 vestingStartTime
    }
```

We can then create a mapping (address => IndividualContributions). In the redeemption function we can check the current time against the `vestingStartTime` and calculate the amount that is supposed to be sent to the user. However, I would need to research a more reliable/secure way to calculate time rather than using block.timestamp.

## Testnet Deploy Information

| Contract  | Address Etherscan Link                                                               |
| --------- | ------------------------------------------------------------------------------------ |
| SpaceCoin | https://sepolia.etherscan.io/address/0xCea4CD0ae4D35FA7b759786CC3F008033A3D0553#code |
| ICO       | https://sepolia.etherscan.io/address/0xdBaf8739133B5c7D429D14C190fDbf15D7be93e4#code |
