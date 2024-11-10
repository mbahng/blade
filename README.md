# 🍃 Blade

Blade is a lightweight Blockchain and encryption library for my personal use. Here is a quick demo. 
```
import { BlockChain } from "./block/block.js";
import { Wallet } from "./keys/wallet.js";
import { Miner } from "./miners/miners.js";

// Construct chain, two wallets and respective miners
let chain = new BlockChain(); 
let M = Wallet.random(); 
let S = Wallet.random();  
let M_miner = new Miner(M.master_keypair.public, chain); 
let S_miner = new Miner(S.master_keypair.public, chain); 

// balance should be 0 
console.log(M.balance());
console.log(S.balance());

// M miner mines the first block to get coins
chain.receive_block(M_miner.mine(), M_miner);

// S miner mines the second block to get coins
chain.receive_block(S_miner.mine(), S_miner);

// Each should have 625 coins
console.log(M.balance());
console.log(S.balance());

// make some dummy transactions 
let tx1 = M.send(S.master_keypair.public, 20n); 
let tx2 = S.send(M.master_keypair.public, 50n);
chain.add_transaction(tx1);
chain.add_transaction(tx2);

// M mines 3rd block, getting 625 more coins plus net 30 coins from prev tx
chain.receive_block(M_miner.mine(), M_miner);
console.log(M.balance());
console.log(S.balance());

let tx3 = M.send(S.master_keypair.public, 30n); 
let tx4 = S.send(M.master_keypair.public, 50n); 
chain.add_transaction(tx3);
chain.add_transaction(tx4);

// M mines 4th block, getting 625 more coins plus net 20 coins from prev tx
chain.receive_block(M_miner.mine(), M_miner);
console.log(M.balance());
console.log(S.balance());
```

We can print out the whole chain as well. 
```
// Whole chain has 5 blocks (1 genesis block + 4 more blocks)
console.log(chain); 

BlockChain {
  chain: [
    Block {
      version: [Hex],
      height: 0,
      prev_block_hash: null,
      txs: [],
      timestamp: 1731262635601,
      merkletree: [MerkleNode],
      difficulty: [Hex],
      nonce: 0n,
      id: [Hex]
    },
    Block {
      version: [Hex],
      height: 1,
      prev_block_hash: [Hex],
      txs: [Array],
      timestamp: 1731262635629,
      merkletree: [MerkleNode],
      difficulty: [Hex],
      nonce: 1412n,
      id: [Hex]
    },
    Block {
      version: [Hex],
      height: 2,
      prev_block_hash: [Hex],
      txs: [Array],
      timestamp: 1731262635631,
      merkletree: [MerkleNode],
      difficulty: [Hex],
      nonce: 820n,
      id: [Hex]
    },
    Block {
      version: [Hex],
      height: 3,
      prev_block_hash: [Hex],
      txs: [Array],
      timestamp: 1731262635633,
      merkletree: [MerkleNode],
      difficulty: [Hex],
      nonce: 770n,
      id: [Hex]
    },
    Block {
      version: [Hex],
      height: 4,
      prev_block_hash: [Hex],
      txs: [Array],
      timestamp: 1731262635634,
      merkletree: [MerkleNode],
      difficulty: [Hex],
      nonce: 1273n,
      id: [Hex]
    }
  ],
  pending_transactions: []
}

```
