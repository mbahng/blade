import assert from "assert/strict";

export function check_bin_integrity(string) {
  for (let i = 0; i < string.length; i++) {
    if (parseInt(string[i], 2) >= 2) {
      return false; 
    }
  }
  return true; 
}

export function check_dec_integrity(string) {
  for (let i = 0; i < string.length; i++) {
    if (parseInt(string[i], 10) >= 10) {
      return false; 
    }
  }
  return true; 
}

export function check_hex_integrity(string) {
  const validHex = /^[0-9A-Fa-f]+$/;
  return validHex.test(string);
}

export function hex_to_bin(hex) {
  if (!check_hex_integrity(hex)) {
    throw new Error("Not a hex. ");
  }

  let res = ""; 
  for (let i = 0; i < hex.length; i++) {
    res += parseInt(hex[i], 16).toString(2).padStart(4, '0');
  }
  return res; 
}

export function hex_to_dec(hex) {
  if (!check_hex_integrity(hex)) {
    throw new Error("Not a hex.");
  }
  return String(BigInt(`0x${hex}`));
}

export function dec_to_hex(dec) {
  let num = BigInt(dec);
  if (num === 0n) return "0";
  
  let hex = "";
  while (num > 0n) {
    const remainder = num % 16n;
    hex = "0123456789ABCDEF"[Number(remainder)] + hex;
    num = num / 16n;
  }
  return hex;
}

export function dec_to_bin(dec) {
  if (!check_dec_integrity(dec)) {
    throw new Error("Not a hex. ");
  }

  dec = BigInt(dec); 
  let res = ""; 

  while (dec > 0) {
    let remainder = dec % 2n;
    res += Number(remainder).toString(2); 
    dec = (dec - remainder) / 2n;
  }

  return res.split('').reverse().join('');
}

export function bin_to_hex(bin) {
  if (!check_bin_integrity(bin)) {
    throw new Error("Not a hex. ");
  }

  let res = "";

  // pad with 0s so that length is multiple of 4 
  if (bin.length % 4 != 0){
    bin = "0".repeat(4 - (bin.length % 4)) + bin; 
  }

  for (let i = 0; i < bin.length; i += 4) {
    res += parseInt(bin.slice(i, i+4), 2).toString(16); 
  }

  return res.toUpperCase();
}

export function bin_to_dec(bin) {
  if (!check_bin_integrity(bin)) {
    throw new Error("Not a hex. ");
  }

  res = 0n; 
  for (let i = 0; i < bin.length-1; i++) {
    res = (res + BigInt(parseInt(bin[i], 2))) * 2n;
  }
  res = (res + BigInt(parseInt(bin[bin.length-1], 2)));
  return String(res);
}

export class Bin {
  constructor(stream) {
    if (check_bin_integrity(stream)) {
      this.stream = stream;
      this.length = stream.length; 
    }
    else {
      throw new Error("Not a binary.")
    }
  }
  
  toHex() {
    return new Hex(bin_to_hex(this.stream)); 
  }

  toBigInt() { 
    return BigInt(bin_to_dec(this.stream));
  }

  static random(length) {
    let res = ""; 
    for (let i = 0; i < length; i++) {
      res += Math.random() < 0.5 ? "0" : "1"; 
    }
    return new Bin(res);
  }
}

export class Hex {
  constructor(stream) {
    if (typeof stream === 'string') {
      stream = stream.toUpperCase();
      if (!check_hex_integrity(stream)) {
        throw new Error("Not a hex.");
      }
      this.stream = stream;
      this.length = stream.length * 4;
    } else {
      throw new Error("Hex must be constructed with a string.");
    }
  }

  toString() {
    return this.stream;
  }
  
  toBigInt() {
    return BigInt(`0x${this.stream}`);
  }

  static fromBigInt(x, len=null) {
    if (typeof x !== 'bigint') {
      throw new Error("Input must be a BigInt");
    }
    if (len === null) {
      return new Hex(dec_to_hex(x.toString()));
    }
    else {
      assert(len % 4 === 0);
      return new Hex(dec_to_hex(x.toString()).padStart(len / 4, "0"));
    }
    
  }

  static fromHex(x) {
    return new Hex(x);
  }

  static random(length) {
    assert(length % 4 === 0);
    const bytes = new Uint8Array(length / 8);
    crypto.getRandomValues(bytes);
    return new Hex(Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase());
  }

  add(other) {
    return new Hex(dec_to_hex(String(this.toBigInt() + other.toBigInt()))); 
  }

  sub(other) {
    return new Hex(dec_to_hex(String(this.toBigInt() - other.toBigInt()))); 
  }

  mul(other) {
    return new Hex(dec_to_hex(String(this.toBigInt() * other.toBigInt()))); 
  }

  concat(other) {
    return new Hex((this.stream + other.stream).padStart((this.length + other.length)/4, "0")); 
  }

  split() {
    assert(this.stream.length % 2 === 0, "Hex length must be divisible by 2."); 
    const half = this.stream.length / 2; 
    const L = new Hex(this.stream.slice(0, half))
    const R = new Hex(this.stream.slice(-half))
    return [L, R]; 
  }
}

export class Stream {
  constructor(stream) {
    this.stream = stream; 
    this.length = stream.length * 8;  // 1 char takes 8 bits of memory
  }

  toString() {
    return this.stream;
  }

  toHex() {
    let res = ""; 
    for (let i = 0; i < this.stream.length; i++) {
      // Ensure 2-digit hex values by padding with 0
      res += this.stream.charCodeAt(i).toString(16).padStart(2, '0'); 
    }
    return new Hex(res.toUpperCase());
  }

  static fromHex(message) { // arg: hex string 
    // Ensure even length
    if (message.length % 2 !== 0) {
      message = '0' + message;
    }
    
    let res = ""; 
    for (let i = 0; i < message.length; i += 2) {
      res += String.fromCharCode(parseInt(message.slice(i, i+2), 16)); 
    }
    return new Stream(res);
  }

  toBigInt() {
    let value = 0n;
    for (let i = 0; i < this.stream.length; i++) {
      value = (value << 8n) | BigInt(this.stream.charCodeAt(i));
    }
    return value;
  }

  static fromBigInt(n) {
    let hex = n.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    return Stream.fromHex(hex);
  }
}
