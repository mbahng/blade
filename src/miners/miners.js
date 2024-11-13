import { PublicEccKey } from "../keys/ecc.js"; 
import { Block, BlockChain } from "../block/block.js";
import { sha256 } from "../utils/hash.js";

export class Miner {
  constructor(owner_pubkey, blockchain) {
    /**
    * @param {PublicEccKey} owner_pubkey 
    * @param {BlockChain} blockchain
    */
    this.owner_pubkey = owner_pubkey; 
    this.blockchain = blockchain;
    this.nonce = 0n;
    this.isRunning = false;
    this.signal_next = false; 
  }

  compute_hash(block, nonce) {
    /**
    * @param {Block}  block 
    * @param {BigInt} nonce 
    */
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

  construct_candidate_block() {
    /**
    * @returns {Block} 
    */
    let last_block = this.blockchain.chain[this.blockchain.chain.length - 1];
    let new_block = new Block(last_block.id, this.blockchain.pending_transactions, last_block.height+1, 0n, this.blockchain.difficulty);
    return new_block; 
  }

  start(verbose = true) {
    // Start continuous mining process
    if (this.isRunning) return;
    this.isRunning = true;
    this.continuousMine(verbose);
  }

  stop() {
    // Stop mining process
    this.isRunning = false;
  }

  async continuousMine(verbose) {
    while (this.isRunning) {
      try {
        let candidate_block = this.construct_candidate_block();
        let candidate_id;

        do {
          // Check if we should stop or restart with new transactions
          if (!this.isRunning) return;
          
          candidate_id = this.compute_hash(candidate_block, this.nonce);
          this.nonce += 1n;

          // Every 1000 attempts, yield to event loop and check for new transactions
          if (this.nonce % 1000n === 0n) {
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // If new transactions arrived, restart mining with new block
            if (candidate_block.txs.length !== this.blockchain.pending_transactions.length) {
              candidate_block = this.construct_candidate_block();
            }
          }
          
          // check for if the blockchain singaled to go to the next block
          if (this.signal_next) {
            candidate_block = this.construct_candidate_block(); 
          }
        } while (candidate_id.toBigInt() >= candidate_block.difficulty.toBigInt());

        if (verbose) {
          console.log(
            `${this.owner_pubkey.K.stream.slice(0, 5)}...${this.owner_pubkey.K.stream.slice(-5)} \
            mined block #${candidate_block.height} with nonce ${this.nonce - 1n}.`
          );
        }
        
        candidate_block.update_id(candidate_id);
        candidate_block.nonce = this.nonce - 1n;
        this.nonce = 0n;

        // Submit the mined block
        this.blockchain.receive_block(candidate_block, this); 
        
        // tell other nodes in network that this block is mined 
        
        // Small delay before starting next block
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Mining error:', error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}
