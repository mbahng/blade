import { Bin, Hex, Stream } from "./bytestream.js";
import crypto from "crypto"; 

export function expmod(base, exponent, modulus) {
  /**
  * @param {Hex | BigInt} base 
  * @param {Hex | BigInt} exponent 
  * @param {Hex | BigInt} modulus
  */

  base = (base instanceof Hex) ? base.toBigInt() : base; 
  exponent = (exponent instanceof Hex) ? exponent.toBigInt() : exponent; 
  modulus = (modulus instanceof Hex) ? modulus.toBigInt() : modulus; 

  // some edge case checking 
  if (modulus === 1n) return 0n; 
  if (exponent < 0n) throw new Error("Exponent must be non-negative");
  base = base % modulus;
  if (base === 0n) return 0n;
  if (exponent === 0n) return 1n;
  
  let result = 1n;
  while (exponent > 0n) {
    if (exponent & 1n) {
      result = (result * base) % modulus;
    }
    base = (base * base) % modulus;
    exponent = exponent >> 1n;
  }
  return result;
}

function sha256_string(stream) {
  return new Hex(crypto.createHash("sha256").update(stream).digest('hex'));
}

function sha256_hex(stream) {
  return new Hex(crypto.createHash("sha256").update(stream.stream).digest('hex'));
}

function sha256_bin(stream) {
  return new Hex(crypto.createHash("sha256").update(stream.stream).digest('hex'));
}

export function sha256(stream) {
  /**
  * @param {Bin|Hex|Stream|string} stream 
  */
  if (stream instanceof Bin) {
    return sha256_bin(stream);
  }
  else if (stream instanceof Hex) {
    return sha256_hex(stream); 
  }
  else if (stream instanceof Stream) {
    return sha256_string(stream.stream); 
  }
  else if (typeof stream == "string") {
    return sha256_string(stream); 
  }
  else {
    throw Error("Not a valid input type.");
  }
}

function hmac_sha512_hex(stream, c) {
  /**
  * @param {Hex} stream
  * @param {Hex} c 
  */
  return new Hex(crypto.createHmac("sha512", Buffer.from(c.stream, "base64")).update(stream.stream).digest('hex'));
}

export function hmac_sha512(stream, c) {
  if (stream instanceof Hex && c instanceof Hex) {
    return hmac_sha512_hex(stream, c);
  }
  else {
    throw Error("Not a valid input type.");
  }
}
