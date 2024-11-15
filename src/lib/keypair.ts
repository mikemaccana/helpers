import base58 from "bs58";
import { generateKeyPair, signBytes, verifySignature } from "@solana/web3.js";
import { assertKeyGenerationIsAvailable } from "@solana/assertions";

// Anza keys concatenate the 32 bytes raw private key and the 32 bytes raw public key.
// This format was commonly used in NaCl / libsodium when they were popular.
export const KEYPAIR_LENGTH = 64;
export const KEYPAIR_PUBLIC_KEY_OFFSET = 32;

// 0x302e020100300506032b657004220420
const PKCS_8_PREFIX = new Uint8Array([
  48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 112, 4, 34, 4, 32,
]);

export const PKCS_8_PREFIX_LNEGTH = PKCS_8_PREFIX.length;

// Allows us to use the WebCrypto API in Node
// and fixes "Value of "this" must be of type SubtleCrypto" errors
const exportKey = crypto.subtle.exportKey.bind(crypto.subtle);
const importKey = crypto.subtle.importKey.bind(crypto.subtle);

// Default value from Solana CLI
const DEFAULT_FILEPATH = "~/.config/solana/id.json";

export const generateExtractableKeyPair = async (): Promise<CryptoKeyPair> => {
  await assertKeyGenerationIsAvailable();
  const keyPair = await crypto.subtle.generateKey(
    /* algorithm */ "Ed25519", // Native implementation status: https://github.com/WICG/webcrypto-secure-curves/issues/20
    /* extractable */ true, //  Allows the private key to be exported (eg for saving it to a file)
    /* allowed uses */ ["sign", "verify"],
  );
  return keyPair;
};

// Take a webcrypto keypair and convert it to the same format Anza CLI uses
export const cryptoKeypairToSecretKeyJSON = async (
  keyPair: CryptoKeyPair,
): Promise<string> => {
  // Annoyingly we can't directly output the value of a private key
  // See https://wicg.github.io/webcrypto-secure-curves/#ed25519-operations
  // So lets strip out the PKCS8 prefix and return the raw bytes
  if (keyPair.privateKey.extractable === false) {
    throw new Error("Private key is not extractable");
  }
  const pkcs8Bytes = await exportKey("pkcs8", keyPair.privateKey);
  const rawPrivateKeyBytes = pkcs8Bytes.slice(PKCS_8_PREFIX_LNEGTH);

  // We can export the public key directly
  if (keyPair.publicKey.extractable === false) {
    throw new Error("Private key is not extractable");
  }
  const rawPublicKeyBytes = await exportKey("raw", keyPair.publicKey);

  // Concatenate the raw private and public keys using expansion
  const combinedArrayBuffer = new Uint8Array(KEYPAIR_LENGTH);
  combinedArrayBuffer.set(new Uint8Array(rawPrivateKeyBytes), 0);
  combinedArrayBuffer.set(
    new Uint8Array(rawPublicKeyBytes),
    KEYPAIR_PUBLIC_KEY_OFFSET,
  );

  return JSON.stringify(Array.from(combinedArrayBuffer));
};

export const bytesToCryptoKeyPair = async (
  bytes: Uint8Array,
  isExtractable = false,
): Promise<CryptoKeyPair> => {
  // Anza keys concatenate the 32 bytes raw private key and the 32 bytes raw public key.
  // This format was commonly used in NaCl / libsodium when they were popular.
  if (bytes.length !== 64) {
    throw new Error(
      "Invalid byte length for Anza keypair - should be 64 bytes",
    );
  }
  const rawPrivateKey = bytes.subarray(0, 32);
  const rawPublickey = bytes.subarray(32, KEYPAIR_LENGTH);

  const pkcs8PrivateKey = new Uint8Array([...PKCS_8_PREFIX, ...rawPrivateKey]);

  const privateKey = await importKey(
    "pkcs8",
    pkcs8PrivateKey,
    { name: "Ed25519" },
    isExtractable,
    ["sign"],
  );

  const publicKey = await importKey(
    "raw",
    rawPublickey,
    { name: "Ed25519" },
    isExtractable,
    ["verify"],
  );

  const keyPair: CryptoKeyPair = {
    privateKey,
    publicKey,
  };

  return keyPair;
};

export const getCryptoKeypairFromFile = async (
  filepath?: string,
): Promise<CryptoKeyPair> => {
  // Node-specific imports
  const path = await import("node:path");
  const { readFile } = await import("node:fs/promises");
  // Work out correct file name
  if (!filepath) {
    filepath = DEFAULT_FILEPATH;
  }
  if (filepath[0] === "~") {
    const home = process.env.HOME || null;
    if (home) {
      filepath = path.join(home, filepath.slice(1));
    }
  }

  // Get contents of file
  let fileContents: string;
  try {
    const fileContentsBuffer = await readFile(filepath);
    fileContents = fileContentsBuffer.toString();
  } catch (error) {
    throw new Error(`Could not read keypair from file at '${filepath}'`);
  }

  try {
    // Parse file and return the keyPair
    const parsedFileContents = Uint8Array.from(JSON.parse(fileContents));
    return bytesToCryptoKeyPair(parsedFileContents);
  } catch (thrownObject) {
    const error = thrownObject as Error;
    if (!error.message.includes("Unexpected token")) {
      throw error;
    }
    throw new Error(`Invalid secret key file at '${filepath}'!`);
  }
};

// Get a keypair based on an environment variable
// The keypair is expected to be a JSON string of the raw bytes
// per what Anza CLI uses
export const getCryptoKeypairFromEnvironment = (variableName: string) => {
  const privateKeyString = process.env[variableName];
  if (!privateKeyString) {
    throw new Error(`Please set '${variableName}' in environment.`);
  }

  try {
    let decodedSecretKey = Uint8Array.from(JSON.parse(privateKeyString));
    return bytesToCryptoKeyPair(decodedSecretKey);
  } catch (error) {
    throw new Error(
      `Invalid private key in environment variable '${variableName}'!`,
    );
  }
};

export const addCryptoKeypairToEnvFile = async (
  keypair: CryptoKeyPair,
  variableName: string,
  envFileName?: string,
) => {
  // Node-specific imports
  const { appendFile } = await import("node:fs/promises");
  if (!envFileName) {
    envFileName = ".env";
  }
  const existingSecretKey = process.env[variableName];
  if (existingSecretKey) {
    throw new Error(`'${variableName}' already exists in env file.`);
  }
  const privateKeyString = await cryptoKeypairToSecretKeyJSON(keypair);
  await appendFile(
    envFileName,
    // TODO: Replace with actual Solana base58 version of public key
    // Check web3js source
    `\n# Solana Address: $FIXME\n${variableName}=${privateKeyString}`,
  );
};

// Shout out to Dean from WBA for this technique
export const makeCryptoKeypairs = (
  amount: number,
): Promise<Array<CryptoKeyPair>> => {
  return Promise.all(Array.from({ length: amount }, () => generateKeyPair()));
};
