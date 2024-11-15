# Version 3

## 3.0

- Use @solana/web3.js version 2

  - Nearly everything returns a `Promise<>` now.
  - `Keypair.generate();` is now `generateKeyPair()`.
  - `Keypair` is now `CryptoKeyPair`
  - `keyPair` is spelt `keyPair` everywhere like normal JS/TS variables
  - `PublicKey` are just `address` now
  - `secretkey` is now `privateKey`
  - Values are in `Lamports` which can be made from the native JS `BigInt`
  - A value `SOL` is exported, to match the previous convenience value `LAMPORTS_PER_SOL`. For example, use `10n * SOL` for 10 SOL.
  - Commitment levels are defined explicitly
  - We get the transaction signature from signed transaction

- We no longer support base58 encoded private keys - instead we use the Array of numbers format exclusively. If you have base58 encoded private keys you can convert them with the previous version of this library.
- Replace @solana/spl-token and @solana/spl-token-metadata with their new replacements '@solana-program/token'

## 2.5

- Add `makeTokenMint()`
- 2.5.4 includes a few fixes to build system and TS types that were missing in earlier 2.5.x releases
- 2.5.6 includes a fix for esm module post-build script

## 2.4

- Add `createAccountsMintsAndTokenAccounts()`

## 2.3

Improved browser support by only loading node-specific modules when they are needed. Thanks @piotr-layerzero!

## 2.2

- Add `getSimulationComputeUnits()`

## 2.1

- Add `initializeKeypair()`
- Change documentation to be task based.

## 2.0

- **Breaking**: Replace both `requestAndConfirmAirdropIfRequired()` and `requestAndConfirmAirdrop()` with a single function, `airdropIfRequired()`. See [README.md]!
- Fix error handling in `confirmTransaction()` to throw errors correctly.
- Added `getLogs()` function

## 1.5

- Added `getExplorerLink()`

## 1.4

- Added `requestAndConfirmAirdropIfRequired()`

## 1.3

- Now just `helpers`. The old `node-helpers` package is marked as deprecated.
- Added `requestAndConfirmAirdrop()`
- Added `getCustomErrorMessage()`

## 1.2

- Added `addKeypairToEnvFile()`

## 1.0

Original release.
