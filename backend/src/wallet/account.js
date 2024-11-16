import { EccKeyPair, secp256k1 } from "../crypt/ecc.js";

export class EthereumAccount {
  constructor(address) {
    /**
    * address deterministically created from EOA's address and nonce
    * @construts  
    * @param {Hex} address
    */
    this.address = address;
    this.balance = 0n; 
    this.nonce = 0; 
  }
  
  incrementNonce() {
    this.nonce++; 
  }

  updateBalance(amount) {
    /**
    * @param {BigInt} amount
    */
    this.balance += amount;
  }
}

export class ExtOwnedAccount extends EthereumAccount {
  constructor(master_keypair) {
    /**
    * should have a master keypair
    * @contructs
    * @param {EccKeyPair} master_keypair 
    */
    this.master_keypair = master_keypair; 
    const address = master_keypair.public.K; 
    super(address); 
  }

  static random() {
    return new ExtOwnedAccount(secp256k1(true)); 
  }

  createTransaction() {

  }
}

export class ContractAccount extends EthereumAccount {
  constructor(address, code) {
    /**
    * @param {Hex} address 
    * @param {Stream} code
    */
    super(address); 
    this.code = code; 
  }
}
