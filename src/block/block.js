import assert from "assert/strict";
import { Hex } from "../utils/bytestream.js";
import { Transaction, TransactionOutput } from "../transactions/transactions.js";
import { sha256 } from "../utils/hash.js";
import { EccKeyPair } from "../keys/ecc.js"; 
import { Miner } from "../miners/miners.js";

export class MerkleNode {
  constructor(value, left = null, right = null) {
    /**
    * @constructs 
    * @param {Hex} value 
    * @param {MerkleNode | null} left
    * @param {MerkleNode | null} right 
    */
    this.value = value; 
    this.left = left; 
    this.right = right; 
  }
}

export class Block {
  constructor(prev_block_hash, transactions, height, nonce, difficulty) {
    /**
    * @constructs  
    * @param {Hex | null} prev_block_hash  
    * @param {Transaction[]} transactions 
    * @param {number} height 
    * @param {BigInt} nonce 
    * @param {Hex} difficulty
    */
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
    /**
    * create a Merkle tree used for SPV nodes 
    * @returns {MerkleNode} 
    */
    if (this.txs.length === 0) {
      return new MerkleNode(new Hex("0"));
    }

    // Create leaf nodes from transaction hashes
    let leaves = this.txs.map(tx => new MerkleNode(tx.id));
    return this.build_tree_level(leaves);
  }

  build_tree_level(nodes) { 
    /**
    * @param {MerkleNode[]} nodes 
    * @returns {MerkleNode}
    */
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
    /**
    * @param {Hex} id 
    */
    assert(id.toBigInt() < this.difficulty.toBigInt()); 
    this.id = id; 
  } 
}

export class BlockChain {
  constructor(difficulty, reward) {
    /**
    * @constructs  
    * @param {Hex} difficulty  
    * @param {BigInt} reward
    */
    const genesis = new Block(null, [], 0, 0n); 
    this.chain = [genesis]; 
    this.pending_transactions = [];
    this.difficulty = difficulty; 
    this.reward = reward;
    this.miners = []
  }

  add_miner(miner) {
    /**
    * @param {Miner} miner
    */
    this.miners.push(miner);
  }

  signal_next(from) {
    /**
    * @param {Miner} from 
    */
    for (let miner of this.miners) {
      if (miner != from) {
        miner.signal_next = true; 
      }
    }
  }
  
  add_transaction(tx) {
    /**
    * @param {Transaction} tx 
    */ 
    
    // Now update the spent variables in txos
    // For each txi, takes it source txo and update it to spent 
    for (let txi of tx.inputs) {
      txi.prev_txo.spent = true; 
    }
    // For the txos, do not add pointers to them from the destination wallets 
    // yet. This should be done after the block has been accepted. 
    
    this.pending_transactions.push(tx); 
  }

  pending_withheld() { 
    let res = 0n; 
    for (let tx of this.pending_transactions) {
      for (let txi of tx.inputs) {
        res += txi.value; 
      }
    }
    return res; 
  }

  mint(value, keypair, genesis = false) { 
    /**
    * adds initial balance to wallets. Only for testing.  
    * @param {BigInt} value 
    * @param {EccKeyPair} keypair
    * @param {Boolean} genesis - determines whether we put tx in genesis
    * block from the beginning or in pending transactions to be added later
    */
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
    /**
    * generic receive function for getting block 
    * @param {Block} block 
    * @param {Miner} miner
    */
    if (block.id.toBigInt() < block.difficulty.toBigInt()) {
      this.accept_block(block, miner);
    }
    else {
      console.log("Does not satisfy proof of work. ");
    }
  }
  
  accept_block(block, miner) { 
    /**
    * function is called in this.receive_block() if it satisfies proof-of-work
    * @param {Block} block 
    * @param {Miner} miner
    */
    // update the transactions in the block 
    for (let tx of block.txs) {
      // now we add the utxos to the respective wallets of the receivers
      for (let utxo of tx.outputs) {
        utxo.address.txos.push(utxo); 
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
