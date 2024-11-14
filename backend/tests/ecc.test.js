import { 
  EccCurve, 
  EccPoint, 
  secp256k1, 
  secp192k1, 
  secp256r1,
  inverse,
  EcdsaSignature
} from "../src/keys/ecc.js";
import { Hex } from "../src/utils/bytestream.js";
import { Stream } from "../src/utils/bytestream.js";
import { sha256 } from "../src/utils/hash.js";

describe("ECC Basic Operations", () => {
  let curve, G;

  beforeEach(() => {
    // Using secp256k1 curve parameters for testing
    const keypair = secp256k1(false);
    curve = keypair.curve;
    G = keypair.private.G;
  });

  test("point is on curve", () => {
    expect(G.isOnCurve()).toBe(true);
  });

  test("point doubling", () => {
    const doubled = G.double();
    expect(doubled.isOnCurve()).toBe(true);
    expect(doubled.eq(G)).toBe(false);
  });

  test("point addition", () => {
    const doubled = G.double();
    const sum = G.add(G);
    expect(doubled.x.toString()).toBe(sum.x.toString());
    expect(doubled.y.toString()).toBe(sum.y.toString());
  });

  test("scalar multiplication", () => {
    const k = new Hex("02");
    const doubled = G.double();
    const multiplied = G.mul(k);
    expect(doubled.x.toString()).toBe(multiplied.x.toString());
    expect(doubled.y.toString()).toBe(multiplied.y.toString());
  });
});

describe("Standard Curves", () => {
  test("secp256k1 initialization", () => {
    const keypair = secp256k1(false);
    expect(keypair.public).toBeDefined();
    expect(keypair.private).toBeDefined();
  });

  test("secp192k1 initialization", () => {
    const keypair = secp192k1(false);
    expect(keypair.public).toBeDefined();
    expect(keypair.private).toBeDefined();
  });

  test("secp256r1 initialization", () => {
    const keypair = secp256r1(false);
    expect(keypair.public).toBeDefined();
    expect(keypair.private).toBeDefined();
  });
});

describe("Key Generation and Operations", () => {
  let keypair;

  beforeEach(() => {
    keypair = secp256k1(true);
  });

  test("key pair generation", () => {
    expect(keypair.public.point.isOnCurve()).toBe(true);
    expect(keypair.public.G.mul(keypair.private.k).eq(keypair.public.point)).toBe(true);
  });

  test("child key derivation", () => {
    const childPrivate = keypair.private.ckd();
    const childPublic = keypair.public.ckd(); 
    expect(childPrivate.K.toString()).toBe(childPublic.K.toString());
  });
});

describe("ECDSA Signatures", () => {
  let keypair; 
  
  beforeEach(() => {
    keypair = secp256k1(false);
  });

  test("signature creation and verification", () => {
    const message = new Stream("Hello, World!");
    const signature = keypair.private.create_signature(message);
    expect(signature.verify()).toBe(true);
  });

  test("signature verification with wrong message fails", () => {
    const message1 = new Stream("Hello, World!");
    const message2 = new Stream("Wrong message");
    const signature = keypair.private.create_signature(message1);
    
    // Modify the message in the signature
    signature.m = sha256(message2);
    expect(signature.verify()).toBe(false);
  });
});

describe("Modular Inverse", () => {
  test("computes correct modular inverse", () => {
    const a = new Hex("03");
    const p = new Hex("0D"); // 13 in decimal
    const inv = inverse(a, p);
    
    // Check: a * inv ≡ 1 (mod p)
    const product = (a.toBigInt() * inv.toBigInt()) % p.toBigInt();
    expect(product).toBe(1n);
  });

  test("throws error for non-invertible numbers", () => {
    const a = new Hex("06");
    const p = new Hex("0C"); // 12 in decimal
    expect(() => inverse(a, p)).toThrow('Number not invertible');
  });
});

describe("Extended Keys", () => {
  test("extended key derivation path", () => {
    const keypair = secp256k1(true);
    const child = keypair.private.ckd();
    expect(child.path).toMatch("g/0");
  });

  test("correct path generation", () => {
    const keypair = secp256k1(true);
    expect(keypair.private.path).toBe("g");
    
    const child = keypair.private.ckd();
    expect(child.path).toBe("g/0");
    
    const child2 = keypair.private.ckd();
    expect(child2.path).toBe("g/1");
  });

  test("multiple child derivation", () => {
    const keypair = secp256k1(true);
    const child1 = keypair.private.ckd();
    const child2 = keypair.private.ckd();
    expect(child1.path).not.toBe(child2.path);
  });
});

describe("Error Handling", () => {
  test("point addition on different curves", () => {
    const keypair1 = secp256k1(false);
    const keypair2 = secp256r1(false);
    expect(() => keypair1.public.point.add(keypair2.public.point))
      .toThrow("Two points are not on the same curve");
  });

  test("negative scalar multiplication", () => {
    const keypair = secp256k1(false);
    expect(() => keypair.public.point.mul(-1n))
      .toThrow('Negative scalar multiplication is not supported');
  });
});
