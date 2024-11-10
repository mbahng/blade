import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { Transaction, TransactionOutput } from "../transactions/transactions.js";
import { sha256 } from "../utils/hash.js";
import { EccKeyPair } from "../keys/ecc.js"; 

export class MerkleNode {
  constructor(value, left = null, right = null) {
    assert(value instanceof Hex);
    this.value = value; 
    this.left = left; 
    this.right = right; 
  }
}

export class Block {
  constructor(prev_block_hash, transactions) {
    assert(prev_block_hash instanceof Hex || prev_block_hash === null);
    for (let tx of transactions) {
      assert(tx instanceof Transaction);
    } 
    this.prev_block_hash = prev_block_hash; 
    this.txs = transactions; 
    this.timestamp = Date.now(); 

    // merkle tree needed for SPV nodes
    this.merkletree = this.create_merkle_tree(); 
    this.id;  
    if (prev_block_hash === null) {
      this.id = new Hex("0"); 
    }
    else {
      this.id = Hex.random(256); 
    }
  }

  create_merkle_tree() {
    if (this.txs.length === 0) {
      return null;
    }

    // Create leaf nodes from transaction hashes
    let leaves = this.txs.map(tx => new MerkleNode(tx.id));
    return this.build_tree_level(leaves);
  }

  build_tree_level(nodes) {
    // If we have only one node, it's the root
    if (nodes.length === 1) {
      return nodes[0];
    }

    const new_level = [];

    // Process nodes in pairs
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      // If we have an odd number of nodes, duplicate the last one
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i];

      // Combine the hashes of the children to create parent hash
      const combined_hash = sha256(left.value.concat(right.value));
      
      // Create new parent node
      const parent = new MerkleNode(combined_hash, left, right);
      new_level.push(parent);
    }

    // Recursively build the next level
    return this.build_tree_level(new_level);
  }

  static genesis() {
    return new Block(null, )
  }
}

export class BlockChain {
  constructor() {
    const genesis = new Block(null, []); 
    this.chain = [genesis]; 
    this.pending_transactions = [];
  }

  add_transaction(tx) {
    this.pending_transactions.push(tx); 
  }

  mint(value, keypair) {
    assert(typeof value === "bigint"); 
    assert(keypair instanceof EccKeyPair); 
    const new_utxo = new TransactionOutput(keypair.public, value); 
    let tx = new Transaction([], [new_utxo]); 
    this.add_transaction(tx);
  }

  add_block() {
    let last_block = this.chain[this.chain.length-1]; 
    let new_block = new Block(last_block.id, this.pending_transactions); 
    for (let ptx of this.pending_transactions) {
      for (let ptxi of ptx.inputs) {
        // TODO: update so that previous utxos are marked spent 
        ptxi.prev_tx.outputs;
      }
      for (let ptxo of ptx.outputs) {
        // update utxo list of the keys
        ptxo.address.txos.push(ptxo); 
      }
    }
    this.pending_transactions = []; 
    this.chain.push(new_block);
  }

}
