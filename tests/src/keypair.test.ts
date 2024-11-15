import { describe, test, before, after } from "node:test";
import assert from "node:assert";
import {
  addCryptoKeyPairToEnvFile,
  bytesToCryptoKeyPair,
  cryptoKeypairToSecretKeyJSON,
  generateExtractableKeyPair,
  getCryptoKeyPairFromEnvironment,
  getCryptoKeyPairFromFile,
  makeCryptoKeyPairs,
} from "../../src";
// See https://m.media-amazon.com/images/I/51TJeGHxyTL._SY445_SX342_.jpg
import { exec as execNoPromises } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink as deleteFile } from "node:fs/promises";
import dotenv from "dotenv";

const exec = promisify(execNoPromises);
const TEMP_DIR = "temp";

describe("bytesToCryptoKeyPair", () => {
  test("converts a byte array to a CryptoKeyPair", async () => {
    const x = [
      151, 24, 248, 226, 248, 85, 216, 178, 164, 113, 117, 70, 121, 115, 157,
      157, 205, 102, 210, 37, 141, 245, 213, 254, 199, 203, 222, 93, 253, 117,
      255, 18, 83, 40, 53, 247, 88, 125, 205, 117, 253, 145, 76, 192, 68, 252,
      144, 167, 77, 47, 55, 214, 164, 6, 126, 238, 7, 242, 183, 1, 108, 87, 126,
      9,
    ];

    const keyPair = await bytesToCryptoKeyPair(new Uint8Array(x), true);

    const testCryptoKeyPairString = await cryptoKeypairToSecretKeyJSON(keyPair);
  });
});

describe("addCryptoKeyPairToEnvFile", () => {
  const TEST_ENV_VAR_ARRAY_OF_NUMBERS = "TEST_ENV_VAR_ARRAY_OF_NUMBERS";
  let testCryptoKeyPair: CryptoKeyPair;

  before(async () => {
    testCryptoKeyPair = await generateExtractableKeyPair();

    const testCryptoKeyPairString =
      await cryptoKeypairToSecretKeyJSON(testCryptoKeyPair);

    process.env[TEST_ENV_VAR_ARRAY_OF_NUMBERS] = testCryptoKeyPairString;
  });

  test("generates new keyPair and writes to env if variable doesn't exist", async () => {
    // We need to use a specific file name to avoid conflicts with other tests
    const envFileName = "../.env-unittest-addkeyPairtoenvfile";
    await addCryptoKeyPairToEnvFile(
      testCryptoKeyPair,
      "TEMP_KEYPAIR",
      envFileName,
    );
    // Now reload the environment and check it matches our test keyPair
    dotenv.config({ path: envFileName });
    // Get the secret from the .env file
    const privateKeyString = process.env.TEMP_KEYPAIR;
    if (!privateKeyString) {
      throw new Error("TEMP_KEYPAIR not found in environment");
    }
    const decodedSecretKey = Uint8Array.from(JSON.parse(privateKeyString));
    const envCryptoKeyPair = await bytesToCryptoKeyPair(decodedSecretKey);
    assert.ok(envCryptoKeyPair.privateKey);
    await deleteFile(envFileName);
  });

  test("throws a nice error if the env var already exists", async () => {
    assert.rejects(
      async () =>
        addCryptoKeyPairToEnvFile(
          testCryptoKeyPair,
          TEST_ENV_VAR_ARRAY_OF_NUMBERS,
        ),
      {
        message: `'TEST_ENV_VAR_ARRAY_OF_NUMBERS' already exists in env file.`,
      },
    );
  });
});

describe("makeCryptoKeyPairs", () => {
  test("makeCryptoKeyPairs makes exactly the amount of keyPairs requested", async () => {
    // We could test more, but keyPair generation takes time and slows down tests
    const KEYPAIRS_TO_MAKE = 3;
    const keyPairs = await makeCryptoKeyPairs(KEYPAIRS_TO_MAKE);
    assert.equal(keyPairs.length, KEYPAIRS_TO_MAKE);
    assert.ok(keyPairs[KEYPAIRS_TO_MAKE - 1].privateKey);
  });

  test("makeCryptoKeyPairs() creates the correct number of keyPairs", async () => {
    const keyPairs = await makeCryptoKeyPairs(3);
    assert.equal(keyPairs.length, 3);
  });
});

describe("getCryptoKeyPairFromFile", () => {
  const TEST_KEY_PAIR_FILE = `${TEMP_DIR}/test-key-pair-file-do-not-use.json`;
  const CORRUPT_TEST_KEY_PAIR = `${TEMP_DIR}/corrupt-key-pair-file-do-not-use.json`;

  const MISSING_KEY_PAIR_FILE = "THIS FILE DOES NOT EXIST";
  before(async () => {
    const { stdout } = await exec(
      `solana-keygen new --force --no-bip39-passphrase -o ${TEST_KEY_PAIR_FILE}`,
    );
    assert(stdout.includes("Wrote new keyPair"));

    await writeFile(CORRUPT_TEST_KEY_PAIR, "I AM CORRUPT");
  });

  test("getting a keyPair from a file", async () => {
    await getCryptoKeyPairFromFile(TEST_KEY_PAIR_FILE);
  });

  test("throws a nice error if the file is missing", async () => {
    assert.rejects(
      async () => await getCryptoKeyPairFromFile(MISSING_KEY_PAIR_FILE),
      {
        message: `Could not read keyPair from file at '${MISSING_KEY_PAIR_FILE}'`,
      },
    );
  });

  test("throws a nice error if the file is corrupt", async () => {
    assert.rejects(() => getCryptoKeyPairFromFile(CORRUPT_TEST_KEY_PAIR), {
      message: `Invalid secret key file at '${CORRUPT_TEST_KEY_PAIR}'!`,
    });
  });

  after(async () => {
    await deleteFile(TEST_KEY_PAIR_FILE);
    await deleteFile(CORRUPT_TEST_KEY_PAIR);
  });
});

describe("getCryptoKeyPairFromEnvironment", () => {
  const TEST_ENV_VAR_ARRAY_OF_NUMBERS = "TEST_ENV_VAR_ARRAY_OF_NUMBERS";
  const TEST_ENV_VAR_WITH_BAD_VALUE = "TEST_ENV_VAR_WITH_BAD_VALUE";

  before(async () => {
    const randomCryptoKeyPair = await generateExtractableKeyPair();

    process.env[TEST_ENV_VAR_ARRAY_OF_NUMBERS] =
      await cryptoKeypairToSecretKeyJSON(randomCryptoKeyPair);

    process.env[TEST_ENV_VAR_WITH_BAD_VALUE] =
      "this isn't a valid value for a secret key";
  });

  test("getting a keyPair from an environment variable (array of numbers format)", async () => {
    const cryptoKeyPair = await getCryptoKeyPairFromEnvironment(
      TEST_ENV_VAR_ARRAY_OF_NUMBERS,
    );
  });

  test("throws a nice error if the env var doesn't exist", () => {
    assert.throws(() => getCryptoKeyPairFromEnvironment("MISSING_ENV_VAR"), {
      message: `Please set 'MISSING_ENV_VAR' in environment.`,
    });
  });

  test("throws a nice error if the value of the env var isn't valid", () => {
    assert.throws(
      () => getCryptoKeyPairFromEnvironment("TEST_ENV_VAR_WITH_BAD_VALUE"),
      {
        message: `Invalid private key in environment variable 'TEST_ENV_VAR_WITH_BAD_VALUE'!`,
      },
    );
  });
});
