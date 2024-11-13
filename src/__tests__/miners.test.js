import { Miner } from "../miners/miners.js";
import { BlockChain, Block } from "../block/block.js";
import { secp256k1 } from "../keys/ecc.js";
import { Hex } from "../utils/bytestream.js";
import { Transaction } from "../transactions/transactions.js";

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
      miner.start();
      expect(miner.isRunning).toBe(true);
      miner.stop(); // Cleanup
    });

    test("stops mining process", () => {
      miner.start();
      miner.stop();
      expect(miner.isRunning).toBe(false);
    });

    test("doesn't start multiple mining processes", () => {
      miner.start();
      const isRunningBefore = miner.isRunning;
      miner.start();
      expect(isRunningBefore).toBe(miner.isRunning);
      miner.stop(); // Cleanup
    });
  });

  describe("Mining Process", () => {
    // test("mines block with valid proof of work", async () => {
    //   // Set very easy difficulty for quick testing
    //   blockchain.difficulty = new Hex("FFFF");
    //  
    //   miner.start();
    //  
    //   // Wait for at least one block to be mined
    //   await new Promise(resolve => {
    //     const checkInterval = setInterval(() => {
    //       if (blockchain.chain.length > 1) {
    //         clearInterval(checkInterval);
    //         resolve();
    //       }
    //     }, 100);
    //   });
    //
    //   miner.stop();
    //
    //   const minedBlock = blockchain.chain[1];
    //   expect(minedBlock.id.toBigInt()).toBeLessThan(minedBlock.difficulty.toBigInt());
    // }, 10000); // Longer timeout for mining

    // test("updates nonce during mining", async () => {
    //   const initialNonce = miner.nonce;
    //   miner.start();
    //  
    //   // Wait a bit and check if nonce changed
    //   await new Promise(resolve => setTimeout(resolve, 100));
    //  
    //   const newNonce = miner.nonce;
    //   miner.stop();
    //  
    //   expect(newNonce).not.toBe(initialNonce);
    // });
    //
    // test("restarts mining with new transactions", async () => {
    //   miner.start();
    //  
    //   // Add new transaction after mining starts
    //   await new Promise(resolve => setTimeout(resolve, 100));
    //   blockchain.add_transaction(new Transaction([], []));
    //  
    //   // Wait a bit to ensure mining process noticed new transaction
    //   await new Promise(resolve => setTimeout(resolve, 200));
    //  
    //   miner.stop();
    //  
    //   // Verify the mined block includes the new transaction
    //   // Note: This might be flaky if block is mined before new transaction is added
    //   if (blockchain.chain.length > 1) {
    //     expect(blockchain.chain[1].txs.length).toBeGreaterThan(0);
    //   }
    // });
  });

  // describe("Error Handling", () => {
  //   test("handles errors gracefully", async () => {
  //     // Mock compute_hash to throw error
  //     const originalComputeHash = miner.compute_hash;
  //     miner.compute_hash = jest.fn().mockImplementation(() => {
  //       throw new Error("Test error");
  //     });
  //
  //     const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  //    
  //     miner.start();
  //     await new Promise(resolve => setTimeout(resolve, 200));
  //     miner.stop();
  //
  //     expect(consoleSpy).toHaveBeenCalled();
  //    
  //     // Cleanup
  //     miner.compute_hash = originalComputeHash;
  //     consoleSpy.mockRestore();
  //   });
  // });
});
