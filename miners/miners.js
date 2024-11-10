import assert from "assert/strict";
import { PublicEccKey } from "../keys/ecc.js"; 
import { Block, BlockChain } from "../block/block.js";
import { sha256 } from "../utils/hash.js";

export class Miner {
  constructor(owner_pubkey, blockchain) {
    assert(owner_pubkey instanceof PublicEccKey);
    assert(blockchain instanceof BlockChain);
    this.owner_pubkey = owner_pubkey; 
    this.blockchain = blockchain;
    this.nonce = 0n; 
  }

  construct_candidate_block() {
    // take pending transactions, make a new block 
    let last_block = this.blockchain.chain[this.blockchain.chain.length - 1];
    let new_block = new Block(last_block.id, this.blockchain.pending_transactions, last_block.height+1, 0n);
    return new_block; 
  }

  compute_hash(block, nonce) {
    assert(typeof nonce === "bigint");
    // construct hash of the block header
    let header = ""; 
    header += block.version.stream;  
    header += block.prev_block_hash.stream;  
    header += block.merkletree.value.stream; 
    header += block.timestamp.toString(); 
    header += block.difficulty.stream; 
    header += nonce.toString(); 
    const hash = sha256(header); 
    return hash; 
  }

  mine() {
    let candidate_block = this.construct_candidate_block(); 
    let candidate_id; 
    do {
      candidate_id = this.compute_hash(candidate_block, this.nonce); 
      this.nonce += 1n; 
    } while(candidate_id.toBigInt() >= candidate_block.difficulty.toBigInt()); 
    console.log(`${this.owner_pubkey.K.stream.slice(0, 5)}...${this.owner_pubkey.K.stream.slice(-5)} mined block #${candidate_block.height} with nonce ${this.nonce -1n}.`)

    // update candidate block id with valid hash and update which nonce it was successful  
    candidate_block.update_id(candidate_id); 
    candidate_block.nonce = this.nonce - 1n;

    this.nonce = 0n;
    return candidate_block; 
  }
}
