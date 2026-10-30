// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

const latestByTransaction = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);
for (const line of lines) {
  if (line.length === 0) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  if (!event || typeof event !== "object" || !event.txn_id) continue;

  const timestamp = Date.parse(event.ts);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid timestamp for transaction ${event.txn_id}`);
  }

  const previous = latestByTransaction.get(event.txn_id);
  if (!previous || timestamp >= previous.timestamp) {
    latestByTransaction.set(event.txn_id, { event, timestamp });
  }
}

let totalKobo = 0;
let count = 0;
for (const { event } of latestByTransaction.values()) {
  if (event.status === "success") {
    const amount = Number(String(event.amount).replace(/,/g, ""));
    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid amount for transaction ${event.txn_id}`);
    }

    totalKobo += Math.round(amount * 100);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(totalKobo / 100)}`);
}
