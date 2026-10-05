import {
  db,
  error,
  json,
  requireAuth,
  type RouterRoutes,
} from '@appdeploy/sdk';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

export const TREASURY_WALLET =
  'EjXomoeqsTuSBojd6i3yaduJdWtoFNuM28Vfp8yafCro';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const COINGECKO_PRICE =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

const accountTable = (userId: string) =>
  'money_' + userId;
const depositTable = (userId: string) =>
  'sol_deposits_' + userId;
const withdrawalTable = 'withdrawal_requests';
const receiptTable = 'sol_payment_receipts';
const adminTable = (userId: string) =>
  'admin_' + userId;
const challengeTable = (userId: string) =>
  'admin_challenges_' + userId;
const settlementTable = (userId: string) =>
  'rental_settlements_' + userId;

export interface MoneyAccount {
  renterBalanceMicros: number;
  hostBalanceMicros: number;
  linkedWallet?: string;
  updatedAt: string;
}

interface Deposit {
  walletAddress: string;
  usdMicros: number;
  solUsd: number;
  expectedLamports: number;
  treasuryWallet: string;
  status: 'pending' | 'confirmed';
  createdAt: string;
  expiresAt: string;
  signature?: string;
  confirmedAt?: string;
}

interface Withdrawal {
  userId: string;
  email: string;
  walletAddress: string;
  usdMicros: number;
  quotedSol: number;
  solUsd: number;
  status: 'pending' | 'paid' | 'rejected';
  createdAt: string;
  paidAt?: string;
  paidTxSignature?: string;
  paidSolAmount?: number;
  rejectedAt?: string;
}

interface AdminChallenge {
  nonce: string;
  message: string;
  expiresAt: string;
  used: boolean;
}

interface ParsedInstruction {
  program?: string;
  parsed?: {
    type?: string;
    info?: Record<string, unknown>;
  };
}

interface ParsedTransaction {
  meta?: {
    err?: unknown;
  } | null;
  transaction?: {
    message?: {
      accountKeys?: Array<
        string | {
          pubkey?: string;
          signer?: boolean;
        }
      >;
      instructions?: ParsedInstruction[];
    };
  };
}

function microsToUsd(value: number): number {
  return Number((value / 1_000_000).toFixed(6));
}

function usdToMicros(value: number): number {
  return Math.round(value * 1_000_000);
}

function isWalletAddress(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

async function rpc(
  method: string,
  params: unknown[]
): Promise<unknown> {
  const response = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error('solana_rpc_unavailable');
  }

  const payload = (await response.json()) as {
    result?: unknown;
    error?: unknown;
  };

  if (payload.error) {
    throw new Error('solana_rpc_error');
  }

  return payload.result;
}

async function getSolUsdPrice(): Promise<number> {
  const response = await fetch(COINGECKO_PRICE, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('sol_price_unavailable');
  }

  const payload = (await response.json()) as {
    solana?: {
      usd?: number;
    };
  };

  const price = Number(payload.solana?.usd || 0);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('sol_price_unavailable');
  }

  return price;
}

export async function getMoneyAccount(
  userId: string
): Promise<MoneyAccount & { id: string }> {
  const table = accountTable(userId);
  const { items } = await db.list<MoneyAccount>(
    table,
    { limit: 1 }
  );

  if (items[0]) {
    return items[0] as MoneyAccount & { id: string };
  }

  const record: MoneyAccount = {
    renterBalanceMicros: 0,
    hostBalanceMicros: 0,
    updatedAt: new Date().toISOString(),
  };

  const [id] = await db.add(table, [record]);
  if (!id) throw new Error('money_account_create_failed');

  return {
    id,
    ...record,
  };
}

async function saveMoneyAccount(
  userId: string,
  account: MoneyAccount & { id: string }
): Promise<void> {
  const { id, ...record } = account;
  const [ok] = await db.update(
    accountTable(userId),
    [
      {
        id,
        record: {
          ...record,
          updatedAt: new Date().toISOString(),
        },
      },
    ]
  );

  if (!ok) throw new Error('money_account_update_failed');
}

async function isSignatureUsed(
  signature: string
): Promise<boolean> {
  const { items } = await db.list<{
    signature: string;
  }>(receiptTable, {
    filter: { signature },
    limit: 200,
  });

  return items.some(
    item => item.signature === signature
  );
}

async function verifyNativeTransfer(
  signature: string,
  source: string,
  destination: string,
  minimumLamports: number
): Promise<void> {
  if (!signature || signature.length < 40) {
    throw new Error('invalid_signature');
  }

  const raw = await rpc(
    'getTransaction',
    [
      signature,
      {
        encoding: 'jsonParsed',
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      },
    ]
  );

  if (!raw) throw new Error('transaction_not_finalized');

  const transaction = raw as ParsedTransaction;

  if (transaction.meta?.err) {
    throw new Error('transaction_failed');
  }

  const keys =
    transaction.transaction?.message?.accountKeys || [];

  const sourceSigned = keys.some(key => {
    if (typeof key === 'string') return false;
    return (
      key.pubkey === source &&
      key.signer === true
    );
  });

  if (!sourceSigned) {
    throw new Error('payment_wallet_mismatch');
  }

  const instructions =
    transaction.transaction?.message?.instructions || [];

  const paidLamports = instructions.reduce(
    (sum, instruction) => {
      if (
        instruction.program !== 'system' ||
        instruction.parsed?.type !== 'transfer'
      ) {
        return sum;
      }

      const info = instruction.parsed.info || {};
      if (
        String(info.source || '') !== source ||
        String(info.destination || '') !== destination
      ) {
        return sum;
      }

      return sum + Number(info.lamports || 0);
    },
    0
  );

  if (paidLamports < minimumLamports) {
    throw new Error('payment_amount_too_small');
  }
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(
    binary,
    char => char.charCodeAt(0)
  );
}

async function isAdmin(
  userId: string
): Promise<boolean> {
  const { items } = await db.list<{
    createdAt: string;
  }>(
    adminTable(userId),
    { limit: 1 }
  );

  return Boolean(items[0]);
}

async function requireAdminUser(
  userId: string
): Promise<void> {
  if (!(await isAdmin(userId))) {
    throw new Error('admin_required');
  }
}

export async function settleRentalBalances(
  settlementId: string,
  renterId: string,
  ownerId: string,
  totalMicros: number,
  hostMicros: number
): Promise<void> {
  if (totalMicros <= 0 && hostMicros <= 0) return;

  const table = settlementTable(renterId);
  const { items } = await db.list<{
    settlementId: string;
    status: string;
  }>(table, {
    filter: { settlementId },
    limit: 50,
  });

  if (
    items.some(
      item =>
        item.settlementId === settlementId &&
        item.status === 'done'
    )
  ) {
    return;
  }

  const renter = await getMoneyAccount(renterId);
  const host = await getMoneyAccount(ownerId);

  if (renter.renterBalanceMicros < totalMicros) {
    throw new Error('insufficient_balance');
  }

  const marker = {
    settlementId,
    status: 'pending',
    totalMicros,
    hostMicros,
    createdAt: new Date().toISOString(),
  };

  const [markerId] = await db.add(table, [marker]);
  if (!markerId) {
    throw new Error('settlement_marker_failed');
  }

  const renterBefore = renter.renterBalanceMicros;

  renter.renterBalanceMicros -= totalMicros;
  await saveMoneyAccount(renterId, renter);

  try {
    host.hostBalanceMicros += hostMicros;
    await saveMoneyAccount(ownerId, host);
  } catch (error) {
    renter.renterBalanceMicros = renterBefore;
    await saveMoneyAccount(renterId, renter);
    await db.delete(table, [markerId]);
    throw error;
  }

  await db.update(table, [
    {
      id: markerId,
      record: {
        ...marker,
        status: 'done',
        settledAt: new Date().toISOString(),
      },
    },
  ]);
}

export const paymentRoutes: RouterRoutes = {
  'GET /api/payments/account': [
    requireAuth(),
    async (ctx: {
      user?: {
        userId: string;
      };
    }) => {
      const account = await getMoneyAccount(
        ctx.user!.userId
      );

      return json({
        account: {
          linkedWallet: account.linkedWallet || null,
          renterBalanceUsd: microsToUsd(
            account.renterBalanceMicros
          ),
          hostBalanceUsd: microsToUsd(
            account.hostBalanceMicros
          ),
        },
        treasuryWallet: TREASURY_WALLET,
      });
    },
  ],

  'POST /api/payments/wallet': [
    requireAuth(),
    async (ctx: {
      body: unknown;
      user?: {
        userId: string;
      };
    }) => {
      const body = (ctx.body || {}) as {
        walletAddress?: string;
      };

      const walletAddress = String(
        body.walletAddress || ''
      ).trim();

      if (!isWalletAddress(walletAddress)) {
        return error('invalid_wallet', 400);
      }

      const account = await getMoneyAccount(
        ctx.user!.userId
      );

      account.linkedWallet = walletAddress;
      await saveMoneyAccount(
        ctx.user!.userId,
        account
      );

      return json({
        linkedWallet: walletAddress,
      });
    },
  ],

  'POST /api/payments/deposits': [
    requireAuth(),
    async (ctx: {
      body: unknown;
      user?: {
        userId: string;
      };
    }) => {
      const body = (ctx.body || {}) as {
        usdAmount?: unknown;
        walletAddress?: string;
      };

      const usdAmount = Number(body.usdAmount || 0);
      const walletAddress = String(
        body.walletAddress || ''
      ).trim();

      if (
        !Number.isFinite(usdAmount) ||
        usdAmount < 1 ||
        usdAmount > 500
      ) {
        return error('invalid_deposit_amount', 400);
      }

      if (!isWalletAddress(walletAddress)) {
        return error('invalid_wallet', 400);
      }

      let solUsd: number;
      try {
        solUsd = await getSolUsdPrice();
      } catch {
        return error('sol_price_unavailable', 503);
      }

      const usdMicros = usdToMicros(usdAmount);
      const expectedLamports = Math.ceil(
        (usdAmount / solUsd) * 1_000_000_000
      );

      const createdAt = new Date();
      const expiresAt = new Date(
        createdAt.getTime() + 15 * 60_000
      );

      const record: Deposit = {
        walletAddress,
        usdMicros,
        solUsd,
        expectedLamports,
        treasuryWallet: TREASURY_WALLET,
        status: 'pending',
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const [id] = await db.add(
        depositTable(ctx.user!.userId),
        [record]
      );

      if (!id) {
        return error('deposit_create_failed', 500);
      }

      return json({
        deposit: {
          id,
          usdAmount: microsToUsd(usdMicros),
          solUsd,
          expectedLamports,
          expectedSol:
            expectedLamports / 1_000_000_000,
          treasuryWallet: TREASURY_WALLET,
          expiresAt: record.expiresAt,
        },
      }, 201);
    },
  ],

  'POST /api/payments/deposits/:id/confirm': [
    requireAuth(),
    async (ctx: {
      body: unknown;
      params: Record<string, string>;
      user?: {
        userId: string;
      };
    }) => {
      const body = (ctx.body || {}) as {
        signature?: string;
      };
      const signature = String(
        body.signature || ''
      ).trim();

      const [deposit] = await db.get<Deposit>(
        depositTable(ctx.user!.userId),
        [ctx.params.id]
      );

      if (!deposit) {
        return error('deposit_not_found', 404);
      }

      if (deposit.status === 'confirmed') {
        const account = await getMoneyAccount(
          ctx.user!.userId
        );
        return json({
          confirmed: true,
          balanceUsd: microsToUsd(
            account.renterBalanceMicros
          ),
        });
      }

      if (
        Date.now() >
        Date.parse(deposit.expiresAt) + 15 * 60_000
      ) {
        return error('deposit_quote_expired', 409);
      }

      if (await isSignatureUsed(signature)) {
        return error('signature_already_used', 409);
      }

      try {
        await verifyNativeTransfer(
          signature,
          deposit.walletAddress,
          TREASURY_WALLET,
          deposit.expectedLamports
        );
      } catch (verifyError) {
        const message =
          verifyError instanceof Error
            ? verifyError.message
            : 'payment_verification_failed';
        return error(message, 409);
      }

      const account = await getMoneyAccount(
        ctx.user!.userId
      );

      account.renterBalanceMicros +=
        deposit.usdMicros;

      await saveMoneyAccount(
        ctx.user!.userId,
        account
      );

      await db.add(receiptTable, [
        {
          signature,
          type: 'deposit',
          userId: ctx.user!.userId,
          depositId: ctx.params.id,
          createdAt: new Date().toISOString(),
        },
      ]);

      await db.update(
        depositTable(ctx.user!.userId),
        [
          {
            id: ctx.params.id,
            record: {
              ...deposit,
              status: 'confirmed',
              signature,
              confirmedAt:
                new Date().toISOString(),
            },
          },
        ]
      );

      return json({
        confirmed: true,
        balanceUsd: microsToUsd(
          account.renterBalanceMicros
        ),
      });
    },
  ],

  'GET /api/payments/deposits': [
    requireAuth(),
    async (ctx: {
      user?: {
        userId: string;
      };
    }) => {
      const { items } = await db.list<Deposit>(
        depositTable(ctx.user!.userId),
        { limit: 30 }
      );

      return json({
        deposits: items
          .sort(
            (a, b) =>
              Date.parse(b.createdAt) -
              Date.parse(a.createdAt)
          )
          .map(item => ({
            id: item.id,
            usdAmount: microsToUsd(
              item.usdMicros
            ),
            expectedSol:
              item.expectedLamports /
              1_000_000_000,
            status: item.status,
            signature: item.signature || null,
            createdAt: item.createdAt,
          })),
      });
    },
  ],

  'GET /api/payments/withdrawals': [
    requireAuth(),
    async (ctx: {
      user?: {
        userId: string;
      };
    }) => {
      const { items } = await db.list<Withdrawal>(
        withdrawalTable,
        {
          filter: {
            userId: ctx.user!.userId,
          },
          limit: 100,
        }
      );

      return json({
        withdrawals: items
          .filter(
            item =>
              item.userId === ctx.user!.userId
          )
          .sort(
            (a, b) =>
              Date.parse(b.createdAt) -
              Date.parse(a.createdAt)
          )
          .map(item => ({
            id: item.id,
            walletAddress: item.walletAddress,
            usdAmount: microsToUsd(
              item.usdMicros
            ),
            quotedSol: item.quotedSol,
            status: item.status,
            createdAt: item.createdAt,
            paidAt: item.paidAt || null,
            paidTxSignature:
              item.paidTxSignature || null,
            paidSolAmount:
              item.paidSolAmount || null,
          })),
      });
    },
  ],

  'POST /api/payments/withdrawals': [
    requireAuth(),
    async (ctx: {
      body: unknown;
      user?: {
        userId: string;
        email?: string;
      };
    }) => {
      const body = (ctx.body || {}) as {
        usdAmount?: unknown;
        walletAddress?: string;
      };

      const usdAmount = Number(
        body.usdAmount || 0
      );
      const usdMicros = usdToMicros(
        usdAmount
      );
      const walletAddress = String(
        body.walletAddress || ''
      ).trim();

      if (
        !Number.isFinite(usdAmount) ||
        usdAmount < 1
      ) {
        return error(
          'invalid_withdrawal_amount',
          400
        );
      }

      if (!isWalletAddress(walletAddress)) {
        return error('invalid_wallet', 400);
      }

      const account = await getMoneyAccount(
        ctx.user!.userId
      );

      if (account.hostBalanceMicros < usdMicros) {
        return error(
          'insufficient_host_balance',
          409
        );
      }

      let solUsd: number;
      try {
        solUsd = await getSolUsdPrice();
      } catch {
        return error('sol_price_unavailable', 503);
      }

      const record: Withdrawal = {
        userId: ctx.user!.userId,
        email: ctx.user!.email || '',
        walletAddress,
        usdMicros,
        quotedSol: Number(
          (usdAmount / solUsd).toFixed(9)
        ),
        solUsd,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      account.hostBalanceMicros -= usdMicros;
      await saveMoneyAccount(
        ctx.user!.userId,
        account
      );

      const [id] = await db.add(
        withdrawalTable,
        [record]
      );

      if (!id) {
        account.hostBalanceMicros += usdMicros;
        await saveMoneyAccount(
          ctx.user!.userId,
          account
        );
        return error(
          'withdrawal_create_failed',
          500
        );
      }

      return json({
        withdrawal: {
          id,
          usdAmount,
          quotedSol: record.quotedSol,
          walletAddress,
          status: 'pending',
        },
        hostBalanceUsd: microsToUsd(
          account.hostBalanceMicros
        ),
      }, 201);
    },
  ],

  'GET /api/payments/admin/status': [
    requireAuth(),
    async (ctx: {
      user?: {
        userId: string;
      };
    }) =>
      json({
        isAdmin: await isAdmin(
          ctx.user!.userId
        ),
        treasuryWallet: TREASURY_WALLET,
      }),
  ],

  'POST /api/payments/admin/challenge': [
    requireAuth(),
    async (ctx: {
      user?: {
        userId: string;
      };
    }) => {
      const nonce =
        crypto.randomUUID().replace(/-/g, '');
      const message =
        'PhoneBridge admin access\n' +
        'Treasury: ' +
        TREASURY_WALLET +
        '\nNonce: ' +
        nonce;

      const record: AdminChallenge = {
        nonce,
        message,
        expiresAt: new Date(
          Date.now() + 10 * 60_000
        ).toISOString(),
        used: false,
      };

      const [id] = await db.add(
        challengeTable(ctx.user!.userId),
        [record]
      );

      if (!id) {
        return error(
          'admin_challenge_failed',
          500
        );
      }

      return json({
        challengeId: id,
        message,
        treasuryWallet: TREASURY_WALLET,
      });
    },
  ],

  'POST /api/payments/admin/verify': [
    requireAuth(),
    async (ctx: {
      body: unknown;
      user?: {
        userId: string;
      };
    }) => {
      const body = (ctx.body || {}) as {
        challengeId?: string;
        walletAddress?: string;
        signatureBase64?: string;
      };

      const challengeId = String(
        body.challengeId || ''
      ).trim();
      const walletAddress = String(
        body.walletAddress || ''
      ).trim();
      const signatureBase64 = String(
        body.signatureBase64 || ''
      ).trim();

      if (walletAddress !== TREASURY_WALLET) {
        return error(
          'treasury_wallet_required',
          403
        );
      }

      const [challenge] =
        await db.get<AdminChallenge>(
          challengeTable(ctx.user!.userId),
          [challengeId]
        );

      if (
        !challenge ||
        challenge.used ||
        Date.now() >
          Date.parse(challenge.expiresAt)
      ) {
        return error(
          'admin_challenge_invalid',
          409
        );
      }

      let valid = false;

      try {
        valid = nacl.sign.detached.verify(
          new TextEncoder().encode(
            challenge.message
          ),
          base64ToBytes(signatureBase64),
          new PublicKey(
            walletAddress
          ).toBytes()
        );
      } catch {
        valid = false;
      }

      if (!valid) {
        return error(
          'admin_signature_invalid',
          403
        );
      }

      await db.update(
        challengeTable(ctx.user!.userId),
        [
          {
            id: challengeId,
            record: {
              ...challenge,
              used: true,
            },
          },
        ]
      );

      const { items } = await db.list(
        adminTable(ctx.user!.userId),
        { limit: 1 }
      );

      if (!items[0]) {
        await db.add(
          adminTable(ctx.user!.userId),
          [
            {
              walletAddress,
              createdAt:
                new Date().toISOString(),
            },
          ]
        );
      }

      return json({
        isAdmin: true,
      });
    },
  ],

  'GET /api/payments/admin/withdrawals': [
    requireAuth(),
    async (ctx: {
      user?: {
        userId: string;
      };
    }) => {
      try {
        await requireAdminUser(
          ctx.user!.userId
        );
      } catch {
        return error('admin_required', 403);
      }

      const { items } = await db.list<Withdrawal>(
        withdrawalTable,
        { limit: 200 }
      );

      return json({
        withdrawals: items
          .filter(
            item => item.status === 'pending'
          )
          .sort(
            (a, b) =>
              Date.parse(a.createdAt) -
              Date.parse(b.createdAt)
          )
          .map(item => ({
            id: item.id,
            email: item.email,
            walletAddress: item.walletAddress,
            usdAmount: microsToUsd(
              item.usdMicros
            ),
            quotedSol: item.quotedSol,
            createdAt: item.createdAt,
          })),
      });
    },
  ],

  'POST /api/payments/admin/withdrawals/:id/paid': [
    requireAuth(),
    async (ctx: {
      body: unknown;
      params: Record<string, string>;
      user?: {
        userId: string;
      };
    }) => {
      try {
        await requireAdminUser(
          ctx.user!.userId
        );
      } catch {
        return error('admin_required', 403);
      }

      const body = (ctx.body || {}) as {
        txSignature?: string;
        solAmount?: unknown;
      };

      const txSignature = String(
        body.txSignature || ''
      ).trim();
      const solAmount = Number(
        body.solAmount || 0
      );

      const [request] =
        await db.get<Withdrawal>(
          withdrawalTable,
          [ctx.params.id]
        );

      if (!request) {
        return error(
          'withdrawal_not_found',
          404
        );
      }

      if (request.status !== 'pending') {
        return error(
          'withdrawal_not_pending',
          409
        );
      }

      if (
        !Number.isFinite(solAmount) ||
        solAmount <= 0
      ) {
        return error(
          'invalid_sol_amount',
          400
        );
      }

      try {
        await verifyNativeTransfer(
          txSignature,
          TREASURY_WALLET,
          request.walletAddress,
          Math.floor(
            solAmount * 1_000_000_000
          )
        );
      } catch (verifyError) {
        const message =
          verifyError instanceof Error
            ? verifyError.message
            : 'payment_verification_failed';
        return error(message, 409);
      }

      await db.update(
        withdrawalTable,
        [
          {
            id: ctx.params.id,
            record: {
              ...request,
              status: 'paid',
              paidAt:
                new Date().toISOString(),
              paidTxSignature: txSignature,
              paidSolAmount: solAmount,
            },
          },
        ]
      );

      return json({
        paid: true,
      });
    },
  ],

  'POST /api/payments/admin/withdrawals/:id/reject': [
    requireAuth(),
    async (ctx: {
      params: Record<string, string>;
      user?: {
        userId: string;
      };
    }) => {
      try {
        await requireAdminUser(
          ctx.user!.userId
        );
      } catch {
        return error('admin_required', 403);
      }

      const [request] =
        await db.get<Withdrawal>(
          withdrawalTable,
          [ctx.params.id]
        );

      if (!request) {
        return error(
          'withdrawal_not_found',
          404
        );
      }

      if (request.status !== 'pending') {
        return error(
          'withdrawal_not_pending',
          409
        );
      }

      const account = await getMoneyAccount(
        request.userId
      );

      account.hostBalanceMicros +=
        request.usdMicros;

      await saveMoneyAccount(
        request.userId,
        account
      );

      await db.update(
        withdrawalTable,
        [
          {
            id: ctx.params.id,
            record: {
              ...request,
              status: 'rejected',
              rejectedAt:
                new Date().toISOString(),
            },
          },
        ]
      );

      return json({
        rejected: true,
      });
    },
  ],
};
