# Multisig Project

## Deliverables

My Gnosis Safe can be found here: `https://app.safe.global/transactions/history?safe=gor:0x317f48ae78D40ce6E3a17C1bFdfa8Ec1F33cd275`

Contracts have been deployed to Goerli at the following addresses:

| Contract      | Address Etherscan Link                                                           | Transaction Etherscan Link                                                                          |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Multisig      | `https://goerli.etherscan.io/address/0x317f48ae78D40ce6E3a17C1bFdfa8Ec1F33cd275` | `FILL_ME_IN`                                                                                        |
| Proxy         | `https://goerli.etherscan.io/address/0xe1abcb6565169d7ed8c989427a25383177a88631` | `https://goerli.etherscan.io/tx/0x3c4394ec9a318fad3853e72d2a48101814dd8346ea1e3f39db27564fcbac85b5` |
| Logic         | `https://goerli.etherscan.io/address/0x5802d15dea72eded84b78914f5d7a1d27da5ae34` | `https://goerli.etherscan.io/tx/0xed5cd9ffe56d2789c28a9ad31906f144a1c2848cfeb7972351bf765eb3d48421` |
| LogicImproved | `https://goerli.etherscan.io/address/0x9c530a4ab67b7d09b65a8b350c8451828af3e998` | `https://goerli.etherscan.io/tx/0x1b381d0df7bd0a7b62ac0718e6e7a3c318594fda6e9a54e82b0ecec2ac3e70a1` |

Transaction for transferring the ownership of the **Proxy** contract to the multisig:

| Contract | Transaction Etherscan Link                                                                          |
| -------- | --------------------------------------------------------------------------------------------------- |
| Proxy    | `https://goerli.etherscan.io/tx/0x4b43abd4bdd547ffdfbb3425fdc1d5759166cf5cbd9a8547c6f5cdc961be7ae8` |

Transaction calling `upgrade(address)` to upgrade the **Proxy** from **Logic** -> **LogicImproved**
| Contract | Function called | Transaction Etherscan Link |
| --------------- | --------------- | -- |
| Proxy | `upgrade` | `https://goerli.etherscan.io/tx/0x59dee544fc2c9196e8388015e408432f8579f171ab2b5e234e82d8e3a2cb43cc` |

# Design exercise

> Consider and write down the positive and negative tradeoffs of the following configurations for a multisig wallet. In particular, consider how each configuration handles the common failure modes of wallet security.

> - 1-of-N
> - M-of-N (where M: such that 1 < M < N)
> - N-of-N

## 1-of-N

### Advantages

-
-

### Disadvantages

-
-

### M-of-N (where M: such that 1 < M < N)

### Advantages

-
-

### Disadvantages

-
-

### N-of-N

### Advantages

-
-

### Disadvantages

-
-
