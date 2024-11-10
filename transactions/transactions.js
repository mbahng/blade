import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { PublicEccKey } from "../keys/ecc.js";
import { sha256 } from "../utils/hash.js";

export class TransactionInput {
  // containers that track the money one spends. 
  constructor(prev_tx_hash, output_index, signature) {
    assert(prev_tx_hash instanceof Hex);
    assert(typeof output_index === "bigint");
    assert(signature instanceof Hex);

    this.prev_tx_hash = prev_tx_hash; 
    this.output_index = output_index;
    this.signature = signature; 
    this.timestamp = Date.now(); 
  }
}

export class TransactionOutput { 
  // containers that track the money one gains. 
  constructor(amount, pubkey) {
    assert(pubkey instanceof PublicEccKey);
    assert(typeof amount === 'bigint');
    this.amount = amount;  // amount in satoshis
    this.pubkey = pubkey;
    this.timestamp = Date.now(); 
  }
}

export class Transaction {
  constructor(inputs, outputs) {
    for (let input_tx of inputs) {
      assert( input_tx instanceof TransactionInput); 
    }
    for (let output_tx of outputs) {
      assert( output_tx instanceof TransactionOutput); 
    }
    this.inputs = inputs; 
    this.outputs = outputs; 
    this.id = this.calc_id();
  }

  calc_id() {
    // calculates the id of transaction by taking the data 
    // and hashing it 
    let data = "";
    for (let input_tx of this.inputs) { data += input_tx.prev_tx_hash.stream; } 
    for (let output_tx of this.outputs) {data += output_tx.amount.toString(); } 
    return sha256(data);
  }
}

