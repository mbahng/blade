import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { Transaction } from "../transactions/transactions.js";

export class Block {
  constructor(prev_block_hash, transactions) {
    assert(prev_block_hash instanceof Hex);
    for (let tx of transactions) {
      assert(tx instanceof Transaction);
    }
    this.prev_block_hash = prev_block_hash; 
    this.txs = transactions; 
    this.timestamp = Date.now(); 
  }
}
