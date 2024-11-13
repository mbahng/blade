import { Stream, Hex, dec_to_hex } from "../utils/bytestream.js";
import { generatePrime } from "../utils/primes.js";
import { expmod } from "../utils/hash.js"; 
import assert from "assert/strict";

class PublicRsaKey {
  // Public key class. Should not be instantiated directly. 
  constructor(number, k) {
    /**
    * @constructs 
    * @param {BigInt} number
    * @param {BigInt} k
    */

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

class PrivateRsaKey {
  // Private key class. Should not be instantiated directly. 

  constructor(p, q, k) {
    /**
    * @constructs 
    * @param {BigInt} p 
    * @param {BigInt} q
    * @param {BigInt} k
    */
    this.p = new Hex(dec_to_hex(String(p))); 
    this.q = new Hex(dec_to_hex(String(q))); 
    this.k = new Hex(dec_to_hex(String(k))); 

    // just big ints
    this.p_ = p; 
    this.q_ = q; 
    this.k_ = k; 
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

export class RsaKeyPair {
  constructor(bitlen) { 
    /**
    * @constructs 
    * @param {number} bitlen
    */
    assert(bitlen % 8 == 0); 
    const p = generatePrime(bitlen/2); 
    const q = generatePrime(bitlen/2); 
    const k = 65537n; 
    const n = p * q; 
    this.public = new PublicRsaKey(n, k); 
    this.private = new PrivateRsaKey(p, q, k);
  }
}

