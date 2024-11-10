import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./utils/bytestream.js";
import { Block, BlockChain } from "./block/block.js";
import { TransactionInput, TransactionOutput, Transaction } from "./transactions/transactions.js";
import { Wallet } from "./keys/wallet.js";
import { Miner } from "./miners/miners.js";

function transaction_simulation() {
  let chain = new BlockChain(); 
  let muchang = Wallet.random(); 
  let sara = Wallet.random(); 

  chain.mint(5000n, muchang.master_keypair);
  chain.mint(6000n, sara.master_keypair);
  chain.add_block(); 

  console.log(`Muchang starts with 5000. `);
  console.log(`Sara starts with 6000. `);

  for (let i = 0; i < 3; i++) { 
    let val1 = BigInt(Math.floor(Math.random() * 10));  
    let val2 = BigInt(Math.floor(Math.random() * 10));  
    console.log(`Muchang sends ${val1} to Sara. `);
    console.log(`Sara sends ${val2} to Muchang. `);
    let tx1 = muchang.send(sara.master_keypair.public, val1); 
    let tx2 = sara.send(muchang.master_keypair.public, val2);
    chain.add_transaction(tx1); 
    chain.add_transaction(tx2); 
    chain.add_block() 
    console.log(`Muchang's balance is ${muchang.balance()}`);
    console.log(`Sara's balance is ${sara.balance()}`);
  }

  console.log(chain);
}

// Construct chain, two wallets, and miner
let chain = new BlockChain(); 
let M = Wallet.random(); 
let S = Wallet.random();  
let M_miner = new Miner(M.master_keypair.public, chain); 

// mint some coins for now
chain.mint(5000n, M.master_keypair);
chain.mint(6000n, S.master_keypair);

console.log(M.balance());
console.log(S.balance());

chain.receive_block(M_miner.mine());

console.log(M.balance());
console.log(S.balance());

// make some dummy transactions 
let tx1 = M.send(S.master_keypair.public, 20n); 
let tx2 = S.send(M.master_keypair.public, 50n);
chain.add_transaction(tx1);
chain.add_transaction(tx2);

chain.receive_block(M_miner.mine());
console.log(M.balance());
console.log(S.balance());

let tx3 = M.send(S.master_keypair.public, 30n); 
let tx4 = S.send(M.master_keypair.public, 50n); 
chain.add_transaction(tx3);
chain.add_transaction(tx4);

chain.receive_block(M_miner.mine());
console.log(M.balance());
console.log(S.balance());

