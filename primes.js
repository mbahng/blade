import { expmod } from "./hash.js";

function getLowPrimes(n) {
  const dp = [2n, 3n];
  let next = 5;
  while (dp.length < n) {
    if (dp.every(div => BigInt(next) % div !== 0n)) {
      dp.push(BigInt(next));
    }
    next += 2;
  }
  return dp;
}

const lowPrimes = getLowPrimes(5000);

export function randomInt(n) {
  // lower bound, 3.17 is so that product is guaranteed to give 2n binary digits
  let lb = 3.17 * (2 ** (n-2)); 
  let up = 2 ** n;  // upper bound 
  let x = BigInt(Math.floor(Math.random() * (up - lb) + lb)); 
  if (x % 2n == 0n) {
    return x + 1n; // ensure output is odd
  }
  return x; 
}

function testPrimalityLow(number) {
  return lowPrimes.every(lp => number % lp !== 0n);
}

function randomBigInt(n) {
  n = BigInt(n);
  if (n < 2n) {
    throw new Error("Upper bound must be >= 2");
  }
  
  const bits = n.toString(2).length;
  
  while (true) {
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    crypto.getRandomValues(bytes);
    
    let val = 0n;
    for (const byte of bytes) {
      val = (val << 8n) | BigInt(byte);
    }
    
    val = val & ((1n << BigInt(bits)) - 1n);
    
    if (val >= 2n && val <= n) {
      return val;
    }
  }
}

function testPrimalityHigh(num, t) {
  if (num <= 1n || num % 2n === 0n) return false;
  if (num === 2n || num === 3n) return true;

  // Calculate s and d where num - 1 = d * 2^s
  let s = 0n;
  let d = num - 1n;
  while (d % 2n === 0n) {
    s++;
    d /= 2n;
  }

  witnessLoop: for (let i = 0; i < t; i++) {
    const a = randomBigInt(num - 3n) + 2n; // Random in [2, num-2]
    let x = expmod(a, d, num);
    
    if (x === 1n || x === num - 1n) continue;

    for (let r = 1n; r < s; r++) {
      x = (x * x) % num;
      if (x === 1n) return false;
      if (x === num - 1n) continue witnessLoop;
    }
    return false; // Definitely composite
  }
  
  return true; // Probably prime
}

export function generatePrime(n) { 
  while (true) {
    const candidate = randomInt(n);
    if (testPrimalityLow(candidate) && testPrimalityHigh(candidate, 20)) {
      return candidate;
    }
  }
}
