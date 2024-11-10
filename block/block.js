import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { Transaction } from "../transactions/transactions.js";
import { sha256 } from "../utils/hash.js";

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
    assert(prev_block_hash instanceof Hex);
    for (let tx of transactions) {
      assert(tx instanceof Transaction);
    }
    this.prev_block_hash = prev_block_hash; 
    this.txs = transactions; 
    this.timestamp = Date.now(); 

    // merkle tree needed for SPV nodes
    this.merkletree = this.create_merkle_tree(); 
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

  containsTxHash(tx_hash) {
    assert(tx_hash instanceof Hex); 
    return false; 
  }

}
