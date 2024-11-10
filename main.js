import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./utils/bytestream.js";
import { Block } from "./block/block.js";
import assert from "assert/strict";
import { TransactionInput, TransactionOutput, Transaction } from "./transactions/transactions.js";


let alice = secp256k1(true); 
let bob = secp256k1(true); 

let sig = alice.private.create_signature("hello"); 
console.log(sig);
console.log(sig.verify());

// let tx_i = new TransactionInput(
//    Hex.random(256), 
//    1n, 
//    Hex.random(256)
//  ); 
// let tx_o = new TransactionOutput(
//   10n, 
//   alice.public
// )
//
// let tx = new Transaction([tx_i], [tx_o]); 
//
// console.log(tx); 
