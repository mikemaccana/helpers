import { describe, test } from "node:test";
import { CryptoKeyPair, generateKeyPair } from "@solana/web3.js";
import { SOL } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import {
  airdropIfRequired,
  confirmTransaction,
  getSimulationComputeUnits,
} from "../../src";
import { sendAndConfirmTransaction } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import assert from "node:assert";
import { TransactionInstruction } from "@solana/web3.js";
import { CryptoKey } from "@solana/web3.js";

const LOCALHOST = "http://127.0.0.1:8899";
const MEMO_PROGRAM_ID = new CryptoKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

describe("confirmTransaction", () => {
  test("confirmTransaction works for a successful transaction", async () => {
    const rpc = getDefaultRpc(LOCALHOST);
    const [sender, recipient] = [generateKeyPair(), generateKeyPair()];
    const lamportsToAirdrop = 2 * SOL;
    await airdropIfRequired(rpc, sender.publicKey, lamportsToAirdrop, 1 * SOL);

    const signature = await sendAndConfirmTransaction(
      rpc,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sender.publicKey,
          toPubkey: recipient.publicKey,
          lamports: 1_000_000,
        }),
      ),
      [sender],
    );

    await confirmTransaction(rpc, signature);
  });
});

describe("getSimulationComputeUnits", () => {
  test("getSimulationComputeUnits returns 300 CUs for a SOL transfer, and 3888 for a SOL transfer with a memo", async () => {
    const rpc = getDefaultRpc(LOCALHOST);
    const sender = generateKeyPair();
    await airdropIfRequired(rpc, sender.publicKey, 1 * SOL, 1 * SOL);
    const recipient = generateKeyPair().publicKey;

    const sendSol = SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: 1_000_000,
    });

    const sayThanks = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from("thanks"),
    });

    const computeUnitsSendSol = await getSimulationComputeUnits(
      rpc,
      [sendSol],
      sender.publicKey,
      [],
    );

    // TODO: it would be useful to have a breakdown of exactly how 300 CUs is calculated
    assert.equal(computeUnitsSendSol, 300);

    const computeUnitsSendSolAndSayThanks = await getSimulationComputeUnits(
      rpc,
      [sendSol, sayThanks],
      sender.publicKey,
      [],
    );

    // TODO: it would be useful to have a breakdown of exactly how 3888 CUs is calculated
    // also worth reviewing why memo program seems to use so many CUs.
    assert.equal(computeUnitsSendSolAndSayThanks, 3888);
  });
});
