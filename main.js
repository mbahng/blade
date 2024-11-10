import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./utils/bytestream.js";
import { Block, BlockChain } from "./block/block.js";
import { TransactionInput, TransactionOutput, Transaction } from "./transactions/transactions.js";
import { Wallet } from "./keys/wallet.js";

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
