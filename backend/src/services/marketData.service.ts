import { prisma } from "@/database/prisma";
import { Prisma } from "@prisma/client";

type CacheRow = Prisma.MarketPriceCacheGetPayload<{}>;

/**
 * Market Data Service (Offline & Self-Contained)
 *
 * All external 3rd-party market-price and gold-rate network APIs (Twelve Data,
 * MetalPriceAPI) have been safely removed per architecture requirements.
 *
 * This service reads only from local/historical MarketPriceCache rows or user
 * manual valuations. It makes zero external network calls, ensuring complete
 * independence from third-party API availability, rate limits, and network latency.
 */

/** Reads from the DB cache without any external network call. */
export async function getCachedPrices(symbols: string[]): Promise<Map<string, CacheRow>> {
  if (symbols.length === 0) return new Map();
  const rows = await prisma.marketPriceCache.findMany({ where: { symbol: { in: symbols } } });
  return new Map(rows.map((r) => [r.symbol, r]));
}

/**
 * Retained for backwards compatibility — performs no external API calls.
 */
export async function refreshMarketData(): Promise<void> {
  // External polling removed — assets rely on user entry or statement imports.
}

export function startMarketDataRefreshLoop(): void {
  // No-op: background polling loop disabled
}

// ---------------------------------------------------------------------------
// Gold rate subsystem mapping
// ---------------------------------------------------------------------------

export const GOLD_PURITY_TO_SYMBOL: Record<string, string> = {
  PURITY_24K: "XAU/INR/24K",
  PURITY_22K: "XAU/INR/22K",
  PURITY_18K: "XAU/INR/18K",
  OTHER: "XAU/INR/OTHER",
};

/**
 * Retained for backwards compatibility — performs no external API calls.
 */
export async function refreshGoldRate(): Promise<void> {
  // External polling removed — Gold valuations are manual per user requirements.
}

export function startGoldRateRefreshLoop(): void {
  // No-op: background gold polling loop disabled
}
