import { describe, test } from "node:test";
import { generateKeyPair, generateKeyPairSigner, lamports } from "@solana/web3.js";
import { connect, createAccountsMintsAndTokenAccounts, makeTokenMint } from "..";
import { getTokenMetadata } from "@solana/spl-token";
import assert from "node:assert";
import { getDefaultRpc } from "./connect";
import { SOL } from "../../lib/constants";

const LOCALHOST = "http://127.0.0.1:8899";

describe("makeTokenMint", () => {
  test("makeTokenMint makes a new mint with the specified metadata", async () => {
    const connection = connect();
    const mintAuthority = await generateKeyPairSigner();
    const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = connect();
    await connection.airdropIfRequired(mintAuthority.address, lamports(100n * SOL), lamports(1n * SOL));

    const name = "Unit test token";
    const symbol = "TEST";
    const decimals = 9;
    const uri = "https://example.com";
    const additionalMetadata = {
      shlerm: "frobular",
      glerp: "flerpy",
      gurperderp: "erpy",
      nurmagerd: "flerpy",
      zurp: "flerpy",
      eruper: "flerpy",
      zerperurperserp: "flerpy",
      zherp: "flerpy",
    };

    const mintAddress = await makeTokenMint(rpc, mintAuthority, name, symbol, decimals, uri, additionalMetadata);

    assert.ok(mintAddress);

    const tokenMetadata = await getTokenMetadata(rpc, mintAddress);

    if (!tokenMetadata) {
      throw new Error(`Token metadata not found for mint address ${mintAddress}`);
    }

    assert.equal(tokenMetadata.mint.toBase58(), mintAddress.toBase58());
    // TODO was toBase58 but that doesn't exist on addresses
    assert.equal(tokenMetadata.updateAuthority?.toBase58(), mintAuthority.address.toString());
    assert.equal(tokenMetadata.name, name);
    assert.equal(tokenMetadata.symbol, symbol);
    assert.equal(tokenMetadata.uri, uri);
    assert.deepEqual(tokenMetadata.additionalMetadata, Object.entries(additionalMetadata));
  });
});

// describe("createAccountsMintsAndTokenAccounts", () => {
//   test("createAccountsMintsAndTokenAccounts works", async () => {
//     const payer = await generateKeyPairSigner();
//     const connection = connect();
//     await airdropIfRequired(connection, payer.address, lamports(100n * SOL), lamports(1n * SOL));

//     const SOL_BALANCE = lamports(BigInt(10n * SOL));

//     const usersMintsAndTokenAccounts = await createAccountsMintsAndTokenAccounts(
//       [
//         [1_000_000_000, 0], // User 0 has 1_000_000_000 of token A and 0 of token B
//         [0, 1_000_000_000], // User 1 has 0 of token A and 1_000_000_000 of token B
//       ],
//       SOL_BALANCE,
//       connection.rpc,
//       payer,
//     );

//     // Check all users have been created and have some SOL
//     const users = usersMintsAndTokenAccounts.users;
//     assert.equal(users.length, 2);
//     await Promise.all(
//       users.map(async (user) => {
//         const balance = await connection.getBalance(user.publicKey);
//         assert(balance === SOL_BALANCE);
//       }),
//     );

//     // Check the mints
//     assert.equal(usersMintsAndTokenAccounts.mints.length, 2);

//     // Check the token accounts
//     const tokenAccounts = usersMintsAndTokenAccounts.tokenAccounts;

//     // Get the balances of the token accounts for the first user
//     // (note there is no tokenAccountB balance yet)
//     const firstUserFirstTokenBalance = await connection.rpc.getTokenAccountBalance(
//       tokenAccounts[0][0], // First user, first token mint
//     );
//     assert(Number(firstUserFirstTokenBalance.value.amount) === 1_000_000_000);

//     // // Get the balances of the token accounts for the second user
//     // // (note there is no tokenAccountA account yet)
//     const secondUserSecondTokenBalance = await connection.rpc.getTokenAccountBalance(tokenAccounts[1][1]); // Second user, second token mint
//     assert(Number(secondUserSecondTokenBalance.value.amount) === 1_000_000_000);
//   });
// });
