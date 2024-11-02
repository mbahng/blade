from __future__ import annotations
import hashlib, hmac 
import rsa


class Key: 
    '''A pseudorandomly generated private RSA key.'''

    def __init__(self): 
        public_key, private_key = rsa.newkeys(256) 
        self._private_key = private_key 
        self.public_key = public_key
        self.p = private_key.p
        self.q = private_key.q
        self.n = private_key.d

    def encrypt_message(self, plaintext, to: Key): 
        plaintext = plaintext.encode("utf8")
        return rsa.encrypt(plaintext, to.public_key)

    def decrypt_message(self, ciphertext): 
        return rsa.decrypt(ciphertext, self._private_key).decode("utf8")

def ckd(parent: Key):
    '''A child key derivation (CKD) function that derives children keys from parent ekys. '''

alice = Key() 
bob = Key() 

print(alice.public_key)
print(alice._private_key)

emsg = alice.encrypt_message("hello world", bob) 

print(emsg.hex())

dmsg = bob.decrypt_message(emsg)

print(dmsg)
