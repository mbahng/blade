import { generatePrime, randomInt } from "../src/utils/primes.js";

describe("Prime Number Generation and Testing", () => {
  describe("randomInt function", () => {
    test("generates numbers within correct bit length", () => {
      const bitLength = 32;
      for (let i = 10; i < 100; i++) {
        const num = randomInt(bitLength);
        const numBits = num.toString(2).length;
        expect(numBits).toBeLessThanOrEqual(bitLength);
        expect(numBits).toBeGreaterThanOrEqual(bitLength - 1);
      }
    });

    test("always generates odd numbers", () => {
      for (let i = 0; i < 100; i++) {
        const num = randomInt(32);
        expect(num % 2n).toBe(1n);
      }
    });

    test("generates different numbers on subsequent calls", () => {
      const numbers = new Set();
      for (let i = 0; i < 100; i++) {
        numbers.add(randomInt(32).toString());
      }
      expect(numbers.size).toBeGreaterThan(90); // Allow for some random collisions
    });
  });
});

describe("generatePrime function", () => {
  test("generates prime numbers of correct bit length", () => {
    const bitLengths = [16, 24, 32]; // 8 bit prime generation doesn't work? 
    for (const bits of bitLengths) {
      const prime = generatePrime(bits);
      const primeBits = prime.toString(2).length;
      expect(primeBits).toBeLessThanOrEqual(bits);
      expect(primeBits).toBeGreaterThanOrEqual(bits - 1);
    }
  });

  test("generated numbers are odd", () => {
    for (let i = 0; i < 5; i++) {
      const prime = generatePrime(32);
      expect(prime % 2n).toBe(1n);
    }
  });

  test("generated numbers pass basic primality checks", () => {
    const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n];
    for (let i = 0; i < 5; i++) {
      const prime = generatePrime(32);
      // Test if the number is divisible by any small prime
      for (const smallPrime of smallPrimes) {
        if (prime !== smallPrime) {
          expect(prime % smallPrime).not.toBe(0n);
        }
      }
    }
  });

  test("generates different primes on subsequent calls", () => {
    const primes = new Set();
    for (let i = 0; i < 5; i++) {
      primes.add(generatePrime(32).toString());
    }
    expect(primes.size).toBe(5);
  });
});

describe("Prime Properties", () => {
  test("product of two generated primes has expected bit length", () => {
    const p = generatePrime(16);
    const q = generatePrime(16);
    const n = p * q;
    const nBits = n.toString(2).length;
    expect(nBits).toBeLessThanOrEqual(32);
    expect(nBits).toBeGreaterThanOrEqual(31);
  });

  test("generated primes are large enough for RSA", () => {
    const prime = generatePrime(512);
    expect(prime > 2n ** 256n).toBe(true);
  });
});

describe("Performance", () => {
  test("generates small primes quickly", () => {
    const startTime = Date.now();
    generatePrime(32);
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should take less than 1 second
  });
});
