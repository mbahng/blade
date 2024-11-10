import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { PublicEccKey } from "../keys/ecc.js";
import { sha256 } from "../utils/hash.js";

export class TransactionInput {
  // containers that track the money one spends. 
  constructor(address, value, prev_tx) {
    assert(prev_tx instanceof Transaction);
    assert(typeof output_index === "bigint");
    assert(signature instanceof Hex);

    this.address = address;   // address of spender 
    this.value = value; // amount in satoshis
    this.prev_tx = prev_tx; // previous transaction 
  }
}

export class TransactionOutput { 
  // containers that track the money one gains. 
  constructor(address, value) {
    assert(address instanceof PublicEccKey);
    assert(typeof value === 'bigint');
    this.address = address; // address of receiver, pubkey
    this.value = value;     // amount in satoshis
    this.spent = false;     // is this spent on a future transaction? 
    this.spender = null;    // if so, who is the spender? 
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
    this.timestamp = Date.now(); 
  }

  calc_id() {
    // calculates the id of transaction by taking the data 
    // and hashing it 
    let data = "";
    for (let input_tx of this.inputs) { data += input_tx.prev_tx_hash.stream; } 
    for (let output_tx of this.outputs) {data += output_tx.value.toString(); } 
    return sha256(data);
  }
}

