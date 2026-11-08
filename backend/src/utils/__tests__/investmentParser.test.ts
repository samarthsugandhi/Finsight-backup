import { parseInvestmentDocument } from "../investmentParser";

let failures = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

async function runTests() {
  console.log("▶ Investment Parser & Statement Ingestion Suite\n");

  // 1. Zerodha Holdings CSV Report
  const zerodhaCsv = `
Instrument,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg.
TCS,10,3400.00,3800.00,38000.00,4000.00,11.76
INFY,50,1400.00,1550.00,77500.00,7500.00,10.71
NIFTYBEES,100,220.00,250.00,25000.00,3000.00,13.64
GOLDBEES,50,55.00,65.00,3250.00,500.00,18.18
Total,,,,143750.00,15000.00,
`;

  const parsedZerodha = await parseInvestmentDocument(
    Buffer.from(zerodhaCsv),
    "holdings-zerodha.csv",
    "text/csv",
    1
  );

  assert("detects Zerodha broker", parsedZerodha.broker === "Zerodha", `got ${parsedZerodha.broker}`);
  assert("identifies statement type as HOLDINGS", parsedZerodha.statementType === "HOLDINGS");
  assert("extracts 4 valid holdings, ignoring total row", parsedZerodha.validItems.length === 4, `got ${parsedZerodha.validItems.length}`);

  const tcs = parsedZerodha.validItems.find((i) => i.name === "TCS");
  assert("TCS quantity parsed correctly", tcs?.quantity === 10);
  assert("TCS avg cost parsed correctly", tcs?.averageBuyPrice === 3400);
  assert("TCS current value parsed correctly", tcs?.currentValue === 38000);
  assert("TCS is classified as STOCK", tcs?.type === "STOCK" && tcs?.subType === "STOCK");

  const niftyBees = parsedZerodha.validItems.find((i) => i.name === "NIFTYBEES");
  assert("NIFTYBEES is classified as ETF", niftyBees?.subType === "ETF");

  const goldBees = parsedZerodha.validItems.find((i) => i.name === "GOLDBEES");
  assert("GOLDBEES is classified as GOLD_ETF", goldBees?.subType === "GOLD_ETF");

  // 2. Tradebook CSV with Trade Date, Buy/Sell Side, and Quantities
  const tradebookCsv = `
Symbol,Trade Date,Type,Quantity,Price,Order ID
RELIANCE,2026-04-15,BUY,25,2450.50,ORD123456
HDFCBANK,2026-05-10,BUY,40,1520.00,ORD789012
`;

  const parsedTradebook = await parseInvestmentDocument(
    Buffer.from(tradebookCsv),
    "groww_tradebook.csv",
    "text/csv",
    1
  );

  assert("identifies tradebook statement type", parsedTradebook.statementType === "TRADEBOOK");
  assert("extracts 2 trade orders", parsedTradebook.validItems.length === 2);
  const reliance = parsedTradebook.validItems.find((i) => i.name === "RELIANCE");
  assert("reliance trade price parsed", reliance?.averageBuyPrice === 2450.5);
  assert("reliance trade side is BUY", reliance?.side === "BUY");
  assert("reliance trade date is parsed", reliance?.date instanceof Date);

  // 3. Mutual Fund Statement
  const mfCsv = `
Scheme Name,Folio No,Units,Purchase NAV,Amount Invested,Current NAV,Current Value
Parag Parikh Flexi Cap Fund Direct Growth,12345/67,450.25,55.20,24853.80,68.40,30797.10
HDFC Top 100 Fund Direct Plan,98765/43,200.00,85.50,17100.00,95.00,19000.00
SGB 2026 Series I,SGB1234,10,4800.00,48000.00,6200.00,62000.00
`;

  const parsedMf = await parseInvestmentDocument(
    Buffer.from(mfCsv),
    "cams_cas_statement.csv",
    "text/csv",
    1
  );

  assert("detects CAMS broker/source", parsedMf.broker === "CAMS");
  assert("extracts 3 scheme holdings", parsedMf.validItems.length === 3);

  const ppfas = parsedMf.validItems.find((i) => i.name.includes("Parag Parikh"));
  assert("PPFAS classified as MUTUAL_FUND", ppfas?.type === "MUTUAL_FUND");
  assert("PPFAS units and invested amounts accurate", ppfas?.quantity === 450.25 && ppfas?.investedAmount === 24853.8);

  const sgb = parsedMf.validItems.find((i) => i.name.includes("SGB"));
  assert("SGB classified as BOND", sgb?.type === "BOND");

  // 4. Deterministic Hash Deduplication
  const item1 = parsedZerodha.validItems[0];
  assert("item generates deterministic non-empty importHash", typeof item1.importHash === "string" && item1.importHash.length === 64);

  // Re-parsing same CSV produces identical hashes
  const parsedAgain = await parseInvestmentDocument(
    Buffer.from(zerodhaCsv),
    "holdings-zerodha.csv",
    "text/csv",
    1
  );
  assert("identical CSV produces identical importHash (Idempotent)", parsedAgain.validItems[0].importHash === item1.importHash);

  // 5. Corrupt / empty rows handled gracefully
  const garbageCsv = `
Header1,Header2
Random,Noise
,,
`;
  const parsedGarbage = await parseInvestmentDocument(
    Buffer.from(garbageCsv),
    "unknown.csv",
    "text/csv",
    1
  );
  assert("garbage CSV safely yields 0 valid items without crashing", parsedGarbage.validItems.length === 0);

  console.log(failures === 0 ? "\nALL INVESTMENT PARSER TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test runner threw uncaught error:", err);
  process.exit(1);
});
