import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./bytestream.js";

let kp = secp256k1(true); 
let pub = kp.public; 
let priv = kp.private; 
let i = new Hex("000000000000000000000000000000000000000000000001");

let cpriv = priv.ckd(i);
let cpub = pub.ckd(i); 

console.log(cpriv.K);
console.log(cpub.K);
