import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./utils/bytestream.js";
import { Block } from "./block/block.js";
import assert from "assert/strict";
import { TransactionInput, TransactionOutput, Transaction } from "./transactions/transactions.js";


let alice = secp256k1(true); 
let bob = secp256k1(true); 

let txs = []; 

for (let i = 0; i < 4; i++) {
  let tx_i = new TransactionInput(
     Hex.random(256), 
     1n, 
     Hex.random(256)
   ); 
  let tx_o = new TransactionOutput(
    10n, 
    alice.public
  )

  let tx = new Transaction([tx_i], [tx_o]); 
  txs.push(tx);
}

let prev_block_hash = Hex.random(256); 

let block = new Block(prev_block_hash, txs); 

console.log(block);
