import { BtcWallet } from "../src/keys/wallet.js";
import { TransactionOutput } from "../src/transactions/transactions.js";
import { secp256k1 } from "../src/keys/ecc.js";

describe("Wallet", () => {
  let wallet;
  let receiverWallet;

  beforeEach(() => {
    wallet = BtcWallet.random();
    receiverWallet = BtcWallet.random();
  });

  describe("Basic Wallet Functions", () => {
    test("creates wallet with random keypair", () => {
      expect(wallet.master_keypair).toBeDefined();
      expect(wallet.master_keypair.public).toBeDefined();
      expect(wallet.master_keypair.private).toBeDefined();
    });

    test("creates wallet with provided keypair", () => {
      const keypair = secp256k1(true);
      const customWallet = new BtcWallet(keypair);
      expect(customWallet.master_keypair).toBe(keypair);
    });

    test("new wallet has zero balance", () => {
      expect(wallet.balance()).toBe(0n);
    });
  });

  describe("Transaction Outputs (TXOs)", () => {
    test("new wallet has empty TXOs", () => {
      expect(wallet.txos()).toHaveLength(0);
    });

    test("tracks TXOs in master keypair", () => {
      const txo = new TransactionOutput(wallet.master_keypair.public, 100n);
      wallet.master_keypair.public.txos.push(txo);
      
      const walletTxos = wallet.txos();
      expect(walletTxos).toContain(txo);
      expect(wallet.balance()).toBe(100n);
    });

    test("correctly calculates balance with multiple TXOs", () => {
      const txo1 = new TransactionOutput(wallet.master_keypair.public, 100n);
      const txo2 = new TransactionOutput(wallet.master_keypair.public, 150n);
      wallet.master_keypair.public.txos.push(txo1, txo2);
      
      expect(wallet.balance()).toBe(250n);
    });

    test("excludes spent TXOs from balance", () => {
      const txo1 = new TransactionOutput(wallet.master_keypair.public, 100n);
      const txo2 = new TransactionOutput(wallet.master_keypair.public, 150n);
      txo1.spent = true;
      
      wallet.master_keypair.public.txos.push(txo1, txo2);
      expect(wallet.balance()).toBe(150n);
    });
  });
});
