import Solflare from '@solflare-wallet/sdk';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(
  RPC_URL,
  'confirmed'
);

let wallet: Solflare | null = null;

function getWallet(): Solflare {
  if (!wallet) {
    wallet = new Solflare({
      network: 'mainnet-beta',
    });
  }
  return wallet;
}

export function openSolflareApp(): void {
  const currentUrl = encodeURIComponent(
    window.location.href
  );
  const ref = encodeURIComponent(
    window.location.origin
  );

  window.location.href =
    'https://solflare.com/ul/v1/browse/' +
    currentUrl +
    '?ref=' +
    ref;
}

export async function connectSolflare(): Promise<string> {
  const current = getWallet();

  let timeoutId = 0;
  try {
    await Promise.race([
      current.connect(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(
          () => reject(
            new Error('solflare_connect_timeout')
          ),
          25_000
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }

  if (!current.publicKey) {
    throw new Error('wallet_not_connected');
  }

  return current.publicKey.toString();
}

export function connectedSolflareAddress(): string | null {
  return wallet?.publicKey?.toString() || null;
}

export async function disconnectSolflare(): Promise<void> {
  if (!wallet) return;
  try {
    await wallet.disconnect();
  } finally {
    wallet = null;
  }
}

export async function sendSolPayment(
  treasuryWallet: string,
  lamports: number
): Promise<string> {
  const current = getWallet();
  if (!current.publicKey) {
    await current.connect();
  }

  if (!current.publicKey) {
    throw new Error('wallet_not_connected');
  }

  const amount = Math.trunc(lamports);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('invalid_lamports');
  }

  const latest =
    await connection.getLatestBlockhash(
      'confirmed'
    );

  const transaction = new Transaction({
    feePayer: current.publicKey,
    recentBlockhash: latest.blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: current.publicKey,
      toPubkey: new PublicKey(treasuryWallet),
      lamports: amount,
    })
  );

  return current.signAndSendTransaction(
    transaction
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

export async function signSolflareMessage(
  message: string
): Promise<string> {
  const current = getWallet();
  if (!current.publicKey) {
    await current.connect();
  }

  if (!current.publicKey) {
    throw new Error('wallet_not_connected');
  }

  const signature = await current.signMessage(
    new TextEncoder().encode(message),
    'utf8'
  );

  return bytesToBase64(signature);
}
