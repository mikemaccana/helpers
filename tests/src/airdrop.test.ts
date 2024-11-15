import { describe, test } from "node:test";
import {
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSignerFromKeyPair,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  generateKeyPair,
  getAddressFromPublicKey,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
} from "@solana/web3.js";
import {
  airdropIfRequired,
  getExplorerLink,
  initializeCryptoKeyPair,
  type InitializeCryptoKeyPairOptions,
} from "../../src";
import assert from "node:assert";
import dotenv from "dotenv";
import { unlink as deleteFile } from "node:fs/promises";
// import { SystemProgram } from "@solana/web3.js";
// import { Transaction } from "@solana/web3.js";
// import { sendAndConfirmTransaction } from "@solana/web3.js";
import { SOL } from "../../src/lib/constants";
import { getDefaultRpc } from "./connect";
import { getTransferSolInstruction } from "@solana-program/system";

const LOCALHOST = "http://127.0.0.1:8899";

// describe("initializeCryptoKeyPair", () => {
//   const rpc = getDefaultRpc(LOCALHOST);
//   const keyPairVariableName = "INITIALIZE_KEYPAIR_TEST";

//   test("generates a new keyPair and airdrops needed amount", async () => {
//     // We need to use a specific file name to avoid conflicts with other tests
//     const envFileName = "../.env-unittest-initialize-crypto-keyPair";

//     const initializeCryptoKeyPairOptions: InitializeCryptoKeyPairOptions = {
//       envFileName,
//       envVariableName: keyPairVariableName,
//     };

//     const userBefore = await initializeCryptoKeyPair(
//       rpc,
//       initializeCryptoKeyPairOptions,
//     );

//     const addressBefore = await getAddressFromPublicKey(userBefore.publicKey);

//     // Check balance
//     const balanceBeforeResponse = await rpc.getBalance(addressBefore).send();

//     assert.ok(balanceBeforeResponse.value > 0);

//     // Check that the environment variable was created
//     dotenv.config({ path: envFileName });
//     const privateKeyString = process.env[keyPairVariableName];
//     if (!privateKeyString) {
//       throw new Error(`${privateKeyString} not found in environment`);
//     }

//     // Now reload the environment and check it matches our test keyPair
//     const userAfter = await initializeCryptoKeyPair(
//       rpc,
//       initializeCryptoKeyPairOptions,
//     );

//     const addressAfter = await getAddressFromPublicKey(userAfter.publicKey);

//     // Check the keyPair is the same
//     assert(addressBefore === addressAfter);

//     // Check balance has not changed
//     const balanceAfterResponse = await rpc.getBalance(addressAfter).send();

//     assert.equal(balanceBeforeResponse.value, balanceAfterResponse.value);

//     // Check there is a secret key
//     assert.ok(userAfter.privateKey);

//     await deleteFile(envFileName);
//   });
// });

describe("airdropIfRequired", () => {
  test("Checking the balance after airdropIfRequired", async () => {
    const cryptoKeyPair = await generateKeyPair();
    const rpc = getDefaultRpc(LOCALHOST);

    // TODO: only adding websocket because apparently we need it to use sendAndConfirmTransaction()?
    // See web3js README
    const rpcSubscriptions = createSolanaRpcSubscriptions(
      "ws://127.0.0.1:8900",
    );
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions,
    });

    const address = await getAddressFromPublicKey(cryptoKeyPair.publicKey);
    const originalBalanceResponse = await rpc.getBalance(address).send();

    assert.equal(originalBalanceResponse.value, 0);
    const lamportsToAirdrop = lamports(1n * SOL);
    const minimumBalance = lamports(1n * SOL);

    const newBalance = await airdropIfRequired(
      rpc,
      address,
      lamportsToAirdrop,
      minimumBalance,
    );

    assert.equal(newBalance, lamportsToAirdrop);

    // From examples/transfer-lamports/src/example.ts

    // Spend our SOL now to ensure we can use the airdrop immediately

    const recipient = await generateKeyPair();
    const recipientAddress = await getAddressFromPublicKey(recipient.publicKey);
    const transactionSigner = await createSignerFromKeyPair(cryptoKeyPair);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const log = console.log.bind(console);

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      // Every transaction must state from which account the transaction fee should be debited from,
      // and that account must sign the transaction. Here, we'll make the source account pay the fee.
      (tx) => setTransactionMessageFeePayer(transactionSigner.address, tx),
      // A transaction is valid for execution as long as it includes a valid lifetime constraint. Here
      // we supply the hash of a recent block. The network will accept this transaction until it
      // considers that hash to be 'expired' for the purpose of transaction execution.
      (tx) => (
        log.info(latestBlockhash, "[step 1] Setting the transaction lifetime"),
        setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
      ),
      // Every transaction needs at least one instruction. This instruction describes the transfer.
      (tx) =>
        appendTransactionMessageInstruction(
          /**
          The system program has the exclusive right to transfer Lamports from one account to
          another. Here we use an instruction creator from the `@solana-program/system` package
          to create a transfer instruction for the system program.
           */
          (log.info(),
          getTransferSolInstruction({
            amount: lamports(1_000_000n),
            destination: recipientAddress,
            /**
            By supplying a `TransactionSigner` here instead of just an address, you give this
            transaction message superpowers. Later in this example, the
            `signTransactionMessageWithSigners` method, in consideration of the fact that the
            source account must sign System program transfer instructions, will use this
            `TransactionSigner` to produce a transaction signed on behalf of
            `transactionSigner.address`, without any further configuration.
             */
            source: transactionSigner,
          })),
          tx,
        ),
    );

    // STEP 2: SIGN THE TRANSACTION
    // In order to prove that the owner of the account from which the tokens are being transferred
    // approves of the transfer itself, the transaction will need to include a cryptographic signature
    // that only the owner of that account could produce. We have already loaded the account owner's
    // key pair above, so we can sign the transaction now.
    const signedTransaction =
      await signTransactionMessageWithSigners(transactionMessage);

    const signature = getSignatureFromTransaction(signedTransaction);

    await sendAndConfirmTransaction(signedTransaction, {
      commitment: "finalized",
    });

    const explorerLink = getExplorerLink("transaction", signature, "localhost");
  });

  //   test("doesn't request unnecessary airdrops", async () => {
  //     const keyPair = generateKeyPair();
  //     const rpc = getDefaultRpc(LOCALHOST);
  //     const originalBalance = await rpc.getBalance(keyPair.publicKey);
  //     assert.equal(originalBalance, 0);
  //     const lamportsToAirdrop = 1SOL;

  //     await airdropIfRequired(rpc, keyPair.publicKey, lamportsToAirdrop, 500_000);
  //     const finalBalance = await airdropIfRequired(
  //       rpc,
  //       keyPair.publicKey,
  //       lamportsToAirdrop,
  //       1SOL,
  //     );
  //     // Check second airdrop didn't happen (since we only had 1 sol)
  //     assert.equal(finalBalance, 1lamportsToAirdrop);
  //   });

  //   test("airdropIfRequired does airdrop when necessary", async () => {
  //     const keyPair = generateKeyPair();
  //     const rpc = getDefaultRpc(LOCALHOST);
  //     const originalBalance = await rpc.getBalance(keyPair.publicKey);
  //     assert.equal(originalBalance, 0);
  //     // Get 999_999_999 lamports if we have less than 500_000 lamports
  //     const lamportsToAirdrop = 1SOL - 1;
  //     await airdropIfRequired(rpc, keyPair.publicKey, lamportsToAirdrop, 500_000);
  //     // We only have 999_999_999 lamports, so we should need another airdrop
  //     const finalBalance = await airdropIfRequired(
  //       rpc,
  //       keyPair.publicKey,
  //       1SOL,
  //       1SOL,
  //     );
  //     // Check second airdrop happened
  //     assert.equal(finalBalance, 2SOL - 1);
  //   });
});
