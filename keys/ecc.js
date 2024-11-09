import { Hex } from "../bytestream.js";
import assert from "assert/strict";
import { randomInt } from "../primes.js";
import { warn } from "console";
import { hmac_sha512 } from "../hash.js";

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
  constructor(p, a, b, n) {
    assert(a instanceof Hex 
      && b instanceof Hex 
      && p instanceof Hex 
      && n instanceof Hex); 
    this.p = p; 
    this.a = a; 
    this.b = b; 
    this.n = n; 
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

  toHex() {
    return this.x.concat(this.y);
  }
}

class PublicEccKey {
  // Non-hardened, perhaps extended key
  constructor(curve, point, G, chain) {
    this.point = point; 
    this.K = point.toHex(); 
    this.curve = curve; 
    this.G = G; 
    this.chain = chain; 
  }

  ckd(i) {
    // child key derivation function private -> private
    assert(this.extension !== null, "This must be an extended key."); 
    assert(i instanceof Hex, "Index must be a Hex type."); 
    assert(0n <= i.toBigInt() < 2n ** 31n, "Index must be between 0 and 2^31.");
    const data = this.K.concat(i);
    const I = hmac_sha512(this.chain, data); 
    const [L, R] = I.split(); 
    let parsed_L = this.G.mul(L); 
    let child_key_point = parsed_L.add(this.point);

    return new PublicEccKey(
      this.curve, 
      child_key_point, 
      this.G, 
      R
    );
  }
}

class PrivateEccKey {
  // Non-hardened, perhaps extended key
  constructor(curve, k, K, G, chain) {
    this.k = k; 
    this.K = K; 
    this.G = G; 
    this.curve = curve;
    this.chain = chain; 
  }

  ckd(i) {
    // child key derivation function private -> private
    assert(this.extension !== null, "This must be an extended key."); 
    assert(i instanceof Hex, "Index must be a Hex type."); 
    assert(0n <= i.toBigInt() < 2n ** 31n, "Index must be between 0 and 2^31.");
    const data = this.K.concat(i);
    const I = hmac_sha512(this.chain, data); 
    const [L, R] = I.split(); 
    let child_priv_key_val = Hex.fromBigInt((L.toBigInt() + this.k.toBigInt()) % (this.curve.n.toBigInt())); 
    let child_pub_key_val = this.G.mul(child_priv_key_val); 
    let cpriv_key = new PrivateEccKey(this.curve, child_priv_key_val, child_pub_key_val.toHex(), this.G, R); 
    return cpriv_key;  
  }
}

class EccKeyPair {
  // Constructor should not be called directly, since there are defined 
  // standards for what p, a, b, G should be
  constructor(G, extended) {
    this.curve = G.curve; 
    let chain; 
    if (extended) {
      chain = Hex.fromBigInt(randomInt(256)); 
    }
    else {
      chain = null; 
    }

    const private_key = Hex.fromBigInt(randomInt(256));

    // compute public key 
    const public_point = G.mul(private_key);
    this.public = new PublicEccKey(this.curve, public_point, G, chain);
    this.private = new PrivateEccKey(this.curve, private_key, this.public.K, G, chain); 
  }
}

export function secp192k1(extended) {
  let p = new Hex("fffffffffffffffffffffffffffffffffffffffeffffee37");
  let a = new Hex("000000000000000000000000000000000000000000000000");
  let b = new Hex("000000000000000000000000000000000000000000000003");
  let n = new Hex("fffffffffffffffffffffffe26f2fc170f69466a74defd8d");

  let curve = new EccCurve(p, a, b, n);

  let G = new EccPoint(
    new Hex("db4ff10ec057e9ae26b07d0280b7f4341da5d1b1eae06c7d"),
    new Hex("9b2f2f6d9c5628a7844163d015be86344082aa88d95e2f9d"),
    curve 
  );

  return new EccKeyPair(G, extended);
}

export function secp256k1(extended) {
  let p = new Hex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
  let a = new Hex("0000000000000000000000000000000000000000000000000000000000000000");
  let b = new Hex("0000000000000000000000000000000000000000000000000000000000000007");
  let n = new Hex("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");

  let curve = new EccCurve(p, a, b, n);

  let G = new EccPoint(
    new Hex("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"),
    new Hex("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8"),
    curve 
  );

  return new EccKeyPair(G, extended);
}

export function secp256r1(extended) {
  let p = new Hex("ffffffff00000001000000000000000000000000ffffffffffffffffffffffff");
  let a = new Hex("ffffffff00000001000000000000000000000000fffffffffffffffffffffffc");
  let b = new Hex("5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");
  let n = new Hex("ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");

  let curve = new EccCurve(p, a, b, n);

  let G = new EccPoint(
    new Hex("6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"),
    new Hex("4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"),
    curve 
  );

  return new EccKeyPair(G, extended);
}
