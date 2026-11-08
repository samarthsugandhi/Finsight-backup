import { prisma } from "@/database/prisma";
import { Prisma, HoldingType } from "@prisma/client";
import { parseInvestmentDocument, ParsedInvestmentItem } from "@/utils/investmentParser";

export interface IngestInvestmentResult {
  broker: string;
  statementType: string;
  totalFound: number;
  newlyImported: number;
  updatedHoldings: number;
  duplicatesSkipped: number;
  items: Array<{
    name: string;
    type: string;
    subType: string;
    quantity: number;
    investedAmount: number;
    currentValue: number | null;
    action: "CREATED" | "UPDATED" | "SKIPPED_DUPLICATE";
  }>;
}

export class InvestmentStatementsService {
  /**
   * Ingest an investment document (Holdings, Tradebook, P&L, Mutual Funds)
   * with strict validation, database-level unique constraints, and atomic user serialization.
   */
  static async ingestStatement(
    fileBuffer: Buffer,
    filename: string,
    mimetype: string,
    userId: number
  ): Promise<IngestInvestmentResult> {
    // 1. Parse document into validated items
    const parsed = await parseInvestmentDocument(fileBuffer, filename, mimetype, userId);

    if (parsed.validItems.length === 0) {
      return {
        broker: parsed.broker,
        statementType: parsed.statementType,
        totalFound: parsed.totalFound,
        newlyImported: 0,
        updatedHoldings: 0,
        duplicatesSkipped: parsed.skippedRows,
        items: [],
      };
    }

    // Acquire MySQL advisory lock to serialize concurrent imports for this user
    const lockKey = `investment_import_user_${userId}`;
    let lockAcquired = false;
    try {
      const lockRes = await prisma.$queryRaw<Array<{ locked: bigint }>>`SELECT GET_LOCK(${lockKey}, 15) as locked`;
      lockAcquired = Number(lockRes?.[0]?.locked ?? 0) === 1;
    } catch {
      // Non-fatal if lock query fails; database unique constraints guarantee integrity
    }

    try {
      // 2. Fetch user's existing holdings and transactions to check deduplication
      const [existingHoldings, existingTransactions] = await Promise.all([
        prisma.portfolioHolding.findMany({
          where: { userId },
          include: { transactions: true },
        }),
        prisma.portfolioTransaction.findMany({
          where: { userId },
          select: { importHash: true },
        }),
      ]);

      const existingTxHashes = new Set(
        existingTransactions.map((t) => t.importHash).filter(Boolean) as string[]
      );

      const holdingMapByName = new Map<string, typeof existingHoldings[0]>();
      for (const h of existingHoldings) {
        holdingMapByName.set(h.name.trim().toLowerCase(), h);
        if (h.symbol) {
          holdingMapByName.set(h.symbol.trim().toLowerCase(), h);
        }
      }

      let newlyImported = 0;
      let updatedHoldings = 0;
      let duplicatesSkipped = 0;
      const itemSummaries: IngestInvestmentResult["items"] = [];

      // 3. Atomically process items in transaction
      await prisma.$transaction(async (tx) => {
        for (const item of parsed.validItems) {
          // Check if exact transaction/item was already imported
          if (item.importHash) {
            if (existingTxHashes.has(item.importHash)) {
              duplicatesSkipped++;
              itemSummaries.push({
                name: item.name,
                type: item.type,
                subType: item.subType || item.type,
                quantity: item.quantity,
                investedAmount: item.investedAmount,
                currentValue: item.currentValue ?? null,
                action: "SKIPPED_DUPLICATE",
              });
              continue;
            }

            // In-transaction duplicate check
            const inDbDuplicate = await tx.portfolioTransaction.findFirst({
              where: { userId, importHash: item.importHash },
            });
            if (inDbDuplicate) {
              existingTxHashes.add(item.importHash);
              duplicatesSkipped++;
              itemSummaries.push({
                name: item.name,
                type: item.type,
                subType: item.subType || item.type,
                quantity: item.quantity,
                investedAmount: item.investedAmount,
                currentValue: item.currentValue ?? null,
                action: "SKIPPED_DUPLICATE",
              });
              continue;
            }
          }

          const matchKey = (item.symbol || item.name).trim().toLowerCase();
          const existingHolding = holdingMapByName.get(matchKey);

          try {
            if (existingHolding) {
              // If holding already exists:
              // In Holdings statement, update current price / manualCurrentValue only if present
              if (parsed.statementType === "HOLDINGS" || item.currentValue !== undefined || item.currentPrice !== undefined) {
                await tx.portfolioHolding.update({
                  where: { id: existingHolding.id },
                  data: {
                    manualPrice: item.currentPrice ? new Prisma.Decimal(item.currentPrice) : existingHolding.manualPrice,
                    manualCurrentValue: item.currentValue ? new Prisma.Decimal(item.currentValue) : existingHolding.manualCurrentValue,
                    source: parsed.broker,
                  },
                });
                updatedHoldings++;
                itemSummaries.push({
                  name: item.name,
                  type: existingHolding.type,
                  subType: existingHolding.subType || existingHolding.type,
                  quantity: item.quantity,
                  investedAmount: item.investedAmount,
                  currentValue: item.currentValue ?? null,
                  action: "UPDATED",
                });
              } else {
                // In Tradebook, add trade transaction to existing holding
                await tx.portfolioTransaction.create({
                  data: {
                    holdingId: existingHolding.id,
                    userId,
                    side: item.side,
                    quantity: new Prisma.Decimal(item.quantity),
                    price: new Prisma.Decimal(item.averageBuyPrice),
                    date: item.date || new Date(),
                    importHash: item.importHash,
                  },
                });
                if (item.importHash) existingTxHashes.add(item.importHash);
                updatedHoldings++;
                itemSummaries.push({
                  name: item.name,
                  type: existingHolding.type,
                  subType: existingHolding.subType || existingHolding.type,
                  quantity: item.quantity,
                  investedAmount: item.investedAmount,
                  currentValue: item.currentValue ?? null,
                  action: "UPDATED",
                });
              }
            } else {
              // Create new holding and initial transaction
              // NEVER substitute averageBuyPrice as current market price or investedAmount as current value
              const createdHolding = await tx.portfolioHolding.create({
                data: {
                  userId,
                  type: item.type as HoldingType,
                  subType: item.subType || item.type,
                  name: item.name,
                  symbol: item.symbol || null,
                  source: parsed.broker,
                  importHash: item.importHash,
                  manualPrice: item.currentPrice ? new Prisma.Decimal(item.currentPrice) : undefined,
                  manualCurrentValue: item.currentValue ? new Prisma.Decimal(item.currentValue) : undefined,
                },
              });

              await tx.portfolioTransaction.create({
                data: {
                  holdingId: createdHolding.id,
                  userId,
                  side: item.side,
                  quantity: new Prisma.Decimal(item.quantity),
                  price: new Prisma.Decimal(item.averageBuyPrice),
                  date: item.date || new Date(),
                  importHash: item.importHash,
                },
              });

              holdingMapByName.set(matchKey, createdHolding as any);
              if (item.importHash) existingTxHashes.add(item.importHash);
              newlyImported++;

              itemSummaries.push({
                name: item.name,
                type: item.type,
                subType: item.subType || item.type,
                quantity: item.quantity,
                investedAmount: item.investedAmount,
                currentValue: item.currentValue ?? null,
                action: "CREATED",
              });
            }
          } catch (err: any) {
            // If database uniqueness constraint triggers on simultaneous imports (P2002)
            if (err?.code === "P2002" || err?.message?.includes("Unique constraint failed") || err?.message?.includes("Duplicate entry")) {
              if (item.importHash) existingTxHashes.add(item.importHash);
              duplicatesSkipped++;
              itemSummaries.push({
                name: item.name,
                type: item.type,
                subType: item.subType || item.type,
                quantity: item.quantity,
                investedAmount: item.investedAmount,
                currentValue: item.currentValue ?? null,
                action: "SKIPPED_DUPLICATE",
              });
            } else {
              throw err;
            }
          }
        }
      });

      return {
        broker: parsed.broker,
        statementType: parsed.statementType,
        totalFound: parsed.totalFound,
        newlyImported,
        updatedHoldings,
        duplicatesSkipped: duplicatesSkipped + parsed.skippedRows,
        items: itemSummaries,
      };
    } finally {
      if (lockAcquired) {
        try {
          await prisma.$queryRaw`SELECT RELEASE_LOCK(${lockKey})`;
        } catch {
          // Ignore release errors
        }
      }
    }
  }
}
