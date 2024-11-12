import assert from "assert/strict"; 
import { EccKeyPair, secp256k1, PublicEccKey } from "./ecc.js";
import { TransactionOutput, Transaction } from "../transactions/transactions.js";

export class Wallet {
  constructor(master_keypair) {
    /**
    * A hierarchical wallet with a master ECC keypair 
    * @constructor 
    * @param {EccKeyPair} master_keypair
    */
    assert(master_keypair instanceof EccKeyPair); 
    this.master_keypair = master_keypair; 
  }

  static random() {
    return new Wallet(secp256k1(true)); 
  }

  txos() {
    let res = []; 
    function recursive_txos(keypair) {
      res.push(...(keypair.txos())); 
      if (keypair.public.children.size !== 0) {
        for (child_kp of keypair.public.children) {
          recursive_txos(child_kp);
        }
      }
    }
    recursive_txos(this.master_keypair);
    return res; 
  }

  balance() {
    let balance = 0n; 
    for (let txo of this.txos()) { 
      if (!txo.spent) {
        balance += txo.value; 
      }
    }
    return balance;
  }

  send(receiver_key, value) {
    /**
    * Generates a transaction to be pushed onto the blockchain. 
    * send to Public Key to preserve anonymity 
    * @constructor 
    * @param {PublicEccKey} receiver_key - should be specific address, not a wallet 
    * @param {BigInt} value   -- number of satoshis to send  
    * @returns {Transaction} - the transaction object representing the sending  
    */

    // scan txos from first time to last time on blockchain to accumulate txi 
    let accum = 0n;  
    let txi_list = []; 
    for (let txo of this.txos()) {
      if (accum >= value) { break; }
      if (!txo.spent) {
        accum += txo.value; 
        // convert txo to txi and then push
        txi_list.push(txo.convert_to_txi());
      }
      // do not update txo.spent variable here until it is added to blockchain
    }

    if (accum < value) {
      throw Error(`Transaction Failed. Current Balance ${accum} not enough for ${value}.`)
    }
    
    // Create the txos 
    let txo_list = []; 
    let receiver_txo = new TransactionOutput(receiver_key, value); 
    txo_list.push(receiver_txo);
    
    if (accum - value > 0n) {
      // if there's leftover, then make new utxo for sender 
      let spender_txo = new TransactionOutput(this.master_keypair.public, accum - value); 
      txo_list.push(spender_txo);
    }

    let tx = new Transaction(txi_list, txo_list); 
    return tx; 
  }
}


