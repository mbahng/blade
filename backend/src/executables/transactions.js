import { PublicEccKey } from "../crypt/ecc.js";
import { sha256 } from "../crypt/hash.js";

export class BtcTransactionInput {
  // containers that track the money one spends. 
  // Used for Bitcoin protocol
  constructor(address, value, prev_txo) { 
    /**
    * @param {PublicEccKey} address 
    * @param {BigInt} value 
    * @param {BtcTransactionOutput} prev_txo
    */
    this.address = address;   // address of spender 
    this.value = value; // amount in satoshis
    this.prev_txo = prev_txo; // previous transaction output
    this.tx;
  }
}

export class BtcTransactionOutput { 
  // Used for Bitcoin protocol
  // containers that track the money one gains. 
  // Used for Bitcoin protocol
  constructor(address, value) {
    /**
    * @param {PublicEccKey} address 
    * @param {BigInt} value
    */
    this.address = address; // address of receiver, pubkey
    this.value = value;     // amount in satoshis
    this.spent = false;     // is this spent on a future transaction? 
    this.spender = null;    // if so, who is the spender? 
    this.tx; 
  }

  convert_to_txi() {
    if (this.tx === null) {
      throw Error("This tx is null. ")
    }
    let txi = new BtcTransactionInput(this.address, this.value, this);
    return txi; 
  }
}

export class BtcTransaction {
  constructor(inputs, outputs) {
    /**
    * @param {BtcTransactionInput[]} inputs 
    * @param {BtcTransactionOutput[]} outputs
    */
    for (let input_tx of inputs) {
      input_tx.tx = this; 
    }
    for (let output_tx of outputs) {
      output_tx.tx = this; 
    }
    this.inputs = inputs; 
    this.outputs = outputs; 
    this.id = this.calc_id();
    this.timestamp = Date.now(); 
  }

  calc_id() {
    // calculates the id of transaction by taking the data 
    // and hashing it 
    let data = "";
    for (let input_tx of this.inputs) { data += input_tx.address.stream; } 
    for (let output_tx of this.outputs) {data += output_tx.value.toString(); } 
    return sha256(data);
  }
}

export class EthTransaction {

}

export class EthTransferTransaction extends EthTransaction {

}

export class EthContractTransaction extends EthTransaction {

}

