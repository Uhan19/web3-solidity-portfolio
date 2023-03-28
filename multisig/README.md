# Multisig Project

## Deliverables

My Gnosis Safe can be found here: `FILL_ME_IN`

Contracts have been deployed to Goerli at the following addresses:

| Contract      | Address Etherscan Link | Transaction Etherscan Link |
| ------------- | ---------------------- | -------------------------- |
| Multisig      | `FILL_ME_IN`           | `FILL_ME_IN`               |
| Proxy         | `FILL_ME_IN`           | `FILL_ME_IN`               |
| Logic         | `FILL_ME_IN`           | `FILL_ME_IN`               |
| LogicImproved | `FILL_ME_IN`           | `FILL_ME_IN`               |

Transaction for transferring the ownership of the **Proxy** contract to the multisig:

| Contract | Transaction Etherscan Link                                                                          |
| -------- | --------------------------------------------------------------------------------------------------- |
| Proxy    | `https://goerli.etherscan.io/tx/0xa70efc976778e923504ae4bcafed270345e17cd472286a904d679ae01441c850` |

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
