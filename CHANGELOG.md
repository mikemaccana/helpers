## 2.6

- Added Transaction send helpers. `prepareTransactionWithCompute()` and `sendTransactionWithRetry()`
- Added Transaction Parser helper functions `getIdlParsedAccountData()`, `parseAnchorTransactionEvents()` and `getIdlParsedInstructionData()`
- Fixed `createAccountsMintsAndTokenAccounts()` function to use correct commitment and not `max` blockhash
- Fixed `confirmTransaction()` to not use correct commitment

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
