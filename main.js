import { Hex, Bin, hex_to_dec, Stream } from "./bytestream.js";
import { sha256 } from "./hash.js";
import { Key } from "./rsa.js";

let k = new Key(); 
let pubkey = k.public; 
let privkey = k.private;

let message = new Stream("hello");
console.log("Original message:", message.toString());

let encoded = pubkey.map(message);
console.log("Encoded message:", encoded.toString());

let decoded = privkey.map(encoded); 
console.log("Decoded message:", decoded.toString());
