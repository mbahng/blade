from __future__ import annotations
from datetime import datetime
from keys import Wallet
from typing import Union


class Transaction: 

    def __init__(self, sender: Wallet, receiver: Wallet, value: float, timestamp: datetime):
        self.sender = sender 
        self.receiver = receiver
        self.value = value 
        self.timestamp = timestamp


class Block: 

    def __init__(self):
        self.transactions = set()
