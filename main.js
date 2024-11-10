import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./utils/bytestream.js";
import { Block, BlockChain } from "./block/block.js";
import assert from "assert/strict";
import { TransactionInput, TransactionOutput, Transaction } from "./transactions/transactions.js";
import { Wallet } from "./keys/wallet.js";

let chain = new BlockChain();  
let alice = Wallet.random(); 
let bob = Wallet.random(); 

chain.mint(625n, alice.master_keypair);
chain.mint(625n, alice.master_keypair);
chain.mint(625n, bob.master_keypair);
chain.add_block(); 

console.log(alice.balance());
console.log(bob.balance());

chain.mint(625n, alice.master_keypair);
chain.mint(625n, alice.master_keypair);
chain.mint(625n, bob.master_keypair);
chain.add_block(); 

console.log(alice.balance());
console.log(bob.balance());
