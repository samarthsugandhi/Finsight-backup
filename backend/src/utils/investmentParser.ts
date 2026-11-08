import crypto from "crypto";
import { extractPdfText } from "@/utils/pdf";

export interface ParsedInvestmentItem {
  name: string;
  symbol?: string | null;
  type: "STOCK" | "MUTUAL_FUND" | "BOND" | "OTHER";
  subType?: string | null; // "STOCK", "ETF", "MUTUAL_FUND", "BOND", "OTHER"
  quantity: number;
  averageBuyPrice: number;
  investedAmount: number;
  currentPrice?: number | null;
  currentValue?: number | null;
  pnl?: number | null;
  returnPct?: number | null;
  date?: Date | null;
  side: "BUY" | "SELL";
  broker: string;
  importHash: string;
}

export interface InvestmentParseResult {
  broker: string;
  statementType: "HOLDINGS" | "TRADEBOOK" | "MUTUAL_FUND" | "PNL" | "GENERIC";
  totalFound: number;
  validItems: ParsedInvestmentItem[];
  skippedRows: number;
}

function cleanNumber(val: unknown): number | null {
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (!val || typeof val !== "string") return null;
  // Remove commas, spaces, currency symbols like ₹, $, €
  const cleaned = val.replace(/[₹$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDateStr(str: string): Date | null {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();

  // Try standard ISO or YYYY-MM-DD
  const isoDate = new Date(s);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // DD/MM/YYYY or DD-MM-YYYY
  const parts = s.split(/[-/.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (parts[2].length === 4) {
      // DD/MM/YYYY
      year = parseInt(parts[2], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[0], 10);
    } else if (parts[0].length === 4) {
      // YYYY/MM/DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

function computeItemImportHash(userId: number, item: Partial<ParsedInvestmentItem>): string {
  const normName = (item.name || "").trim().toLowerCase();
  const normSymbol = (item.symbol || "").trim().toLowerCase();
  const qty = Number(item.quantity || 0).toFixed(4);
  const cost = Number(item.investedAmount || item.averageBuyPrice || 0).toFixed(2);
  const dateStr = item.date ? item.date.toISOString().split("T")[0] : "";

  return crypto
    .createHash("sha256")
    .update(`${userId}:${normName}:${normSymbol}:${qty}:${cost}:${dateStr}:${item.side || "BUY"}`)
    .digest("hex");
}

function classifyInstrument(name: string, symbol?: string | null): {
  type: "STOCK" | "MUTUAL_FUND" | "BOND" | "OTHER";
  subType: string;
} {
  const text = `${name} ${symbol || ""}`.toLowerCase();

  // Gold ETF
  if (/gold\s*etf|goldbees|golderbe|axisgold/.test(text)) {
    return { type: "STOCK", subType: "GOLD_ETF" };
  }

  // General ETF
  if (/\betf\b|bees\b|nifty\s*50\s*etf|juniorbees|liquidbees/.test(text)) {
    return { type: "STOCK", subType: "ETF" };
  }

  // Bonds / SGB / G-Sec / Debentures
  if (/\bsgb\b|sovereign\s*gold|bond|ncd|debenture|g-sec|treasury/.test(text)) {
    return { type: "BOND", subType: "BOND" };
  }

  // Mutual Funds
  if (/mutual\s*fund|\bfund\b|growth\s*direct|direct\s*plan|regular\s*plan|\bnav\b|index\s*fund/.test(text)) {
    return { type: "MUTUAL_FUND", subType: "MUTUAL_FUND" };
  }

  return { type: "STOCK", subType: "STOCK" };
}

function detectBroker(content: string, filename: string): string {
  const lower = `${content} ${filename}`.toLowerCase();
  if (lower.includes("zerodha") || lower.includes("kite") || lower.includes("console")) return "Zerodha";
  if (lower.includes("groww")) return "Groww";
  if (lower.includes("cams") || lower.includes("camsonline")) return "CAMS";
  if (lower.includes("kfintech") || lower.includes("karvy")) return "KFintech";
  if (lower.includes("upstox")) return "Upstox";
  if (lower.includes("angel") || lower.includes("angelone")) return "Angel One";
  if (lower.includes("icici") || lower.includes("icicidirect")) return "ICICI Direct";
  if (lower.includes("hdfc") || lower.includes("hdfcsec")) return "HDFC Securities";
  if (lower.includes("cas") || lower.includes("consolidated account")) return "CAS Statement";
  return "Investment Statement";
}

function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    // Parse CSV line handling quotes
    const row: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if ((char === "," || char === "\t") && !insideQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export async function parseInvestmentDocument(
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  userId: number
): Promise<InvestmentParseResult> {
  const isPdf = mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");

  let rawText = "";
  if (isPdf) {
    rawText = await extractPdfText(fileBuffer);
  } else {
    rawText = fileBuffer.toString("utf-8");
  }

  const broker = detectBroker(rawText, filename);
  const rows = parseCsvLines(rawText);

  // Strategy 1: Tabular / CSV structure
  if (rows.length >= 2) {
    const parsed = parseTabularRows(rows, broker, userId);
    if (parsed.validItems.length > 0) {
      return parsed;
    }
  }

  // Strategy 2: Line-by-line regex extraction for PDFs or unformatted text
  const textParsed = parseTextReport(rawText, broker, userId);
  return textParsed;
}

function parseTabularRows(
  rows: string[][],
  broker: string,
  userId: number
): InvestmentParseResult {
  // Find header row
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const candidate = rows[i].map((h) => h.toLowerCase());
    const hasNameOrSymbol = candidate.some((h) =>
      /instrument|symbol|stock|security|scrip|name|scheme/.test(h)
    );
    const hasQty = candidate.some((h) => /quantity|qty|units|shares/.test(h));
    const hasPriceOrInvested = candidate.some((h) =>
      /price|cost|invested|buy|avg|rate|nav|value|amount/.test(h)
    );

    if (hasNameOrSymbol && (hasQty || hasPriceOrInvested)) {
      headerIndex = i;
      headers = candidate;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      broker,
      statementType: "GENERIC",
      totalFound: 0,
      validItems: [],
      skippedRows: rows.length,
    };
  }

  // Map header columns
  const colMap = {
    symbol: headers.findIndex((h) => /symbol|scrip|ticker/.test(h)),
    name: headers.findIndex((h) => /instrument|security|name|stock|scheme|description/.test(h)),
    qty: headers.findIndex((h) => /quantity|qty|units|balance|shares/.test(h)),
    buyPrice: headers.findIndex((h) =>
      /avg.*cost|buy.*price|avg.*price|cost.*price|purchase.*nav|buy.*avg|trade.*price|exec.*price|^price$|^rate$/.test(h)
    ),
    invested: headers.findIndex((h) => /invested|buy.*value|total.*cost|amount.*invested|trade.*val/.test(h)),
    currentPrice: headers.findIndex((h) => /ltp|current.*price|market.*price|^nav$|last.*price|^cmp$/.test(h)),
    currentValue: headers.findIndex((h) => /current.*value|cur.*val|market.*val|valuation|present.*val/.test(h)),
    pnl: headers.findIndex((h) => /p&l|profit.*loss|unrealized|gain.*loss|returns/.test(h)),
    date: headers.findIndex((h) => /trade.*date|order.*date|txn.*date|^date$|order.*time/.test(h)),
    side: headers.findIndex((h) => /trade.*type|^side$|^type$|transaction.*type|action|buy.*sell/.test(h)),
  };

  if (colMap.name === -1 && colMap.symbol !== -1) colMap.name = colMap.symbol;
  if (colMap.name === -1) {
    return { broker, statementType: "GENERIC", totalFound: 0, validItems: [], skippedRows: rows.length };
  }

  const validItems: ParsedInvestmentItem[] = [];
  let skippedRows = 0;
  const seenHashes = new Set<string>();

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const rawName = colMap.name !== -1 ? row[colMap.name] : "";
    const rawSymbol = colMap.symbol !== -1 ? row[colMap.symbol] : null;

    if (!rawName || /total|summary|account|disclaimer|notes/i.test(rawName)) {
      skippedRows++;
      continue;
    }

    const qty = colMap.qty !== -1 ? cleanNumber(row[colMap.qty]) : null;
    const buyPrice = colMap.buyPrice !== -1 ? cleanNumber(row[colMap.buyPrice]) : null;
    const invested = colMap.invested !== -1 ? cleanNumber(row[colMap.invested]) : null;
    const currentPrice = colMap.currentPrice !== -1 ? cleanNumber(row[colMap.currentPrice]) : null;
    const currentValue = colMap.currentValue !== -1 ? cleanNumber(row[colMap.currentValue]) : null;
    const pnl = colMap.pnl !== -1 ? cleanNumber(row[colMap.pnl]) : null;
    const dateStr = colMap.date !== -1 ? row[colMap.date] : "";
    const sideRaw = colMap.side !== -1 ? row[colMap.side]?.toUpperCase() : "BUY";

    // Validate minimum financial integrity
    const validQty = qty && qty > 0 ? qty : 1;
    let validAvgPrice = buyPrice && buyPrice > 0 ? buyPrice : 0;
    let validInvested = invested && invested > 0 ? invested : 0;

    if (validAvgPrice > 0 && validInvested === 0) {
      validInvested = validAvgPrice * validQty;
    } else if (validInvested > 0 && validAvgPrice === 0) {
      validAvgPrice = validInvested / validQty;
    }

    // Must have at least an invested or current value
    if (validInvested === 0 && (!currentValue || currentValue === 0)) {
      skippedRows++;
      continue;
    }

    const { type, subType } = classifyInstrument(rawName, rawSymbol);
    const date = dateStr ? parseDateStr(dateStr) : null;
    const side: "BUY" | "SELL" = sideRaw.includes("SELL") ? "SELL" : "BUY";

    const item: Partial<ParsedInvestmentItem> = {
      name: rawName.trim(),
      symbol: rawSymbol ? rawSymbol.trim().toUpperCase() : null,
      type,
      subType,
      quantity: Number(validQty.toFixed(4)),
      averageBuyPrice: Number(validAvgPrice.toFixed(4)),
      investedAmount: Number(validInvested.toFixed(2)),
      currentPrice: currentPrice ? Number(currentPrice.toFixed(4)) : null,
      currentValue: currentValue ? Number(currentValue.toFixed(2)) : (currentPrice ? Number((currentPrice * validQty).toFixed(2)) : null),
      pnl: pnl !== null ? Number(pnl.toFixed(2)) : (currentValue ? Number((currentValue - validInvested).toFixed(2)) : null),
      returnPct: null,
      date,
      side,
      broker,
    };

    if (item.currentValue && item.investedAmount && item.investedAmount > 0) {
      item.returnPct = Number((((item.currentValue - item.investedAmount) / item.investedAmount) * 100).toFixed(2));
    }

    const hash = computeItemImportHash(userId, item);
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      validItems.push({
        ...item as ParsedInvestmentItem,
        importHash: hash,
      });
    } else {
      skippedRows++;
    }
  }

  return {
    broker,
    statementType: colMap.side !== -1 ? "TRADEBOOK" : "HOLDINGS",
    totalFound: validItems.length + skippedRows,
    validItems,
    skippedRows,
  };
}

function parseTextReport(
  text: string,
  broker: string,
  userId: number
): InvestmentParseResult {
  const lines = text.split(/\r?\n/);
  const validItems: ParsedInvestmentItem[] = [];
  const seenHashes = new Set<string>();

  // Regex pattern for common stock holdings: NAME QTY BUY_PRICE CURRENT_PRICE/VAL
  // Example: "RELIANCE 50 2450.00 2600.00" or "INFY.NSE 100 1400 1520"
  const holdingRegex = /([A-Za-z0-9&\-\.\s]{3,30})\s+(\d+(?:\.\d+)?)\s+(?:₹|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s+(?:₹|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /total|summary|page|disclaimer/i.test(trimmed)) continue;

    const match = trimmed.match(holdingRegex);
    if (match) {
      const rawName = match[1].trim();
      const qty = cleanNumber(match[2]);
      const price1 = cleanNumber(match[3]);
      const price2 = cleanNumber(match[4]);

      if (qty && qty > 0 && price1 && price1 > 0) {
        const { type, subType } = classifyInstrument(rawName);
        const invested = price1 * qty;
        const currentVal = price2 ? price2 * qty : null;

        const item: Partial<ParsedInvestmentItem> = {
          name: rawName,
          type,
          subType,
          quantity: qty,
          averageBuyPrice: price1,
          investedAmount: invested,
          currentValue: currentVal,
          currentPrice: price2,
          side: "BUY",
          broker,
        };

        const hash = computeItemImportHash(userId, item);
        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);
          validItems.push({
            ...item as ParsedInvestmentItem,
            importHash: hash,
          });
        }
      }
    }
  }

  return {
    broker,
    statementType: "HOLDINGS",
    totalFound: validItems.length,
    validItems,
    skippedRows: 0,
  };
}
