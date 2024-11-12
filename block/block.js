import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { Transaction, TransactionOutput } from "../transactions/transactions.js";
import { sha256 } from "../utils/hash.js";
import { EccKeyPair } from "../keys/ecc.js"; 
import { Miner } from "../miners/miners.js";

export class MerkleNode {
  constructor(value, left = null, right = null) {
    assert(value instanceof Hex);
    this.value = value; 
    this.left = left; 
    this.right = right; 
  }
}

export class Block {
  constructor(prev_block_hash, transactions, height, nonce, difficulty) {
    assert(prev_block_hash instanceof Hex || prev_block_hash === null);
    for (let tx of transactions) {
      assert(tx instanceof Transaction);
    } 
    assert(typeof height === "number"); 
    assert(typeof nonce === "bigint");
    this.version = new Hex("0"); 
    this.height = height; 
    this.prev_block_hash = prev_block_hash; 
    this.txs = transactions; 
    this.timestamp = Date.now(); 

    // merkle tree needed for SPV nodes
    this.merkletree = this.create_merkle_tree(); 

    // mining attributes 
    this.difficulty = difficulty;
    this.nonce = nonce; // at what nonce was this block successfully mined 

    this.id = null;  
    if (prev_block_hash === null) {
      this.id = new Hex("0");  // for genesis block
    }
  }

  create_merkle_tree() {
    if (this.txs.length === 0) {
      return new MerkleNode(new Hex("0"));
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
  
  update_id(id) {
    assert(id instanceof Hex); 
    assert(id.toBigInt() < this.difficulty.toBigInt()); 
    this.id = id; 
  } 
}

export class BlockChain {
  constructor(difficulty, reward) {
    const genesis = new Block(null, [], 0, 0n); 
    this.chain = [genesis]; 
    this.pending_transactions = [];
    this.difficulty = difficulty; 
    this.reward = reward;
  }

  add_transaction(tx) {
    assert(tx instanceof Transaction); 
    this.pending_transactions.push(tx); 
  }

  mint(value, keypair, genesis = false) { 
    // adds initial balance to wallets. Only for testing. 
    assert(typeof value === "bigint"); 
    assert(keypair instanceof EccKeyPair); 
    const new_utxo = new TransactionOutput(keypair.public, value);  
    let tx = new Transaction([], [new_utxo]); 
    if (genesis) {
      // force transaction to genesis block
      this.chain[0].txs.push(tx);  
      // then add a pointer from the receiver wallet to this txo for tracking
      tx.outputs[0].address.txos.push(tx.outputs[0]);
    }
    else {
      this.add_transaction(tx);
    }
  }

  receive_block(block, miner) { 
    assert(block instanceof Block);
    assert(miner instanceof Miner);
    if (block.id.toBigInt() < block.difficulty.toBigInt()) {
      this.accept_block(block, miner);
    }
    else {
      console.log("Does not satisfy proof of work. ");
    }
  }
  
  accept_block(block, miner) { 
    /**
    * @param {Block} block 
    * @param {Miner} miner
    */
    // update the transactions in the block 
    for (let tx of block.txs) {
      for (let txi of tx.inputs) {
        // update so that previous utxos are marked spent 
        txi.prev_txo.spent = true; 
      }
      for (let txo of tx.outputs) {
        // add the utxos to the respective wallets of the receivers
        txo.address.txos.push(txo); 
      }
    }

    // delete pending transactions 
    let i; // new pending transaction start index
    for (i = 0; i < this.pending_transactions.length; i++) {
      // compare the last transaction in block with the pending transactions
      if (this.pending_transactions[i] == block.txs[block.txs.length-1]) {
        i += 1; 
        break
      }
    }

    this.pending_transactions = this.pending_transactions.slice(i); 

    // reward the owner of the miner with coins sent in THIS block
    const reward_txo = new TransactionOutput(miner.owner_pubkey, this.reward); 
    let reward_tx = new Transaction([], [reward_txo]); 
    block.txs.push(reward_tx); 
    // this is now in the block, but it should be updated in the utxo list in wallet 
    miner.owner_pubkey.txos.push(reward_txo); 

    this.chain.push(block);  
  }
}
