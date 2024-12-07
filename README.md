# Smart contracts on Tact

This repository contains various **smart contracts** written in **Tact**, along with test cases and deployment scripts for the **TON blockchain**.

## Installation and Usage

``` npm install ``` - install the necessary dependencies;

``` npx blueprint build <SmartContract> ``` - build;

``` npx blueprint test <Test> ``` - test;

``` npx blueprint run <script> ``` - run deployment script;

## Contracts

[calculator.tact](contracts/calculator.tact) - some basic arithmetic operations and the use of get functions for retrieving results

[storage_change.tact](contracts/storage_change.tact) - receiving messages and changing storage

[message_sender.tact](contracts/message_sender.tact) - message sender indentification and ownable trait usage

[money.tact](contracts/money.tact) - receiving toncoins 

[time.tact](contracts/time.tact) - working with time

[fabric.tact](contracts/fabric.tact) - parent-child pattern

[token.tact](contracts/token.tact) - jetton token with transfer fee to owner of token

[lock.tact](contracts/lock.tact) - simple lock of jetton tokens

[staking.tact](contracts/staking.tact) - apr staking in one contract

[de_staking.tact](contracts/de_staking.tact) - apr staking with parent-child pattern

[weight_staking.tact](contracts/weight_staking.tact) - staking where rewards are distributed proportionally based on participants' stakes

[nft.tact](contracts/nft.tact) - nft

[nft_onchain.tact](contracts/nft_onchain.tact) - nft with semi-chain data

[nft_generate_content.tact](contracts/nft_generate_content.tact) - nft with onchain generation of nft item metadata