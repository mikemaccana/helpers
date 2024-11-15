import { Lamports } from "@solana/web3.js";

export interface InitializeCryptoKeyPairOptions {
  envFileName?: string;
  envVariableName?: string;
  airdropAmount?: Lamports | null;
  minimumBalance?: Lamports;
  keyPairPath?: string;
}
