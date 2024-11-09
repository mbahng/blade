import { Bin, Hex, hex_to_bin } from "./bytestream.js";
import crypto from "crypto"; 
import assert from "assert/strict"; 

export function expmod(base, exponent, modulus) {

  assert(base instanceof Hex || typeof(base) == "bigint"); 
  assert(exponent instanceof Hex || typeof(exponent) == "bigint"); 
  assert(exponent instanceof Hex || typeof(exponent) == "bigint"); 

  if (base instanceof Hex) {
    base = base.toBigInt(); 
  }
  if (exponent instanceof Hex) {
    exponent = exponent.toBigInt(); 
  }
  if (base instanceof Hex) {
    modulus = modulus.toBigInt(); 
  }

  if (modulus === 1n) {
    return 0n;
  }
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

function sha256_hex(stream) {
  return new Hex(crypto.createHash("sha256").update(stream.stream).digest('hex'));
}

function sha256_bin(stream) {
  return new Hex(crypto.createHash("sha256").update(stream.stream).digest('hex'));
}

export function sha256(stream) {
  if (stream instanceof Bin) {
    return sha256_bin(stream);
  }
  else if (stream instanceof Hex) {
    return sha256_hex(stream); 
  }
  else {
    throw Error("Not a valid input type.");
  }
}

function hmac_sha512_hex(stream, c) {
  return new Hex(crypto.createHmac("sha512", Buffer.from(c.stream, "base64")).update(stream.stream).digest('hex'));
}

function hmac_sha512_bin(stream, c) {
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
