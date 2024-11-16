import { Block, BlockChain } from "../src/blockchain/block.js";
import { Hex } from "../src/utils/bytestream.js";
import { Transaction, TransactionOutput } from "../src/transactions/transactions.js";
import { Miner } from "../src/miners/miners.js";
import { secp256k1 } from "../src/keys/ecc.js";

describe("MerkleNode and Tree", () => {
  test("creates merkle tree for empty transaction list", () => {
    const block = new Block(new Hex("0"), [], 0, 0n, new Hex("FF"));
    expect(block.merkletree.value.toString()).toBe("0");
  });

  test("creates merkle tree for single transaction", () => {
    const tx = new Transaction([], []);
    const block = new Block(new Hex("0"), [tx], 0, 0n, new Hex("FF"));
    expect(block.merkletree.value).toBeDefined();
    expect(block.merkletree.left).toBeNull();
    expect(block.merkletree.right).toBeNull();
  });

  test("creates merkle tree for multiple transactions", () => {
    const tx1 = new Transaction([], []);
    const tx2 = new Transaction([], []);
    const block = new Block(new Hex("0"), [tx1, tx2], 0, 0n, new Hex("FF"));
    expect(block.merkletree.left).toBeDefined();
    expect(block.merkletree.right).toBeDefined();
  });
});

describe("Block", () => {
  let block;
  
  beforeEach(() => {
    block = new Block(
      new Hex("0"), // prev_block_hash
      [],           // transactions
      0,            // height
      0n,           // nonce
      new Hex("FF") // difficulty
    );
  });

  test("initializes with correct values", () => {
    expect(block.version.toString()).toBe("0");
    expect(block.height).toBe(0);
    expect(block.prev_block_hash.toString()).toBe("0");
    expect(block.txs).toHaveLength(0);
    expect(block.nonce.toString()).toBe("0");
    expect(block.difficulty.toString()).toBe("FF");
  });

  test("genesis block has id of 0", () => {
    const genesisBlock = new Block(null, [], 0, 0n, new Hex("FF"));
    expect(genesisBlock.id.toString()).toBe("0");
  });

  test("updates block id", () => {
    const newId = new Hex("0A");
    block.update_id(newId);
    expect(block.id.toString()).toBe("0A");
  });
});

describe("BlockChain", () => {
  let blockchain;
  let minerKeypair;
  let miner;
  
  beforeEach(() => {
    blockchain = new BlockChain(new Hex("FF"), 50n);
    minerKeypair = secp256k1(false);
    miner = new Miner(minerKeypair.public, blockchain);
  });

  test("initializes with genesis block", () => {
    expect(blockchain.chain).toHaveLength(1);
    expect(blockchain.chain[0].height).toBe(0);
    expect(blockchain.chain[0].prev_block_hash).toBeNull();
  });

  test("adds transaction to pending", () => {
    const tx = new Transaction([], []);
    blockchain.add_transaction(tx);
    expect(blockchain.pending_transactions).toHaveLength(1);
    expect(blockchain.pending_transactions[0]).toBe(tx);
  });

  describe("Minting", () => {
    test("mints coins in genesis block", () => {
      const keypair = secp256k1(false);
      blockchain.mint(100n, keypair, true);
      
      expect(blockchain.chain[0].txs).toHaveLength(1);
      expect(blockchain.chain[0].txs[0].outputs[0].value.toString()).toBe("100");
    });

    test("mints coins in pending transactions", () => {
      const keypair = secp256k1(false);
      blockchain.mint(100n, keypair, false);
      
      expect(blockchain.pending_transactions).toHaveLength(1);
      expect(blockchain.pending_transactions[0].outputs[0].value.toString()).toBe("100");
    });
  });

  describe("Block Reception and Acceptance", () => {
    let validBlock;
    let walletKeypair;

    beforeEach(() => {
      walletKeypair = secp256k1(false);
      validBlock = new Block(
        blockchain.chain[0].id,
        [],
        1,
        0n,
        new Hex("FF")
      );
      validBlock.update_id(new Hex("0")); // Valid ID less than difficulty
    });

    test("accepts valid block", () => {
      blockchain.receive_block(validBlock, miner);
      expect(blockchain.chain).toHaveLength(2);
      expect(blockchain.chain[1]).toBe(validBlock);
    });

    test("adds mining reward to block", () => {
      blockchain.receive_block(validBlock, miner);
      const rewardTx = validBlock.txs[validBlock.txs.length - 1];
      expect(rewardTx.outputs[0].value.toString()).toBe(blockchain.reward.toString());
      expect(rewardTx.outputs[0].address).toBe(miner.owner_pubkey);
    });

    test("updates UTXO spent status", () => {
      // Create a transaction with inputs
      const inputTxo = new TransactionOutput(walletKeypair.public, 100n);
      const tx = new Transaction([inputTxo.convert_to_txi()], []);
      
      blockchain.add_transaction(tx);
      expect(inputTxo.spent).toBe(true);
    });

    test("updates wallet UTXO list", () => {
      const recipientKeypair = secp256k1(false);
      const tx = new Transaction([], [new TransactionOutput(recipientKeypair.public, 100n)]);
      validBlock.txs.push(tx);
      
      blockchain.receive_block(validBlock, miner);
      expect(recipientKeypair.public.txos).toContain(tx.outputs[0]);
    });
  });
});
