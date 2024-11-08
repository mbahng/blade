import { inverse, EccCurve, EccPoint } from "./keys/ecc.js"; 
import { Hex } from "./bytestream.js";
import { generatePrime } from "./primes.js";

let p = new Hex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
let a = new Hex("0000000000000000000000000000000000000000000000000000000000000000");
let b = new Hex("0000000000000000000000000000000000000000000000000000000000000007");

let secp256k1 = new EccCurve(p, a, b);

let G = new EccPoint(
  new Hex("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"),
  new Hex("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8"),
  secp256k1
);

console.log(G);

let k = new Hex("ABCDE"); 

let prod = G.mul(k); 

console.log(prod);


