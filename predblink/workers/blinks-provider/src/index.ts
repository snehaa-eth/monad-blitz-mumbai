import { parseUnits, encodeFunctionData } from 'viem';
import { createPublicClient, http } from 'viem';
import { monadTestnet } from 'viem/chains';
import type { PublicClient } from 'viem';
import { PREDBLINK_ABI } from './abis';

const PREDBLINK_ADDRESS = '0x3adc0beB3B447878a156BB15E1179267cc225553';
const MONAD_CHAIN_ID = 10143;
const DEFAULT_RPC_URL = 'https://rpc.ankr.com/monad_testnet';
const DEFAULT_USDC_AMOUNT = 5;
const ICON_URL = 'https://raw.githubusercontent.com/nocaligic/bangerph/main/square-image.png';

const MARKET_TYPE_LABELS: Record<number, string> = {
  0: 'Price market',
  1: 'Tweet market',
  2: 'Block data',
};

const TWITTER_METRIC_LABELS: Record<number, string> = {
  0: 'Views',
  1: 'Likes',
  2: 'Retweets',
  3: 'Comments',
};

const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'x-action-version': '2.4',
  'x-blockchain-ids': 'eip155:10143',
};

const ACTIONS_JSON = {
  name: 'PredBlink blinks',
  description: 'Prediction markets for viral metrics on Monad testnet',
  icon: ICON_URL,
  rules: [
    {
      name: 'Market trading',
      pathPattern: '/api/actions/market/*',
      apiPath: '/api/actions/market/*',
      methods: ['GET', 'POST'],
    },
  ],
};

interface Env {
  MONAD_RPC_URL?: string;
}

let cachedClient: PublicClient | null = null;
let cachedRpcUrl: string | null = null;

function getClient(env: Env) {
  const rpcUrl = (env.MONAD_RPC_URL ?? DEFAULT_RPC_URL).trim();
  if (cachedClient && cachedRpcUrl === rpcUrl) {
    return cachedClient;
  }

  const customChain = {
    ...monadTestnet,
    rpcUrls: {
      default: { ...monadTestnet.rpcUrls.default, http: [rpcUrl] },
      public: { ...monadTestnet.rpcUrls.public, http: [rpcUrl] },
    },
  };

  cachedClient = createPublicClient({ chain: customChain, transport: http(rpcUrl) });
  cachedRpcUrl = rpcUrl;
  return cachedClient;
}

async function fetchMarket(client: PublicClient, marketId: number) {
  const id = BigInt(marketId);
  const [core, question, yesPriceCents, noPriceCents] = await Promise.all([
    client.readContract({
      address: PREDBLINK_ADDRESS,
      abi: PREDBLINK_ABI,
      functionName: 'getMarketCore',
      args: [id],
    }),
    client.readContract({
      address: PREDBLINK_ADDRESS,
      abi: PREDBLINK_ABI,
      functionName: 'getMarketQuestion',
      args: [id],
    }),
    client.readContract({
      address: PREDBLINK_ADDRESS,
      abi: PREDBLINK_ABI,
      functionName: 'getYesPriceCents',
      args: [id],
    }),
    client.readContract({
      address: PREDBLINK_ADDRESS,
      abi: PREDBLINK_ABI,
      functionName: 'getNoPriceCents',
      args: [id],
    }),
  ]);

  const marketType = Number((core as any)[0]);
  const status = Number((core as any)[6]);

  let tweetMeta = null;
  if (marketType === 1) {
    tweetMeta = await client
      .readContract({
        address: PREDBLINK_ADDRESS,
        abi: PREDBLINK_ABI,
        functionName: 'tweetMeta',
        args: [id],
      })
      .catch(() => null);
  }

  return {
    id: marketId,
    marketType,
    status,
    question: question ?? `Market #${marketId}`,
    tweetMeta,
    yesPriceCents: Number(yesPriceCents),
    noPriceCents: Number(noPriceCents),
  };
}

function buildDescription(market: Awaited<ReturnType<typeof fetchMarket>>) {
  const typeLabel = MARKET_TYPE_LABELS[market.marketType] ?? 'Prediction';
  const priceLabel = `YES ${market.yesPriceCents / 100}¢ · NO ${market.noPriceCents / 100}¢`;
  if (market.tweetMeta) {
    const metricLabel = TWITTER_METRIC_LABELS[Number(market.tweetMeta[5])] ?? 'Metric';
    const handle = market.tweetMeta[1];
    return `${typeLabel} (${metricLabel}) · ${market.tweetMeta[2]} · ${handle} · ${priceLabel}`;
  }
  return `${typeLabel} · ${market.question} · ${priceLabel}`;
}

function formatAmount(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...ACTIONS_CORS_HEADERS,
    },
  });
}

function optionResponse() {
  return new Response(null, {
    status: 204,
    headers: ACTIONS_CORS_HEADERS,
  });
}

async function handleMarketGet(request: Request, env: Env, marketId: number) {
  const client = getClient(env);
  const market = await fetchMarket(client, marketId);
  if (!market) {
    return jsonResponse({ error: 'Market not found' }, 404);
  }

  const origin = new URL(request.url).origin;
  const baseHref = `${origin}/api/actions/market/${marketId}`;
  const defaultAmount = DEFAULT_USDC_AMOUNT;

  const response = {
    type: 'action',
    label: `PredBlink ${MARKET_TYPE_LABELS[market.marketType] ?? 'market'}`,
    title: market.question,
    description: buildDescription(market),
    icon: ICON_URL,
    links: {
      actions: [
        {
          type: 'transaction',
          label: `Buy YES (${formatAmount(defaultAmount)})`,
          href: `${baseHref}?side=yes&amount=${defaultAmount}`,
        },
        {
          type: 'transaction',
          label: `Buy NO (${formatAmount(defaultAmount)})`,
          href: `${baseHref}?side=no&amount=${defaultAmount}`,
        },
      ],
    },
  };

  return jsonResponse(response);
}

async function handleMarketPost(request: Request, env: Env, marketId: number) {
  const client = getClient(env);
  const market = await fetchMarket(client, marketId);
  if (!market) {
    return jsonResponse({ error: 'Market not found' }, 404);
  }

  const url = new URL(request.url);
  const querySide = url.searchParams.get('side');
  const queryAmount = url.searchParams.get('amount');

  const body = await request
    .clone()
    .json()
    .catch(() => ({ side: undefined, amount: undefined, account: undefined }));

  const side = (body.side as string | undefined) || querySide || 'yes';
  const amountValue = Number(body.amount ?? queryAmount ?? DEFAULT_USDC_AMOUNT);

  if (Number.isNaN(amountValue) || amountValue <= 0) {
    return jsonResponse({ error: 'Invalid amount' }, 400);
  }

  const usdcAmount = parseUnits(String(amountValue), 6);
  const functionName = side === 'no' ? 'buyNo' : 'buyYes';

  const encoded = encodeFunctionData({
    abi: PREDBLINK_ABI,
    functionName,
    args: [BigInt(marketId), usdcAmount],
  });

  const account = (body.account as string | undefined) || url.searchParams.get('account');

  const transactionRequest: Record<string, unknown> = {
    to: PREDBLINK_ADDRESS,
    data: encoded,
    value: '0x0',
    chainId: MONAD_CHAIN_ID,
  };

  if (account) {
    transactionRequest.from = account;
  }

  const serializedTx = JSON.stringify(transactionRequest);
  const response = {
    type: 'transaction',
    transaction: serializedTx,
    message: `Spend ${formatAmount(amountValue)} to buy ${side.toUpperCase()} shares on market ${marketId}.`,
    metadata: {
      marketId,
      side,
      amount: amountValue,
    },
  };

  return jsonResponse(response);
}

export default {
  async fetch(request: Request, env: Env) {
    if (request.method === 'OPTIONS') {
      return optionResponse();
    }

    const url = new URL(request.url);

    if (url.pathname === '/actions.json' && request.method === 'GET') {
      return jsonResponse(ACTIONS_JSON);
    }

    const match = url.pathname.match(/^\/api\/actions\/market\/(\d+)$/);
    if (match) {
      const marketId = Number(match[1]);
      if (Number.isNaN(marketId)) {
        return jsonResponse({ error: 'Invalid market id' }, 400);
      }

      if (request.method === 'GET') {
        return handleMarketGet(request, env, marketId);
      }

      if (request.method === 'POST') {
        return handleMarketPost(request, env, marketId);
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
