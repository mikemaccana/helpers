import { type Connection, CryptoKeypair, LAMPORTS_PER_SOL, type PublicKey } from "@solana/web3.js";
import type { InitializeCryptoKeypairOptions } from "../types";
import { addCryptoKeypairToEnvFile, getCryptoKeypairFromEnvironment, getCryptoKeypairFromFile } from "./keypair";

const DEFAULT_AIRDROP_AMOUNT = 1 * LAMPORTS_PER_SOL;
const DEFAULT_MINIMUM_BALANCE = 0.5 * LAMPORTS_PER_SOL;
const DEFAULT_ENV_KEYPAIR_VARIABLE_NAME = "PRIVATE_KEY";

// TODO: honestly initializeCryptoKeypair is a bit vague
// we can probably give this a better name,
// just not sure what yet
export const initializeCryptoKeypair = async (
  connection: Connection,
  options?: InitializeCryptoKeypairOptions,
): Promise<CryptoKeypair> => {
  const {
    keypairPath,
    envFileName,
    envVariableName = DEFAULT_ENV_KEYPAIR_VARIABLE_NAME,
    airdropAmount = DEFAULT_AIRDROP_AMOUNT,
    minimumBalance = DEFAULT_MINIMUM_BALANCE,
  } = options || {};

  let keypair: CryptoKeyPair;

  if (keypairPath) {
    keypair = await getCryptoKeypairFromFile(keypairPath);
  } else if (process.env[envVariableName]) {
    keypair = getCryptoKeypairFromEnvironment(envVariableName);
  } else {
    keypair = generateKeyPair();
    await addCryptoKeypairToEnvFile(keypair, envVariableName, envFileName);
  }

  if (airdropAmount) {
    await airdropIfRequired(
      connection,
      keypair.publicKey,
      airdropAmount,
      minimumBalance,
    );
  }

  return keypair;
}

// Not exported as we don't want to encourage people to
// request airdrops when they don't need them, ie - don't bother
// the faucet unless you really need to!
const requestAndConfirmAirdrop = async (
  connection: Connection,
  publicKey: PublicKey,
  amount: number,
) => {
  const airdropTransactionSignature = await connection.requestAirdrop(
    publicKey,
    amount,
  );
  // Wait for airdrop confirmation
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropTransactionSignature,
    },
    // "finalized" is slow but we must be absolutely sure
    // the airdrop has gone through
    "finalized",
  );
  return connection.getBalance(publicKey, "finalized");
};

export const airdropIfRequired = async (
  connection: Connection,
  publicKey: PublicKey,
  airdropAmount: number,
  minimumBalance: number,
): Promise<number> => {
  const balance = await connection.getBalance(publicKey, "confirmed");
  if (balance < minimumBalance) {
    return requestAndConfirmAirdrop(connection, publicKey, airdropAmount);
  }
  return balance;
};