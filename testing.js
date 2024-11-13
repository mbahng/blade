import { secp256k1 } from "./src/keys/ecc.js"; 
import { Hex } from "./src/utils/bytestream.js";

let keypair = secp256k1(true); 

let first = keypair.public.point; 
let second = keypair.public.G.mul(keypair.private.k);

console.log(first); 
console.log(second); 

console.log(first.eq(second));
