# p-chain-staking-code-samples
The repo is tailored for flare validator staking, where a validator can stake FLR for gaining block creation power on Flare.

## Installation
Clone this repository by running 
```bash
git clone https://github.com/flare-foundation/p-chain-staking-code.git
```
and run `yarn` inside the cloned repo folder.

## C-chain and P-chain
Flare has three chains - X-chain (transaction chain), C-chain (contract chain), and P-chain (platform chain). The relevant ones here are the latter two. Funds are received on C-chain, but need to be transfered to P-chain, where they can be staked.

Note that each chain has a different address. On p-chain there is no standard format and usually Bech32 is used,
while the standard for c-chain matches that of Ethereum (to comply with Ethereum Virtual Machine). 

## Stake flow
For staking using this repo, start by obtaining a private key (either a length 64 hexadecimal or cb58 format) and paste it into `.env` file.
To find out the derived c-address and p-address, use `yarn getAddresses`.

As staking is done on p-chain, funds need to be transfered from c-chain to p-chain. The steps are
- export funds from c-chain,
- import funds to p-chain,
- stake on p-chain.

For that, run the following scripts
```bash
yarn export amount
yarn import
yarn stake duration amount
```

Here, `amount` is the amount to export / delegate (in `FLR` / 1e9) and duration is the staking time (in seconds).

The configuration for the network is inside `config.ts`. Mainly, it is used to differentiate the testnet (coston2) and mainnet (flare).

## Testing
When testing, you can fund a testnet c-chain address by using a faucet (e.g. [here](https://faucet.towolabs.com/)).

## Testing with go-flare node
This code can be tested locally, using a node sourced [here](https://github.com/sprwn/go-flare).

First, log a private key with some funds on c-chain into `.env` - you can use a funded test account
with private key `0xd49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb`. 

Then, you have to register your validator configuration hash in the node code.
Say you want to use the node with id `NodeID-DMAS3hKKWMydmWGmGd265EYCoV7zFWEHK` to stake `10000000000000` (wei?)
for duration of `1512000` seconds. To calculate the hash, use
```bash
yarn getHash NodeID-DMAS3hKKWMydmWGmGd265EYCoV7zFWEHK 10000000000000 1512000
```
With that you get a hash `2b52aae672d041ec5ec597bb72b6c1815f01f2b895ed5cddb42c45ca0e629317`.
Add this hash to the array [here](https://github.com/sprwn/go-flare/blob/main/avalanchego/utils/constants/validator_config.go#L76) in your cloned go-flare repo. Now you can setup the repo as dictated in its readme.

To stake, you have to first export funds from P-chain to C-chain, which is done by running
`yarn export 20000000000000` and `yarn import` (if you get `errInsufficientFunds` error, 
try raising the default fee when exporting funds). Finally you can add the validator with
```bash
yarn ts-node src/addValidator.ts NodeID-DMAS3hKKWMydmWGmGd265EYCoV7zFWEHK 10000000000000 1512000
```

## TODO
- [ ] make the code flare specific,
- [ ] test everything, configured on the coston2 network.