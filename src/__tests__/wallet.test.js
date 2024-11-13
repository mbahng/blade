import { Wallet } from "../keys/wallet.js";
import { TransactionOutput } from "../transactions/transactions.js";
import { secp256k1 } from "../keys/ecc.js";

describe("Wallet", () => {
  let wallet;
  let receiverWallet;

  beforeEach(() => {
    wallet = Wallet.random();
    receiverWallet = Wallet.random();
  });

  describe("Basic Wallet Functions", () => {
    test("creates wallet with random keypair", () => {
      expect(wallet.master_keypair).toBeDefined();
      expect(wallet.master_keypair.public).toBeDefined();
      expect(wallet.master_keypair.private).toBeDefined();
    });

    test("creates wallet with provided keypair", () => {
      const keypair = secp256k1(true);
      const customWallet = new Wallet(keypair);
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

  // describe("Transactions", () => {
  //   beforeEach(() => {
  //     // Setup initial balance
  //     const initialTxo = new TransactionOutput(wallet.master_keypair.public, 1000n);
  //     wallet.master_keypair.public.txos.push(initialTxo);
  //   });
  //
  //   test("creates valid transaction with exact amount", () => {
  //     const tx = wallet.send(receiverWallet.master_keypair.public, 1000n);
  //    
  //     expect(tx.outputs).toHaveLength(1);
  //     expect(tx.outputs[0].value).toBe(1000n);
  //     expect(tx.outputs[0].public_key).toBe(receiverWallet.master_keypair.public);
  //   });
  //
  //   test("creates transaction with change", () => {
  //     const tx = wallet.send(receiverWallet.master_keypair.public, 600n);
  //    
  //     expect(tx.outputs).toHaveLength(2);
  //     expect(tx.outputs[0].value).toBe(600n);
  //     expect(tx.outputs[1].value).toBe(400n);
  //     expect(tx.outputs[1].public_key).toBe(wallet.master_keypair.public);
  //   });
  //
  //   test("handles multiple input TXOs", () => {
  //     wallet.master_keypair.public.txos = [];
  //     const txo1 = new TransactionOutput(wallet.master_keypair.public, 400n);
  //     const txo2 = new TransactionOutput(wallet.master_keypair.public, 400n);
  //     wallet.master_keypair.public.txos.push(txo1, txo2);
  //
  //     const tx = wallet.send(receiverWallet.master_keypair.public, 600n);
  //    
  //     expect(tx.inputs).toHaveLength(2);
  //     expect(tx.outputs[0].value).toBe(600n);
  //     expect(tx.outputs[1].value).toBe(200n);
  //   });
  //
  //   test("throws error on insufficient balance", () => {
  //     expect(() => {
  //       wallet.send(receiverWallet.master_keypair.public, 2000n);
  //     }).toThrow("Transaction Failed");
  //   });
  // });

  // describe("Child Key Handling", () => {
  //   test("includes child key TXOs in balance", () => {
  //     const childKey = wallet.master_keypair.private.ckd();
  //    
  //     const masterTxo = new TransactionOutput(wallet.master_keypair.public, 100n);
  //     const childTxo = new TransactionOutput(childKey.K, 150n);
  //    
  //     wallet.master_keypair.public.txos.push(masterTxo);
  //     childKey.K.txos.push(childTxo);
  //    
  //     expect(wallet.balance()).toBe(250n);
  //   });
  //
  //   test("handles nested child keys", () => {
  //     const child = wallet.master_keypair.private.ckd();
  //     const grandchild = child.ckd();
  //    
  //     const txo1 = new TransactionOutput(child.K, 100n);
  //     const txo2 = new TransactionOutput(grandchild.K, 200n);
  //    
  //     child.K.txos.push(txo1);
  //     grandchild.K.txos.push(txo2);
  //    
  //     expect(wallet.balance()).toBe(300n);
  //   });
  //
  //   test("can send from combined UTXOs across key hierarchy", () => {
  //     const child = wallet.master_keypair.private.ckd();
  //    
  //     const masterTxo = new TransactionOutput(wallet.master_keypair.public, 300n);
  //     const childTxo = new TransactionOutput(child.K, 300n);
  //    
  //     wallet.master_keypair.public.txos.push(masterTxo);
  //     child.K.txos.push(childTxo);
  //    
  //     const tx = wallet.send(receiverWallet.master_keypair.public, 500n);
  //    
  //     expect(tx.inputs).toHaveLength(2);
  //     expect(tx.outputs[0].value).toBe(500n);
  //     expect(tx.outputs[1].value).toBe(100n);
  //   });
  // });
});
