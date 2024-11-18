import { Hex } from "./bytestream.js";
import { randomInt } from "./primes.js";
import { sha256, hmac_sha512 } from "./hash.js";

export function inverse(a, p) { 
  /**
  * @param {Hex | BigInt} a 
  * @param {Hex | BigInt} p
  * @returns {Hex}
  */
  a = (a instanceof Hex) ? a.toBigInt() : a; 
  p = (p instanceof Hex) ? p.toBigInt() : p; 

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
    /**
    * even though generator point G is considered part of this standard, it 
    * shouldn't be an attribute since we have every EccPoint point to one 
    * curve. Look at secp256k1 implementation for refresher. 
    * @constructs 
    * @param {Hex} p
    * @param {Hex} a
    * @param {Hex} b
    * @param {Hex} n
    */
    this.p = p; 
    this.a = a; 
    this.b = b; 
    this.n = n; 
  }

  eq(other) {
    return (
      this.p.eq(other.p) && 
      this.a.eq(other.a) && 
      this.b.eq(other.b) && 
      this.n.eq(other.n)
    );
  }
}

export class EccPoint {
  constructor(x, y, curve) {
    /**
    * @param {Hex | null} x 
    * @param {Hex | null} y  
    * @param {EccCurve} curve - need a pointer to curve parameters for 
    * operations on points
    */
    this.x = x; // infinity point is null
    this.y = y; // infinity point is null
    this.curve = curve; 
    if (this.x.toBigInt() < 0n || this.y.toBigInt() < 0n) {
      throw Error("Coorindates should be positive.");
    }

    if (!this.isOnCurve()) {
      throw Error("The point is not on the curve.");
    }
  }

  eq(other) {
    return (
      this.x.eq(other.x) && 
      this.y.eq(other.y) && 
      this.curve.eq(other.curve)
    ); 
  }

  isOnCurve() {
    /**
    * @param {EccCurve} curve
    * @returns {bool}
    */
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
    /**
    * @param {Hex | BigInt} k
    * @returns {EccPoint}
    */
    k = (k instanceof Hex) ? k.toBigInt() : k;

    let scalar = k; // Convert k to BigInt if it's a number
    
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
    /**
    * Concatenation the x and y coordinate to a single Hex instance  
    * @returns {Hex}
    */
    return this.x.concat(this.y);
  }
}

export class PublicEccKey {
  // Non-hardened extended key
  constructor(G, point, chain) {
    /**
    * @constructs 
    * @param {EccCurve} G       - generator point since not included in curve  
    * @param {EccPoint} point   - initialized with the ecc point
    * @param {Hex|null} chain   - chain node, not the blockchain
    */
    if (G.curve.eq(point.curve)) {
      this.curve = G.curve; 
    }
    else {
      throw Error("The generator point and public key not on the same curve.")
    }
    this.G = G
    this.point = point; 
    this.K = point.toHex(); 
    this.chain = chain; 
    this.txos = [];
  }

  ckd(i) {
    /**
    * child key derivation function private -> private 
    * this is implemented since it's possible to derive child keys 
    * with just public key, but in practice it is called with EccKeyPair
    * @param {BigInt} i       - must be of size 32 bits
    * @returns {PublicEccKey} 
    */
    if (this.chain === null) {
      throw Error("This must be an extended key."); 
    }
    i = Hex.fromBigInt(i); 
    let L; let R; 
    const data = this.K.concat(i);
    const I = hmac_sha512(this.chain, data); 
    [L, R] = I.split(); 
    let parsed_L = this.G.mul(L); 
    let child_key_point = parsed_L.add(this.point); 
    if (L.toBigInt() >= this.curve.n) {
      // failed to create child key, happens with probability < 2^{-127}
      return false; 
    }
    
    let cpub_key = new PublicEccKey(this.G, child_key_point, R);
    return cpub_key;
  }

  txos() {
    return this.txos; 
  }
}

export class PrivateEccKey {
  // Non-hardened, perhaps extended key
  constructor(G, k, chain) {
    /** 
    * @constructs 
    * @param {EccCurve} curve 
    * @param {Hex} k                - initialized with private key Hex 
    * @param {Hex} chain            - chain node, not blockchain 
    * @param {EccKeyPair|null} keypair   - may have pointer to original keypair
    */
    this.curve = G.curve; 
    this.G = G; 
    this.k = k; 
    this.chain = chain; 
  }

  set_keypair(keypair) {
    /**
    * @param {EccKeyPair} keypair 
    */ 
    if (this.curve.eq(keypair.public.curve)) {
      // check that generator point matches with public key 
      this.keypair = keypair;
      this.K = keypair.public.K;
    }
    else {
      throw Error("The private generator point and public key not on the same curve.")
    }
  }

  ckd(i) {
    /**
    * child key derivation function private -> private 
    * this is implemented since it's possible to derive child keys 
    * with just private key, but in practice it is called with EccKeyPair
    * @param {BigInt} i         - must be of size 32 bits
    * @returns {PrivateEccKey} 
    */
    if (this.chain === null) {
      throw Error("This must be an extended key."); 
    }
    i = Hex.fromBigInt(i); 
    let L; let R; 
    const data = this.K.concat(i); 
    const I = hmac_sha512(this.chain, data); 
    [L, R] = I.split(); 
    let child_priv_key_val = (L.toBigInt() + this.k.toBigInt()) % (this.curve.n.toBigInt()); 

    if (child_priv_key_val === 0n || L.toBigInt() >= this.curve.n) {
      // failed to create child key, happens with probability < 2^{-127}
      return false; 
    }
    child_priv_key_val = Hex.fromBigInt(child_priv_key_val);

    let cpriv_key = new PrivateEccKey(this.G, child_priv_key_val, R, this.keypair); 
    return cpriv_key;  
  }

  create_signature(m) { 
    /**
    * m = message to be encrypted  which can be unlocked and verified by receiver
    * @param {string} m
    * @returns {EcdsaSignature}
    */
    let hashed_m = sha256(m); 
    const r = Hex.random(256); 
    const R = this.G.mul(r); 
    const r_inv = inverse(r, this.curve.n); 
    const s = (r_inv.toBigInt() * (
      hashed_m.toBigInt() + this.k.toBigInt() * R.x.toBigInt())
    ) % this.curve.n.toBigInt(); 
    return new EcdsaSignature(hashed_m, R, Hex.fromBigInt(s), this.keypair.public); 
  }

  txos() {
    return this.keypair.txos(); 
  }
}

export class EccKeyPair {
  // Recommended to instantiate using helper functions below, 
  // which ensures that curve construction is consistent. 
  constructor(pub, priv, path="g") {
    /**
    * @construts 
    * @param {PublicEccKey} pub
    * @param {PrivateEccKey} priv
    */

    if (pub.G.eq(priv.G)) {
      this.curve = priv.curve; 
    }
    else {
      throw Error("Curves of private and public keys are not equal. ");
    }
    this.public = pub; 
    this.private = priv; 

    this.children = new Map(); 
    this.i  = 0n;               // accumulator index for generating next child
    this.path = path; 
  }

  static random(G, extended) {
    /**
    * @constructs 
    * @param {EccPoint} G         - generator point G defines the curve 
    * @param {Boolean} extended   - whether this is extended keypair
    */
    
    // generate new random private key 
    const private_key = Hex.fromBigInt(randomInt(256));

    // generate chain node if extended key 
    let chain; 
    if (extended) {
      chain = Hex.fromBigInt(randomInt(256)); 
    }
    else {
      chain = null; 
    }

    // compute public key point
    const public_point = G.mul(private_key);

    // construct both private keys and return their pair
    const pubkey = new PublicEccKey(G, public_point, chain);
    const privkey = new PrivateEccKey(G, private_key, chain); 

    const keypair = new EccKeyPair(pubkey, privkey); 
    privkey.set_keypair(keypair);
    return keypair; 
  }
  
  txos() {
    return this.public.txos; 
  }

  ckd() {
    /**
    * @returns {EccKeyPair} 
    */
    // create child public and private keys and ensure they are successful
    let cpub_key = this.public.ckd(this.i); 
    let cpriv_key = this.private.ckd(this.i);  
    while (cpub_key === false || cpriv_key === false) {
      this.i++; 
      cpub_key = this.public.ckd(this.i); 
      cpriv_key = this.private.ckd(this.i);  
    }

    // generate new path for child key pair and store it 
    const cpath = `${this.path}/${this.i}`;
    const ckey_pair = new EccKeyPair(cpub_key, cpriv_key, cpath);  
    this.children.set(cpath, cpriv_key);

    // increment index for next call of ckd() 
    this.i++; 

    return ckey_pair; 
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
  return EccKeyPair.random(G, extended);
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
  return EccKeyPair.random(G, extended);
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
  return EccKeyPair.random(G, extended);
}

export class EcdsaSignature {
  constructor(m, R, s, K) { 
    /**
    * @constructs 
    * @param {string} m 
    * @param {EccPoint} R 
    * @param {Hex} s
    * @param {PublicEccKey} K
    */
    this.m = m;   // hashed message
    this.R = R;   // signature component created with private key
    this.s = s;   // signature component created with private key
    this.K = K;   // public key of signature creator used to verify signature
  }

  verify() { 
    /**
    * verifies if this signature is coming from the correct person
    * @return {Boolean} 
    */
    const s_inv = inverse(this.s.toBigInt(), this.K.curve.n).toBigInt();
    const u1 = Hex.fromBigInt((this.m.toBigInt() * s_inv) % this.K.curve.n.toBigInt()); 
    const u2 = Hex.fromBigInt((this.R.x.toBigInt() * s_inv) % this.K.curve.n.toBigInt()); 
    const lhs = this.K.G.mul(u1).add(this.K.point.mul(u2));
    if (lhs.x.toBigInt() === this.R.x.toBigInt() && lhs.y.toBigInt() === this.R.y.toBigInt()) {
      return true; 
    }
    else {
      return false; 
    }
  }
}
