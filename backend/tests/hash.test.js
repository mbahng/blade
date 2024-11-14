import { Bin, Hex } from "../src/utils/bytestream.js";
import { expmod, sha256, hmac_sha512 } from "../src/utils/hash.js";

describe("expmod function", () => {
  test("basic exponentiation with BigInts", () => {
    expect(expmod(2n, 3n, 5n)).toBe(3n); // 2^3 mod 5 = 8 mod 5 = 3
  });

  test("exponentiation with Hex inputs", () => {
    const base = new Hex("02");     // 2 in hex
    const exponent = new Hex("03");  // 3 in hex
    const modulus = new Hex("05");   // 5 in hex
    expect(expmod(base, exponent, modulus)).toBe(3n);
  });

  test("mixed Hex and BigInt inputs", () => {
    const base = new Hex("02");
    expect(expmod(base, 3n, 5n)).toBe(3n);
  });

  test("zero base", () => {
    expect(expmod(0n, 5n, 7n)).toBe(0n);
  });

  test("zero exponent", () => {
    expect(expmod(5n, 0n, 7n)).toBe(1n);
  });

  test("modulus of 1", () => {
    expect(expmod(5n, 3n, 1n)).toBe(0n);
  });

  test("large numbers", () => {
    const base = new Hex("FFFF");
    const exponent = new Hex("FFFF");
    const modulus = new Hex("FFFFF");
    expect(typeof expmod(base, exponent, modulus)).toBe("bigint");
  });

  test("negative exponent throws error", () => {
    expect(() => expmod(2n, -1n, 5n)).toThrow("Exponent must be non-negative");
  });
});

describe("sha256 function", () => {
  test("string input", () => {
    const hash = sha256("hello");
    expect(hash instanceof Hex).toBe(true);
    expect(hash.length).toBe(256); // SHA-256 produces 256-bit output
  });

  test("Hex input", () => {
    const input = new Hex("68656C6C6F"); // "hello" in hex
    const hash = sha256(input);
    expect(hash instanceof Hex).toBe(true);
    expect(hash.length).toBe(256);
  });

  test("Bin input", () => {
    const input = new Bin("01010101");
    const hash = sha256(input);
    expect(hash instanceof Hex).toBe(true);
    expect(hash.length).toBe(256);
  });

  test("empty string", () => {
    const hash = sha256("");
    expect(hash instanceof Hex).toBe(true);
    expect(hash.length).toBe(256);
  });

  test("invalid input type throws error", () => {
    expect(() => sha256(123)).toThrow("Not a valid input type");
  });

  test("consistent hashing", () => {
    const hash1 = sha256("hello");
    const hash2 = sha256("hello");
    expect(hash1.stream).toBe(hash2.stream);
  });
});

describe("hmac_sha512 function", () => {
  test("valid Hex inputs", () => {
    const message = new Hex("68656C6C6F"); // "hello" in hex
    const key = new Hex("6B6579");         // "key" in hex
    const hmac = hmac_sha512(message, key);
    expect(hmac instanceof Hex).toBe(true);
    expect(hmac.length).toBe(512); // HMAC-SHA512 produces 512-bit output
  });

  test("consistent HMAC generation", () => {
    const message = new Hex("68656C6C6F");
    const key = new Hex("6B6579");
    const hmac1 = hmac_sha512(message, key);
    const hmac2 = hmac_sha512(message, key);
    expect(hmac1.stream).toBe(hmac2.stream);
  });

  test("different keys produce different HMACs", () => {
    const message = new Hex("68656C6C6F");
    const key1 = new Hex("6B6579");
    const key2 = new Hex("6B657932");
    const hmac1 = hmac_sha512(message, key1);
    const hmac2 = hmac_sha512(message, key2);
    expect(hmac1.stream).not.toBe(hmac2.stream);
  });

  test("invalid input types throw error", () => {
    const message = new Hex("68656C6C6F");
    expect(() => hmac_sha512(message, "invalid")).toThrow("Not a valid input type");
    expect(() => hmac_sha512("invalid", message)).toThrow("Not a valid input type");
  });
});
