import { secp192k1, secp256k1, secp256r1 } from "./keys/ecc.js"; 
import { Hex } from "./bytestream.js";

let kp = secp256k1(true); 
let pub = kp.public; 
let priv = kp.private; 

for (let i = 0; i < 10; i++) {
  priv.ckd();
  console.log(priv.last_key_index);
  pub.ckd(); 
}

