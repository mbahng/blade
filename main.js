import { BlockChain, Wallet, Miner, Hex } from "./index.js";

// initialize difficulty and reward for mining a block 
const difficulty = new Hex("0000500000000003A30C00000000000000000000000000000000000000000000");  
const reward = 10n;

// initialize blockchain
const blockchain = new BlockChain(difficulty, reward);

// create some wallets with their respective miners. 
const M = Wallet.random();
const S = Wallet.random();
const M_miner = new Miner(M.master_keypair.public, blockchain); 
const S_miner = new Miner(S.master_keypair.public, blockchain); 
blockchain.add_miner(M_miner);
blockchain.add_miner(S_miner);

// start the asynchronous mining
M_miner.start();
S_miner.start();

// give some time to accumulate money through mining first few blocks 
await new Promise(resolve => setTimeout(resolve, 2000)); 

// every 1 second, we conduct a transaction 
setInterval(() => {
  // creates transactions 
  let tx1 = M.send(S.master_keypair.public, BigInt(Math.floor(Math.random() * 5))); 
  let tx2 = S.send(M.master_keypair.public, BigInt(Math.floor(Math.random() * 5)));   
 
  // sends them to the blockchain, the TXIs are used and are "pending" in the blockchain
  blockchain.add_transaction(tx1); 
  blockchain.add_transaction(tx2); 

  console.log(`M : ${M.balance()}, S : ${S.balance()}, Pending : ${blockchain.pending_withheld()}`); 
  console.log(`Total Coins in Circulation : Num Blocks Mined * Reward = ${Number(reward) * (blockchain.chain.length-1)}`)

  // Once the new block is mined, all pending transactions are flushed and the 
  // receiver gets the coins
}, 1000); 

setInterval(() => {
  console.log(blockchain);
}, 10000); 




