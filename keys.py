from __future__ import annotations
import hashlib 
import rands 

def hash(x): 
    return pow(x + 6748, 300, x)

class PublicKey: 
    
    def __init__(self, number, k): 
        self.n = number 
        self.k = k

    def __call__(self, message): 
        return pow(message, self.k, self.n)

class PrivateKey: 

    def __init__(self, p, q, k): 
        self.p = p 
        self.q = q 
        self.n = p * q
        self.k = k

    def __call__(self, message): 
        '''Decrypt a message. '''
        # first calculate the secret recovery exponent j
        # from the equation kj \equiv 1 mod \varphi(n)
        # -> diophantine eq: kx + phi y = 1

        phi = (self.p - 1) * (self.q - 1) # totient

        def simple_linear_diophantine_r(a, b):
            q, r = divmod(a, b)
            if r == 0:
                return (0, b)
            else:
                x, y = simple_linear_diophantine_r(b, r)
                return (y, x - q * y)

        j, _ = simple_linear_diophantine_r(self.k, phi)

        assert((self.k * j) % phi == 1)

        # use recovery exponent to get original message 
        recovered = pow(message, j, self.n)

        return recovered

class Key: 

    def __init__(self): 
        p = rands.generate_prime(256)
        q = rands.generate_prime(256)
        n = p * q 
        k = 65537

        # pub and priv are inverses, so can be called in either order
        self.pub = PublicKey(n, k)
        self.priv = PrivateKey(p, q, k)

    def send_message(self, message, receiver: Key): 
        # encrypt message using public key of receiver 
        encrypted = receiver.pub(message) 
        
        # then, encrypt using my private key with hash function
        mid = self.priv(hash(encrypted)) 

        return (encrypted, mid, self.pub)

    def receive_message(self, message): 
        a, b, c = message
        # check sender's identity 
        return hash(a) == c(b), self.priv(a)


class Wallet: 
    '''A container for keys.'''

    def __init__(self): 
        self.keys = []

    def add_key(self): 
        self.keys.append(Key())

