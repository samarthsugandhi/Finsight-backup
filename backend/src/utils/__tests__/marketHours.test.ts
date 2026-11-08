import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isNseOpen, isNseInstrument, getIstDate, NSE_TRADING_HOLIDAYS_2026 } from "../marketHours";

describe("marketHours utility", () => {
  it("correctly identifies NSE vs non-NSE instruments", () => {
    // Crypto is 24/7, never an NSE instrument
    assert.equal(isNseInstrument("BTC/USD", "CRYPTO"), false);
    assert.equal(isNseInstrument("ETH/USD", "CRYPTO"), false);
    assert.equal(isNseInstrument("BTC/USD"), false);

    // Stock index and NSE-listed tickers
    assert.equal(isNseInstrument("^NSEI", "STOCK"), true);
    assert.equal(isNseInstrument("TCS:NSE", "STOCK"), true);
    assert.equal(isNseInstrument("RELIANCE:NSE"), true);
    assert.equal(isNseInstrument("INFY", "STOCK"), true);

    // Other non-stock instruments without :NSE
    assert.equal(isNseInstrument("GOLD_SBI", "GOLD"), false);
    assert.equal(isNseInstrument("HDFC_FD", "FIXED_DEPOSIT"), false);
  });

  it("converts dates to IST accurately (+5:30)", () => {
    // UTC 03:45 -> IST 09:15
    const utcDate = new Date("2026-09-11T03:45:00.000Z");
    const ist = getIstDate(utcDate);
    assert.equal(ist.getHours(), 9);
    assert.equal(ist.getMinutes(), 15);
  });

  it("returns false on weekends", () => {
    // Saturday: 2026-09-12 11:00 IST
    const saturday = new Date("2026-09-12T11:00:00+05:30");
    assert.equal(isNseOpen(saturday), false);

    // Sunday: 2026-09-13 11:00 IST
    const sunday = new Date("2026-09-13T11:00:00+05:30");
    assert.equal(isNseOpen(sunday), false);
  });

  it("returns false on official NSE trading holidays", () => {
    // Republic Day (Monday): 2026-01-26 at 11:00 IST
    const republicDay = new Date("2026-01-26T11:00:00+05:30");
    assert.equal(isNseOpen(republicDay), false);

    // Good Friday: 2026-04-03 at 10:30 IST
    const goodFriday = new Date("2026-04-03T10:30:00+05:30");
    assert.equal(isNseOpen(goodFriday), false);

    // Maharashtra Day: 2026-05-01 at 12:00 IST
    const maharashtraDay = new Date("2026-05-01T12:00:00+05:30");
    assert.equal(isNseOpen(maharashtraDay), false);

    // Ganesh Chaturthi: 2026-09-14 at 11:00 IST
    const ganeshChaturthi = new Date("2026-09-14T11:00:00+05:30");
    assert.equal(isNseOpen(ganeshChaturthi), false);
  });

  it("checks trading hours on normal trading days (09:15 to 15:30 IST)", () => {
    // Friday: 2026-09-11
    const beforeOpen = new Date("2026-09-11T09:14:59+05:30");
    assert.equal(isNseOpen(beforeOpen), false);

    const atOpen = new Date("2026-09-11T09:15:00+05:30");
    assert.equal(isNseOpen(atOpen), true);

    const duringDay = new Date("2026-09-11T12:00:00+05:30");
    assert.equal(isNseOpen(duringDay), true);

    const atClose = new Date("2026-09-11T15:30:00+05:30");
    assert.equal(isNseOpen(atClose), true);

    const afterClose = new Date("2026-09-11T15:30:01+05:30");
    assert.equal(isNseOpen(afterClose), false);
  });
});
