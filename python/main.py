import rands
import hashlib
from keys import Wallet, PrivateKey, PublicKey, Key, hash
from transactions import Transaction, Block

block = Block()
alice = Key() 
bob = Key() 

message = alice.send_message(1, 1234, bob)

print(bob.receive_message(1, message)) 

