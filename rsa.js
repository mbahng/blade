import { expmod } from "./hash.js"; 
import { generatePrime } from "./primes.js";
import { Stream, Hex, dec_to_hex } from "./bytestream.js";
import assert from "assert/strict";

class PublicKey {
  // Public key class. Should not be instantiated directly. 
  
  constructor(number, k) {

    this.n = new Hex(dec_to_hex(String(number)));
    this.k = new Hex(dec_to_hex(String(k)));

    // big ints
    this.n_ = BigInt(number);
    this.k_ = BigInt(k);
  }

  map(message) { // must be of type Stream 
    let dec_encoded = String(expmod(message.toBigInt(), this.k_, this.n_));
    // let dec_encoded = String(message.toBigInt());
    let hex_encoded = dec_to_hex(dec_encoded);
    return Stream.fromHex(hex_encoded);
  }
} 

class PrivateKey {
  // Private key class. Should not be instantiated directly. 

  constructor(p, q, k) {

    this.p = new Hex(dec_to_hex(String(p))); 
    this.q = new Hex(dec_to_hex(String(q))); 
    this.k = new Hex(dec_to_hex(String(k))); 

    // just big ints
    this.p_ = BigInt(p); 
    this.q_ = BigInt(q); 
    this.k_ = BigInt(k); 
    this.n_ = this.p_ * this.q_; 
  }

  map(message) {
    // Decrypt message 
    // first calculate the secret recovery exponent j
    // from the equation kj \equiv 1 mod \varphi(n)
    // -> diophantine eq: kx + phi y = 1
  
    const phi = (this.p_ - 1n) * (this.q_ - 1n) // totient function  

    function modInverse(a, m) {
      function egcd(a, b) {
        if (a === 0n) return [b, 0n, 1n];
        const [g, x, y] = egcd(b % a, a);
        return [g, y - (b / a) * x, x];
      }
      
      a = ((a % m) + m) % m;
      const [g, x, _] = egcd(a, m);
      if (g !== 1n) {
        throw new Error('Modular multiplicative inverse does not exist');
      }
      return ((x % m) + m) % m;
    }
    
    // Calculate private exponent d (previously called j)
    const d = modInverse(this.k_, phi);
    
    // Verify that k * d ≡ 1 (mod φ(n))
    assert((this.k_ * d) % phi === 1n, "Invalid key pair: k * d ≢ 1 (mod φ(n))");

    // use recovery exponent to get original message 
    const recovered = String(expmod(message.toBigInt(), d, this.n_)); 
    const hex_encoded = dec_to_hex(recovered);
    return Stream.fromHex(hex_encoded);

  }
}

export class Key {
  constructor() { 
    const p = generatePrime(128); 
    const q = generatePrime(128); 
    const k = 65537n; 
    const n = p * q; 
    this.public = new PublicKey(n, k); 
    this.private = new PrivateKey(p, q, k);
  }
}

