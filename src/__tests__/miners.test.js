import { Miner } from "../miners/miners.js";
import { BlockChain, Block } from "../block/block.js";
import { secp256k1 } from "../keys/ecc.js";
import { Hex } from "../utils/bytestream.js";
import { Transaction } from "../transactions/transactions.js";
import { Wallet } from "../keys/wallet.js";

describe("Miner", () => {
  let miner;
  let blockchain;
  let minerKeypair;

  beforeEach(() => {
    blockchain = new BlockChain(new Hex("FF"), 50n); // Easy difficulty for testing
    minerKeypair = secp256k1(false);
    miner = new Miner(minerKeypair.public, blockchain);
  });

  describe("Initialization", () => {
    test("initializes with correct values", () => {
      expect(miner.owner_pubkey).toBe(minerKeypair.public);
      expect(miner.blockchain).toBe(blockchain);
      expect(miner.nonce.toString()).toBe("0");
      expect(miner.isRunning).toBe(false);
    });
  });

  describe("Hash Computation", () => {
    test("computes block hash correctly", () => {
      const block = new Block(
        new Hex("00"),
        [],
        1,
        0n,
        new Hex("FF")
      );
      const hash = miner.compute_hash(block, 0n);
      expect(hash).toBeInstanceOf(Hex);
      expect(hash.length).toBe(256); // SHA-256 hash length
    });

    test("different nonces produce different hashes", () => {
      const block = new Block(
        new Hex("00"),
        [],
        1,
        0n,
        new Hex("FF")
      );
      const hash1 = miner.compute_hash(block, 0n);
      const hash2 = miner.compute_hash(block, 1n);
      expect(hash1.toString()).not.toBe(hash2.toString());
    });
  });

  describe("Block Construction", () => {
    test("constructs candidate block with correct height", () => {
      const candidateBlock = miner.construct_candidate_block();
      expect(candidateBlock.height).toBe(1); // One more than genesis block
    });

    test("includes pending transactions", () => {
      const tx = new Transaction([], []);
      blockchain.add_transaction(tx);
      const candidateBlock = miner.construct_candidate_block();
      expect(candidateBlock.txs).toContain(tx);
    });

    test("links to previous block", () => {
      const candidateBlock = miner.construct_candidate_block();
      expect(candidateBlock.prev_block_hash.toString())
        .toBe(blockchain.chain[0].id.toString());
    });
  });

  describe("Mining Control", () => {
    test("starts mining process", () => {
      miner.start(false);
      expect(miner.isRunning).toBe(true);
      miner.stop(); // Cleanup
    });

    test("stops mining process", () => {
      miner.start(false);
      miner.stop();
      expect(miner.isRunning).toBe(false);
    });

    test("doesn't start multiple mining processes", () => {
      miner.start(false);
      const isRunningBefore = miner.isRunning;
      miner.start(false);
      expect(isRunningBefore).toBe(miner.isRunning);
      miner.stop(); // Cleanup
    });
  });

  describe("Mining Process", () => {
    test("maintains correct balance equality after transactions for 1 miner", async () => {
      // Set up test environment with controlled difficulty
      const difficulty = new Hex("0001000000000003A30C00000000000000000000000000000000000000000000");
      const reward = 10n;
      const blockchain = new BlockChain(difficulty, reward);
      
      // Create wallets
      const M = Wallet.random();
      const S = Wallet.random();
      
      // Set up miner
      const M_miner = new Miner(M.master_keypair.public, blockchain);
      blockchain.add_miner(M_miner);
      
      // Start mining with verbose = false to avoid logging in tests
      M_miner.start(false); 
      
      // Wait for first block to be mined
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create and add transaction
      const tx1 = M.send(S.master_keypair.public, 1n);
      
      // Check balance equality before adding transaction
      const beforeBalance = M.balance() + S.balance() + blockchain.pending_withheld();
      const beforeCirculation = 10n * BigInt(blockchain.chain.length - 1);
      expect(beforeBalance).toBe(beforeCirculation);
      
      // Add transaction
      blockchain.add_transaction(tx1);
      
      // Check balance equality after adding transaction
      const afterBalance = M.balance() + S.balance() + blockchain.pending_withheld();
      const afterCirculation = 10n * BigInt(blockchain.chain.length - 1);
      expect(afterBalance).toBe(afterCirculation);
      
      // Clean up
      M_miner.stop();
    }, 10000); // Increased timeout to allow for mining

    test("maintains correct balance equality after transactions for 2 miners", async () => {
      // Set up test environment with controlled difficulty
      const difficulty = new Hex("0001000000000003A30C00000000000000000000000000000000000000000000");
      const reward = 10n;
      const blockchain = new BlockChain(difficulty, reward);
      
      // Create wallets
      const M = Wallet.random();
      const S = Wallet.random();
      
      // Set up miner
      const M_miner = new Miner(M.master_keypair.public, blockchain); 
      const S_miner = new Miner(S.master_keypair.public, blockchain); 
      blockchain.add_miner(M_miner);
      blockchain.add_miner(S_miner);
      
      // Start mining with verbose = false to avoid logging in tests
      M_miner.start(false); 
      S_miner.start(false); 
      
      // Wait for first block to be mined
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create and add transaction
      const tx1 = M.send(S.master_keypair.public, 1n);
      const tx2 = S.send(M.master_keypair.public, 2n); 
      
      // Check balance equality before adding transaction
      const beforeBalance = M.balance() + S.balance() + blockchain.pending_withheld();
      const beforeCirculation = 10n * BigInt(blockchain.chain.length - 1);
      expect(beforeBalance).toBe(beforeCirculation);
      
      // Add transaction
      blockchain.add_transaction(tx1);
      
      // Check balance equality after adding transaction
      const afterBalance = M.balance() + S.balance() + blockchain.pending_withheld();
      const afterCirculation = 10n * BigInt(blockchain.chain.length - 1);
      expect(afterBalance).toBe(afterCirculation);
      
      // Clean up
      M_miner.stop();
    }, 10000); // Increased timeout to allow for mining

    test("transaction marked as spent correctly", async () => {
      const difficulty = new Hex("0001000000000003A30C00000000000000000000000000000000000000000000");
      const reward = 10n;
      const blockchain = new BlockChain(difficulty, reward);
      
      const M = Wallet.random();
      const S = Wallet.random();
      const M_miner = new Miner(M.master_keypair.public, blockchain);
      blockchain.add_miner(M_miner);
      
      M_miner.start(false);
      
      // Wait for first block to be mined
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const tx = M.send(S.master_keypair.public, 1n); 

      // at this point, the tx should not be affected since we only 
      // create a transaction but do not submit it
      for (let txi of tx.inputs) {
        expect(txi.prev_txo.spent).toBe(false); 
      }
     
      // once we add it to the blockchain, then the paid money is only removed 
      // and the money is received upon the next block add 
      blockchain.add_transaction(tx);
      for (let txi of tx.inputs) {
        expect(txi.prev_txo.spent).toBe(true); 
      }
      
      // Clean up
      M_miner.stop();
    }, 10000);
  });
});
