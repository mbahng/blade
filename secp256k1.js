import { Hex } from "./bytestream.js";
import assert from "assert/strict";

class Point {
    constructor(x, y, infinity = false) {
        this.x = x;
        this.y = y;
        this.infinity = infinity;
    }

    static INFINITY = new Point(
        new Hex("0"),
        new Hex("0"),
        true
    );

    equals(other) {
        if (this.infinity && other.infinity) return true;
        if (this.infinity || other.infinity) return false;
        return this.x.toBigInt() === other.x.toBigInt() && 
               this.y.toBigInt() === other.y.toBigInt();
    }
}

class PublicSecp256k1Key {
    constructor(x, y) {
        assert(x instanceof Hex && y instanceof Hex, "Parameters must be Hex instances");
        this.x = x;
        this.y = y;
    }

    verify(message, signature) {
        try {
            const p = curve.p.toBigInt();
            const n = curve.n.toBigInt();
            const z = message.toBigInt();
            const r = signature.r.toBigInt();
            const s = signature.s.toBigInt();

            if (r <= 0n || r >= n || s <= 0n || s >= n) {
                return false;
            }

            const w = curve.modInv(Hex.fromBigInt(s), curve.n).toBigInt();
            const u1 = Hex.fromBigInt((z * w) % n);
            const u2 = Hex.fromBigInt((r * w) % n);

            const point1 = curve.multiply(u1, curve.G);
            const point2 = curve.multiply(u2, new Point(this.x, this.y));
            const result = curve.add(point1, point2);

            return !result.infinity && (result.x.toBigInt() % n) === r;
        } catch (error) {
            console.error("Verification error:", error);
            return false;
        }
    }
}

class PrivateSecp256k1Key {
    constructor(privateKey) {
        assert(privateKey instanceof Hex, "Private key must be Hex instance");
        const privKeyBigInt = privateKey.toBigInt();
        const n = curve.n.toBigInt();
        
        assert(privKeyBigInt > 0n && privKeyBigInt < n,
               "Private key must be in range [1, n-1]");
        
        this.privateKey = privateKey;
        const point = curve.multiply(privateKey, curve.G);
        this.publicKey = new PublicSecp256k1Key(point.x, point.y);
    }

    sign(message, k = null) {
        try {
            const n = curve.n.toBigInt();
            const z = message.toBigInt();
            const d = this.privateKey.toBigInt();
            
            if (k === null) {
                k = Hex.random(256); // 256 bits
            }
            const kBigInt = k.toBigInt() % n;
            
            if (kBigInt <= 0n || kBigInt >= n) {
                throw new Error("Invalid k value");
            }

            const point = curve.multiply(k, curve.G);
            const r = point.x.toBigInt() % n;
            if (r === 0n) throw new Error("Invalid r value - retry with different k");

            const s = (curve.modInv(k, curve.n).toBigInt() * 
                (z + r * d % n)) % n;
            if (s === 0n) throw new Error("Invalid s value - retry with different k");

            return {
                r: Hex.fromBigInt(r),
                s: Hex.fromBigInt(s)
            };
        } catch (error) {
            throw new Error(`Signing failed: ${error.message}`);
        }
    }

    getPublicKey() {
        return this.publicKey;
    }
}

// Curve operations as a separate object
const curve = {
    // Curve parameters
    p: new Hex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"),
    a: new Hex("0000000000000000000000000000000000000000000000000000000000000000"),
    b: new Hex("0000000000000000000000000000000000000000000000000000000000000007"),
    n: new Hex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"),
    G: new Point(
        new Hex("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"),
        new Hex("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8")
    ),

    // Modular arithmetic
    modInv(a, m) {
        let t = 0n, newT = 1n;
        let r = m.toBigInt(), newR = a.toBigInt();

        while (newR !== 0n) {
            const quotient = r / newR;
            [t, newT] = [newT, t - quotient * newT];
            [r, newR] = [newR, r - quotient * newR];
        }

        if (r > 1n) {
            throw new Error("Modular inverse does not exist");
        }
        if (t < 0n) {
            t = t + m.toBigInt();
        }
        return Hex.fromBigInt(t);
    },

    // Point operations
    isOnCurve(point) {
        if (point.infinity) return true;
        
        const x = point.x.toBigInt();
        const y = point.y.toBigInt();
        const p = this.p.toBigInt();
        
        const left = (y * y) % p;
        const right = (((x * x * x) % p) + this.b.toBigInt()) % p;
        return left === right;
    },

    add(p1, p2) {
        if (p1.infinity) return p2;
        if (p2.infinity) return p1;

        const p = this.p.toBigInt();
        const x1 = p1.x.toBigInt();
        const y1 = p1.y.toBigInt();
        const x2 = p2.x.toBigInt();
        const y2 = p2.y.toBigInt();

        if (x1 === x2) {
            if (y1 === y2 && y1 !== 0n) {
                // Point doubling
                const slope = (3n * x1 * x1) * 
                    this.modInv(Hex.fromBigInt(2n * y1), this.p).toBigInt() % p;
                
                const x3 = (slope * slope - 2n * x1) % p;
                const y3 = (slope * (x1 - x3) - y1) % p;
                
                return new Point(
                    Hex.fromBigInt((x3 + p) % p),
                    Hex.fromBigInt((y3 + p) % p)
                );
            }
            return Point.INFINITY;
        }

        // Point addition
        const slope = ((y2 - y1) * 
            this.modInv(Hex.fromBigInt(x2 - x1), this.p).toBigInt()) % p;
        const x3 = (slope * slope - x1 - x2) % p;
        const y3 = (slope * (x1 - x3) - y1) % p;

        return new Point(
            Hex.fromBigInt((x3 + p) % p),
            Hex.fromBigInt((y3 + p) % p)
        );
    },

    multiply(k, point) {
        let result = Point.INFINITY;
        let current = new Point(point.x, point.y);
        let scalar = k.toBigInt();

        while (scalar > 0n) {
            if (scalar & 1n) {
                result = this.add(result, current);
            }
            current = this.add(current, current);
            scalar >>= 1n;
        }

        return result;
    }
};

export class Secp256k1KeyPair {
    constructor(privateKey = null) {
        if (privateKey === null) {
            do {
                privateKey = Hex.random(256); // 256 bits
            } while (privateKey.toBigInt() === 0n || 
                    privateKey.toBigInt() >= curve.n.toBigInt());
        }
        
        this.privateKey = new PrivateSecp256k1Key(privateKey);
        this.publicKey = this.privateKey.getPublicKey();
    }
}
