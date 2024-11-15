import { describe, test } from "node:test";
import { Connection, generateKeyPair } from "@solana/web3.js";
import {
  airdropIfRequired,
  initializeCryptoKeypair,
  type InitializeCryptoKeypairOptions,
} from "../../src";
import assert from "node:assert";
import dotenv from "dotenv";
import { unlink as deleteFile } from "node:fs/promises";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CryptoKeypair } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";
import { sendAndConfirmTransaction } from "@solana/web3.js";

const LOCALHOST = "http://127.0.0.1:8899";

describe("initializeCryptoKeypair", () => {
  const connection = new Connection(LOCALHOST);
  const keypairVariableName = "INITIALIZE_KEYPAIR_TEST";

  test("generates a new keypair and airdrops needed amount", async () => {
    // We need to use a specific file name to avoid conflicts with other tests
    const envFileName = "../.env-unittest-initkeypair";
    const options: InitializeCryptoKeypairOptions = {
      envFileName,
      envVariableName: keypairVariableName,
    };

    const userBefore = await initializeCryptoKeypair(connection, options);

    // Check balance
    const balanceBefore = await connection.getBalance(userBefore.publicKey);
    assert.ok(balanceBefore > 0);

    // Check that the environment variable was created
    dotenv.config({ path: envFileName });
    const privateKeyString = process.env[keypairVariableName];
    if (!privateKeyString) {
      throw new Error(`${privateKeyString} not found in environment`);
    }

    // Now reload the environment and check it matches our test keypair
    const userAfter = await initializeCryptoKeypair(connection, options);

    // Check the keypair is the same
    assert.ok(userBefore.publicKey.equals(userAfter.publicKey));

    // Check balance has not changed
    const balanceAfter = await connection.getBalance(userAfter.publicKey);
    assert.equal(balanceBefore, balanceAfter);

    // Check there is a secret key
    assert.ok(userAfter.privateKey);

    await deleteFile(envFileName);
  });
});

describe("airdropIfRequired", () => {
  test("Checking the balance after airdropIfRequired", async () => {
    const keypair = await generateKeyPair();
    const connection = new Connection(LOCALHOST);
    const originalBalance = await connection.getBalance(keypair.publicKey);
    assert.equal(originalBalance, 0);
    const lamportsToAirdrop = 1 * LAMPORTS_PER_SOL;

    const newBalance = await airdropIfRequired(
      connection,
      keypair.publicKey,
      lamportsToAirdrop,
      1 * LAMPORTS_PER_SOL,
    );

    assert.equal(newBalance, lamportsToAirdrop);

    const recipient = await generateKeyPair();

    // Spend our SOL now to ensure we can use the airdrop immediately
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: CryptoKeyPair.publicKey,
          toPubkey: recipient.publicKey,
          lamports: 500_000_000,
        }),
      ),
      [keypair],
    );
  });

  test("doesn't request unnecessary airdrops", async () => {
    const keypair = generateKeyPair();
    const connection = new Connection(LOCALHOST);
    const originalBalance = await connection.getBalance(keypair.publicKey);
    assert.equal(originalBalance, 0);
    const lamportsToAirdrop = 1 * LAMPORTS_PER_SOL;

    await airdropIfRequired(
      connection,
      keypair.publicKey,
      lamportsToAirdrop,
      500_000,
    );
    const finalBalance = await airdropIfRequired(
      connection,
      keypair.publicKey,
      lamportsToAirdrop,
      1 * LAMPORTS_PER_SOL,
    );
    // Check second airdrop didn't happen (since we only had 1 sol)
    assert.equal(finalBalance, 1 * lamportsToAirdrop);
  });

  test("airdropIfRequired does airdrop when necessary", async () => {
    const keypair = generateKeyPair();
    const connection = new Connection(LOCALHOST);
    const originalBalance = await connection.getBalance(keypair.publicKey);
    assert.equal(originalBalance, 0);
    // Get 999_999_999 lamports if we have less than 500_000 lamports
    const lamportsToAirdrop = 1 * LAMPORTS_PER_SOL - 1;
    await airdropIfRequired(
      connection,
      keypair.publicKey,
      lamportsToAirdrop,
      500_000,
    );
    // We only have 999_999_999 lamports, so we should need another airdrop
    const finalBalance = await airdropIfRequired(
      connection,
      keypair.publicKey,
      1 * LAMPORTS_PER_SOL,
      1 * LAMPORTS_PER_SOL,
    );
    // Check second airdrop happened
    assert.equal(finalBalance, 2 * LAMPORTS_PER_SOL - 1);
  });
});
