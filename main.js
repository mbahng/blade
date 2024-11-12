import { BlockChain } from "./block/block.js";
import { Wallet } from "./keys/wallet.js";
import { Miner } from "./miners/miners.js"
import { Hex } from "./utils/bytestream.js";

const difficulty = new Hex("0000090000000003A30C00000000000000000000000000000000000000000000");  
const reward = 10n;

const chain = new BlockChain(difficulty, reward);
const M = Wallet.random();
const S = Wallet.random();
const M_miner = new Miner(M.master_keypair.public, chain);
// const S_miner = new Miner(S.master_keypair.public, chain);

M_miner.start();
// S_miner.start(); 

setTimeout(() => {
  setInterval(() => {
    let tx1 = M.send(S.master_keypair.public, 1n);
    chain.add_transaction(tx1);
    // let tx2 = S.send(M.master_keypair.public, 0n);
    // chain.add_transaction(tx2);
    console.log(`M (-1) S(+1)         M ${M.balance()} S${S.balance()}         chain length = ${chain.chain.length-1}`);
    // for (let txo of M.txos()) {
    //   console.log(txo.value, txo.spent);
    // }
  }, 2000);
}, 10000)


