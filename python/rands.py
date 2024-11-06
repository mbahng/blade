import random 
import math

def get_low_primes(n): 
    dp = [2, 3] 
    next = 5
    while len(dp) < n: 
        if all([next % div != 0 for div in dp if div < math.sqrt(next)]): 
            dp.append(next) 
        next += 2

    return dp

low_primes = get_low_primes(5000)

def random_int(n: int): 
    return random.randrange(2**(n-1) + 1, 2**n - 1)

def test_primality_low(number): 
    return all([number % lp != 0 for lp in low_primes if lp <= math.sqrt(number)])

def test_primality_high(num, t):
    '''Run some iterations of Rabin Miller Primality test'''
    # 2^s d = n - 1

    s, d = 0, num - 1
    while d % 2 == 0:
        d >>= 1
        s += 1
    assert(2**s * d == num-1)
 
    def trialComposite(a):
        # random integer a coprime to n, but hard to check, 
        # so pick at random  

        # first condition a^d \equiv 1 (mod n)
        if pow(a, d, num) == 1:
            return False

        # second condition a^{2^{r} d} \equiv -1 (mod n) for some 0 <= r < s
        for i in range(s):
            if pow(a, 2**i * d, num) == num-1:
                return False
        return True
 
    for _ in range(t):
        a = random.randrange(2, num)
        if trialComposite(a):
            return False
    return True

def generate_prime(n):
    while True: 
        candidate = random_int(n) 
        if test_primality_low(candidate) and test_primality_high(candidate, 10): 
            return candidate

