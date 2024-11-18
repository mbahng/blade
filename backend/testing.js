import { Hex } from "./src/crypt/bytestream.js";
import { BlockChain } from "./src/blockchain/block.js";
import { Miner } from "./src/blockchain/miners.js";
import { BtcWallet } from "./src/wallet/wallet.js";
import { EccKeyPair, secp256k1 } from "./src/crypt/ecc.js"; 

async function one() {
  const difficulty = new Hex("0001000000000003A30C00000000000000000000000000000000000000000000");  
  const reward = 10n;

  const blockchain = new BlockChain(difficulty, reward);
  const M = BtcWallet.random();
  const S = BtcWallet.random();
  const M_miner = new Miner(M.master_keypair.public, blockchain); 
  const S_miner = new Miner(S.master_keypair.public, blockchain); 
  blockchain.add_miner(M_miner);
  blockchain.add_miner(S_miner);

  M_miner.start();
  S_miner.start();

  // give some time to accumulate money thru mining first few blocks 
  await new Promise(resolve => setTimeout(resolve, 2000)); 

  setInterval(() => {
    let tx1 = M.send(S.master_keypair.public, 1n); 
    let tx2 = S.send(M.master_keypair.public, 2n); 
    console.log(`M + S + P = ${M.balance() + S.balance() + blockchain.pending_withheld()} = ${10 * (blockchain.chain.length - 1)} = circulation`);
    blockchain.add_transaction(tx1); 
    blockchain.add_transaction(tx2); 
    console.log(`M + S + P = ${M.balance() + S.balance() + blockchain.pending_withheld()} = ${10 * (blockchain.chain.length - 1)} = circulation`);
  }, 1000);
}

let kp = secp256k1(true);
for (let i = 0; i < 100; i++) {
  kp.ckd(); 
}
console.log(kp.children); 
console.log(kp.children.length); 

