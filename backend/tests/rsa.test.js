import { RsaKeyPair } from "../src/keys/rsa.js";
import { Stream } from "../src/utils/bytestream.js";

describe("RSA Encryption/Decryption", () => {
  let keyPair;

  beforeEach(() => {
    // Use a small bit length for faster tests
    keyPair = new RsaKeyPair(1024);
  });

  test("key generation creates valid key pair", () => {
    expect(keyPair.public).toBeDefined();
    expect(keyPair.private).toBeDefined();
    expect(keyPair.public.k_.toString()).toBe("65537"); // Standard public exponent
  });

  test("encrypt and decrypt short message", () => {
    const originalMessage = new Stream("Hello");
    const encrypted = keyPair.public.map(originalMessage);
    const decrypted = keyPair.private.map(encrypted);
    
    expect(decrypted.toString()).toBe(originalMessage.toString());
  });

  test("encrypt and decrypt longer message", () => {
    const originalMessage = new Stream("This is a longer message to test RSA encryption and decryption!");
    const encrypted = keyPair.public.map(originalMessage);
    const decrypted = keyPair.private.map(encrypted);
    
    expect(decrypted.toString()).toBe(originalMessage.toString());
  });

  test("different messages produce different ciphertexts", () => {
    const message1 = new Stream("Hello");
    const message2 = new Stream("World");
    
    const encrypted1 = keyPair.public.map(message1);
    const encrypted2 = keyPair.public.map(message2);
    
    expect(encrypted1.toString()).not.toBe(encrypted2.toString());
  });

  test("different key pairs produce different ciphertexts", () => {
    const keyPair2 = new RsaKeyPair(1024);
    const message = new Stream("Hello");
    
    const encrypted1 = keyPair.public.map(message);
    const encrypted2 = keyPair2.public.map(message);
    
    expect(encrypted1.toString()).not.toBe(encrypted2.toString());
  });

  test("encryption with public key and wrong private key fails", () => {
    const keyPair2 = new RsaKeyPair(1024);
    const message = new Stream("Hello");
    
    const encrypted = keyPair.public.map(message);
    
    // Trying to decrypt with wrong private key should either fail
    // or produce incorrect results
    const wrongDecrypted = keyPair2.private.map(encrypted);
    expect(wrongDecrypted.toString()).not.toBe(message.toString());
  });

  test("key pair generation with invalid bit length throws error", () => {
    expect(() => new RsaKeyPair(1023)).toThrow(); // Not divisible by 8
  });

  test("RSA properties", () => {
    const message = new Stream("Test");
    
    // Encrypt then decrypt
    const encrypted1 = keyPair.public.map(message);
    const decrypted1 = keyPair.private.map(encrypted1);
    
    // Decrypt then encrypt
    const encrypted2 = keyPair.public.map(decrypted1);
    const decrypted2 = keyPair.private.map(encrypted2);
    
    // Both should give the same result
    expect(decrypted1.toString()).toBe(decrypted2.toString());
    expect(decrypted1.toString()).toBe(message.toString());
  });
});

describe("PublicRsaKey", () => {
  let keyPair;

  beforeEach(() => {
    keyPair = new RsaKeyPair(1024);
  });

  test("public key properties", () => {
    expect(keyPair.public.n).toBeDefined();  // Modulus
    expect(keyPair.public.k).toBeDefined();  // Public exponent
    expect(typeof keyPair.public.n_).toBe("bigint");
    expect(typeof keyPair.public.k_).toBe("bigint");
  });
});

describe("PrivateRsaKey", () => {
  let keyPair;

  beforeEach(() => {
    keyPair = new RsaKeyPair(1024);
  });

  test("private key properties", () => {
    expect(keyPair.private.p).toBeDefined();  // First prime
    expect(keyPair.private.q).toBeDefined();  // Second prime
    expect(keyPair.private.k).toBeDefined();  // Public exponent
    expect(typeof keyPair.private.p_).toBe("bigint");
    expect(typeof keyPair.private.q_).toBe("bigint");
    expect(typeof keyPair.private.k_).toBe("bigint");
    expect(typeof keyPair.private.n_).toBe("bigint");
  });

  test("private key n matches public key n", () => {
    expect(keyPair.private.n_).toBe(keyPair.public.n_);
  });
});
