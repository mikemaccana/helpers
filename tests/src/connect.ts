import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
} from "@solana/web3.js";

export const getDefaultRpc = (url: string) => {
  const transport = createDefaultRpcTransport({
    url,
  });

  // Create an RPC client using that transport.
  return createSolanaRpcFromTransport(transport);
};
