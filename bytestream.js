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
  for (let i = 0; i < string.length; i++) {
    if (parseInt(string[i], 16) >= 16) {
      return false; 
    }
  }
  return true; 
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
    throw new Error("Not a hex. ");
  }

  let res = 0n;
  for (let i = 0; i < hex.length -1; i++) {
    res = (res + BigInt(parseInt(hex[i], 16))) * 16n;
  }
  res = (res + BigInt(parseInt(hex[hex.length-1], 16))); 
  return String(res); 
}

export function dec_to_hex(dec) {
  if (!check_dec_integrity(dec)) {
    throw new Error("Not a hex. ");
  }

  dec = BigInt(dec); 
  let res = ""; 

  while (dec > 0) {
    let remainder = dec % 16n;
    res += Number(remainder).toString(16); 
    dec = (dec - remainder) / 16n;
  }

  return res.split('').reverse().join('').toUpperCase();
}

export function dec_to_bin(dec) {
  if (!check_dec_integrity(dec)) {
    throw new Error("Not a hex. ");
  }

  dec = BigInt(dec); 
  res = ""; 

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
    if (check_hex_integrity(stream)) {
      this.stream = stream;
      this.length = stream.length * 4; 
    }
  }
  
  toBin() {
    return new Bin(hex_to_bin(this.stream)); 
  }

  toBigInt() {
    return BigInt(hex_to_dec(this.stream)); 
  }

  static random(length) { 
    assert(length % 4 == 0); 
    let res = ""; 
    for (let i = 0; i < length / 4; i++) {
      res += Math.floor(Math.random() * 16).toString(16); 
    }
    return new Hex(res); 
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
