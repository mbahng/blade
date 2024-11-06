import { Bin, Hex, hex_to_bin } from "./bytestream.js";
import crypto from "crypto"; 

export function expmod(base, exponent, modulus) {
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
  return new Hex(crypto.createHash("sha256").update(hex_to_bin(stream.stream)).digest('hex'));
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


