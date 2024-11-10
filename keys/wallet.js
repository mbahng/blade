import assert from "assert/strict"; 
import { EccKeyPair, secp256k1 } from "./ecc.js";

export class Wallet {
  constructor(master_keypair) {
    assert(master_keypair instanceof EccKeyPair); 
    this.master_keypair = master_keypair; 
    this.all_keypairs = [master_keypair];
  }

  static random() {
    return new Wallet(secp256k1(true)); 
  }

  balance() {
    let balance = 0n; 
    for (let keypair of this.all_keypairs) {
      // first iterate through all keys 
      for (let txo of keypair.txos()) {
        // for each key, go through all transaction outputs
        if (!txo.spend) { // if it is not spent 
          balance += txo.value;
        }
      }
    }
    return balance;
  }
}


