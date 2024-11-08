import { Hex } from "../bytestream.js";
import assert from "assert/strict";

export function inverse(a, p) {
  if (a instanceof Hex) {
    p = a.toBigInt(); 
  }
  if (p instanceof Hex) {
    p = p.toBigInt(); 
  }

  // calculate modular inverse using extended Euclidean algo 
  // solve x satisfying ax \equiv 1 (mod p)
  // equivalently find (x, y) satisfying Bezout's identity 
  // ax + py = 1
  
  // Ensure a is positive and less than p
  a = ((a % p) + p) % p;
  
  if (a === 0n) {
      throw new Error('Number not invertible');
  }

  // Initialize variables for extended Euclidean algorithm
  let old_r = a;
  let r = p;
  let old_s = 1n;
  let s = 0n;
  let old_t = 0n;
  let t = 1n;

  while (r !== 0n) {
      const quotient = old_r / r;
      
      // Update remainders
      [old_r, r] = [r, old_r - quotient * r];
      
      // Update coefficients
      [old_s, s] = [s, old_s - quotient * s];
      [old_t, t] = [t, old_t - quotient * t];
  }

  // Check if a and p are coprime
  if (old_r !== 1n) {
      throw new Error('Number not invertible - GCD is not 1');
  }

  // Make sure result is positive
  return Hex.fromBigInt(((old_s % p) + p) % p);
}

export class EccCurve {
  constructor(p, a, b) {
    assert(a instanceof Hex && b instanceof Hex && p instanceof Hex); 
    this.p = p; 
    this.a = a; 
    this.b = b; 
  }
}

export class EccPoint {
  constructor(x, y, curve) {
    assert(x instanceof Hex && y instanceof Hex);
    this.x = x; // infinity point is null
    this.y = y; // infinity point is null
    assert(this.x.toBigInt() >= 0n && this.y.toBigInt() >= 0n, 
      "Coorindates should be positive.");
    this.curve = curve;

    assert(this.isOnCurve(), "This is not on the curve.");
  }

  eq(other) {
    return (this.x === other.x && this.y === other.y);
  }

  // Point operations
  isOnCurve() {
      if (this.x == null) return true;
      
      const x = this.x.toBigInt();
      const y = this.y.toBigInt();
      const a = this.curve.a.toBigInt();
      const b = this.curve.b.toBigInt();
      const p = this.curve.p.toBigInt();
      
      const left = y * y;
      const right = ((x * x * x) % p) + a * x + b;
      return (left % p) === (right % p);
  }

  double() {
    let x = this.x.toBigInt();
    let y = this.y.toBigInt();
    let p = this.curve.p.toBigInt();
    let a = this.curve.a.toBigInt(); 
    let s_num = (3n * x * x + a);
    let s_den_inv = inverse(2n * y, p).toBigInt(); 
    let s = (s_num * s_den_inv) % p;

    let res_x = (s * s - 2n * x) % p; 
    let res_y = (s * (x - res_x) - y) % p; 
    if (res_y < 0) {
      res_y += p;
    }
    return new EccPoint(
      Hex.fromBigInt(res_x), 
      Hex.fromBigInt(res_y), 
      this.curve
    );
  }

  add(other) {
    if (
      this.curve.p != other.curve.p 
      || this.curve.a != other.curve.a 
      || this.curve.b != other.curve.b
    ) {
      throw Error("Two points are not on the same curve.");
    }
    
    if (this.eq(other)) {
      return this.double(); 
    }

    let x1 = this.x.toBigInt();
    let x2 = other.x.toBigInt();
    let y1 = this.y.toBigInt();
    let y2 = other.y.toBigInt();
    let p = this.curve.p.toBigInt(); 

    let s_num = y2 - y1; 
    let s_den = x2 - x1;
    if (s_num < 0n) { s_num += p }
    if (s_den < 0n) { s_den += p }
    const s = (s_num * inverse(s_den, this.curve.p).toBigInt()) % p; 

    let res_x = (s * s - x1 - x2) % p; 
    if (res_x < 0n) { res_x += p }

    let res_y = (s * (x1 - res_x) - y1) % p; 
    if (res_y < 0n) { res_y += p }

    return new EccPoint(
      Hex.fromBigInt(res_x), 
      Hex.fromBigInt(res_y), 
      this.curve
    );
  }

  mul(k) {
    // Validate input
    assert(typeof k !== 'bigint' || k instanceof Hex);
    if (k instanceof Hex) {
      k = k.toBigInt();
    }

    // Convert k to BigInt if it's a number
    let scalar = k; 
    
    // Handle special cases
    if (scalar === 0n) {
      return null; // Return point at infinity
    }
    if (scalar < 0n) {
      throw new Error('Negative scalar multiplication is not supported');
    }
    if (scalar === 1n) {
      return this;
    }

    // Double-and-add algorithm implementation
    let result = null; // Point at infinity
    let current = this;
    
    // Convert k to binary and process each bit
    while (scalar > 0n) {
      // If current bit is 1, add current point to result
      if (scalar & 1n) {
        if (result === null) {
          result = current;
        } else {
          result = result.add(current);
        }
      }
      
      // Double the current point
      current = current.double();
      
      // Move to next bit
      scalar = scalar >> 1n;
    }
    
    return result;
  }
}
