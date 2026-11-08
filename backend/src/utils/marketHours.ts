/**
 * Official NSE Trading Holidays for Equity (Capital Market / CM) Segment.
 * Source: National Stock Exchange of India (NSE)
 * https://www.nseindia.com/resources/exchange-communication-trading-holidays
 * API endpoint: https://www.nseindia.com/api/holiday-master?type=trading
 *
 * Update this list annually once NSE releases the circular for the upcoming calendar year
 * (typically published in November/December for the following year).
 */
export const NSE_TRADING_HOLIDAYS_2026: readonly string[] = [
  "2026-01-15", // Municipal Corporation Election - Maharashtra (Thursday)
  "2026-01-26", // Republic Day (Monday)
  "2026-02-15", // Mahashivratri (Sunday)
  "2026-03-03", // Holi (Tuesday)
  "2026-03-21", // Id-Ul-Fitr / Ramadan Eid (Saturday)
  "2026-03-26", // Shri Ram Navami (Thursday)
  "2026-03-31", // Shri Mahavir Jayanti (Tuesday)
  "2026-04-03", // Good Friday (Friday)
  "2026-04-14", // Dr. Baba Saheb Ambedkar Jayanti (Tuesday)
  "2026-05-01", // Maharashtra Day (Friday)
  "2026-05-28", // Bakri Id (Thursday)
  "2026-06-26", // Muharram (Friday)
  "2026-08-15", // Independence Day (Saturday)
  "2026-09-14", // Ganesh Chaturthi (Monday)
  "2026-10-02", // Mahatma Gandhi Jayanti (Friday)
  "2026-10-20", // Dussehra (Tuesday)
  "2026-11-08", // Diwali Laxmi Pujan (Sunday - Special Muhurat Trading evening session)
  "2026-11-10", // Diwali-Balipratipada (Tuesday)
  "2026-11-24", // Prakash Gurpurb Sri Guru Nanak Dev (Tuesday)
  "2026-12-25", // Christmas (Friday)
];

export const NSE_TRADING_HOLIDAYS_2025: readonly string[] = [
  "2025-02-26", // Mahashivratri (Wednesday)
  "2025-03-14", // Holi (Friday)
  "2025-03-31", // Id-ul-Fitr (Monday)
  "2025-04-10", // Mahavir Jayanti (Thursday)
  "2025-04-14", // Dr. Baba Saheb Ambedkar Jayanti (Monday)
  "2025-04-18", // Good Friday (Friday)
  "2025-05-01", // Maharashtra Day (Thursday)
  "2025-08-15", // Independence Day (Friday)
  "2025-08-27", // Ganesh Chaturthi (Wednesday)
  "2025-10-02", // Mahatma Gandhi Jayanti / Dussehra (Thursday)
  "2025-10-21", // Diwali Balipratipada (Tuesday)
  "2025-11-05", // Prakash Gurpurb Sri Guru Nanak Dev (Wednesday)
  "2025-12-25", // Christmas (Thursday)
];

export const NSE_SUPPORTED_YEARS: readonly number[] = [2025, 2026];

const NSE_HOLIDAY_SET = new Set<string>([
  ...NSE_TRADING_HOLIDAYS_2025,
  ...NSE_TRADING_HOLIDAYS_2026,
]);

let warnedMissingYear: number | null = null;

/**
 * Checks if the current year is covered by the hardcoded holiday calendar.
 * Logs a single warning per missing year if the calendar needs an update.
 */
function checkHolidayCoverage(year: number) {
  if (!NSE_SUPPORTED_YEARS.includes(year) && warnedMissingYear !== year) {
    warnedMissingYear = year;
    console.warn(
      `[marketHours] Warning: NSE trading holidays are not defined for year ${year}. ` +
      `Supported years are: ${NSE_SUPPORTED_YEARS.join(", ")}. ` +
      `Please update NSE_TRADING_HOLIDAYS in backend/src/utils/marketHours.ts using the official circular at ` +
      `https://www.nseindia.com/resources/exchange-communication-trading-holidays`
    );
  }
}

/**
 * Returns whether a symbol/assetType represents an instrument traded on the NSE.
 * Crypto (e.g. BTC/USD) trades 24/7 and is NOT an NSE instrument.
 * Stocks (^NSEI, *:NSE, or assetType === "STOCK") trade on the NSE.
 */
export function isNseInstrument(symbol: string, assetType?: string | null): boolean {
  if (assetType === "CRYPTO" || symbol === "BTC/USD") {
    return false;
  }
  if (symbol === "^NSEI" || symbol.endsWith(":NSE")) {
    return true;
  }
  if (assetType === "STOCK") {
    return true;
  }
  return false;
}

/**
 * Converts any Date to an Indian Standard Time (IST = UTC+5:30) Date object.
 * Uses exact millisecond offset without requiring external date libraries.
 */
export function getIstDate(date: Date = new Date()): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.5 * 3600000);
}

/**
 * Determines whether the National Stock Exchange of India (NSE) is currently open.
 * - Closed on Saturdays and Sundays.
 * - Closed on published NSE annual trading holidays.
 * - Open Monday to Friday between 09:15 and 15:30 IST.
 */
export function isNseOpen(date: Date = new Date()): boolean {
  const ist = getIstDate(date);
  const currentYear = ist.getFullYear();
  checkHolidayCoverage(currentYear);

  // Sunday = 0, Saturday = 6
  const day = ist.getDay();
  if (day === 0 || day === 6) {
    return false;
  }

  // Format as YYYY-MM-DD in IST
  const y = currentYear;
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  const dateKey = `${y}-${m}-${d}`;

  if (NSE_HOLIDAY_SET.has(dateKey)) {
    return false;
  }

  // NSE regular market hours: 09:15:00 to 15:30:00 IST
  const totalSeconds = ist.getHours() * 3600 + ist.getMinutes() * 60 + ist.getSeconds();
  const openSeconds = 9 * 3600 + 15 * 60;   // 09:15 IST = 33,300s
  const closeSeconds = 15 * 3600 + 30 * 60; // 15:30 IST = 55,800s

  return totalSeconds >= openSeconds && totalSeconds <= closeSeconds;
}
