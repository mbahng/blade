import rands
import hashlib
from keys import Wallet, PrivateKey, PublicKey, Key, hash
from transactions import Transaction, Block

genesis = Block()
alice = Key() 
bob = Key() 

message = alice.send_message(1234, bob) 

print(bob.receive_message(message)) 
