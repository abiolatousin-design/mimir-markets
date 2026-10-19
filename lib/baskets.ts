import { isValidBps } from "./money";

/**
 * What the creator signs when composing a basket. Readable, because a hardware
 * wallet shows it verbatim.
 *
 * The address is interpolated verbatim: a Stellar strkey is case-sensitive
 * base32, so any toLowerCase() on it would produce a string no wallet ever signed.
 */
export function basketMessage(args: {
  name: string; creator: string; members: Array<{ agentId: string; weightBps: number }>;
}): string {
  return [
    "Mimir basket",
    `name: ${args.name}`,
    `creator: ${args.creator}`,
    `members: ${args.members.map((m) => `${m.agentId}:${m.weightBps}`).join(",")}`,
  ].join("\n");
}

/**
 * How long a transfer authorisation is valid from the moment it is signed.
 *
 * Five minutes matches the agent-request clock-skew window
 * (`AGENT_REQUEST_MAX_SKEW_NS` in lib/agents/api.ts). A signer generates the
 * message, signs it in their wallet, and submits — that round-trip is well
 * inside five minutes. Any captured signature is useless after the window.
 */
export const TRANSFER_EXPIRY_MS = 5 * 60_000; // 5 minutes

/**
 * What the CURRENT owner signs to authorise a transfer.
 *
 * Both addresses are interpolated verbatim — Stellar strkeys are case-sensitive
 * base32 and must never be lowercased. The message now also includes:
 *
 *  - `nonce`     — a client-generated UUID, stored on the server after first use
 *                  so the same signed message is rejected on any replay attempt.
 *  - `expiresAt` — an ISO-8601 timestamp; the server rejects the message if the
 *                  current time is past this value. Limits the replay window even before
 *                  the nonce has been persisted (e.g. during a DH outage).
 *
 * Together these two fields mean:
 *   - A signature captured in transit cannot be replayed after TRANSFER_EXPIRY_MS.
 *   - Even within the window, submitting the same signed payload twice is rejected
 *     by the UNIQUE(nonce) constraint on basket_ownership_transfers.
 *   - If ownership cycles A–B→…, the old A–B→… signature is still unusable because
 *     its nonce was consumed on first use.
 */
export function transferMessage(args: {
  basketId: string;
  currentOwner: string;
  newOwner: string;
  nonce: string;
  expiresAt: number;
}): string {
  return [
    "Mimir basket transfer",
    `basket: ${args.basketId}`,
    `from: ${args.currentOwner}`,
    `to: ${args.newOwner}`,
    `nonce: ${args.nonce}`,
    `expiresAt: ${new Date(args.expiresAt).toISOString()}`,
  ].join("\n");
}

/**
 * What a subscriber signs to follow or unfollow a basket.
 *
 * The action is part of the signed text, so a subscribe signature can never be
 * presented as an unsubscribe (or the reverse), and the nonce plus a short
 * expiry make each signature single-use. The address is interpolated
 * VERBATIM: a Stellar strkey is case-sensitive base32. Shared by the route and
 * the browser so both build the message byte for byte.
 */
export function subscriptionMessage(args: {
  action: "subscribe" | "unsubscribe";
  basketId: string;
  subscriber: string;
  perMarketUsdc: number;
  nonce: string;
  expiresAt: number;
}): string {
  return [
    "Mimir basket subscription",
    `action: ${args.action}`,
    `basket: ${args.basketId}`,
    `subscriber: ${args.subscriber}`,
    `per market: ${args.perMarketUsdc} USDC`,
    `nonce: ${args.nonce}`,
    `expiresAt: ${new Date(args.expiresAt).toISOString()}`,
    "Mimir never holds your funds. Every stake is signed by you.",
  ].join("\n");
}

/** Minimum per-market amount in USDC that a follower can set. */
export const PER_MARKET_MIN_USDC = 1;

/** Maximum per-market amount in USDC that a follower can set. */
export const PER_MARKET_MAX_USDC = 100;

export type PerMarketParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * Parse the raw string from the per-market input into a valid USDC amount.
 *
 * The input keeps the raw string in state while editing so the field can be
 * cleared and retyped freely; this helper is the single source of truth for
 * whether the current value is acceptable and what error to show if not.
 */
export function parsePerMarketUsdc(raw: string): PerMarketParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return {
      ok: false,
      error: `Enter an amount between ${PER_MARKET_MIN_USDC} and ${PER_MARKET_MAX_USDC} USDC.`,
    };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Enter a valid number." };
  }
  if (!Number.isInteger(n)) {
    return { ok: false, error: "Use a whole number of USDC." };
  }
  if (n < PER_MARKET_MIN_USDC || n > PER_MARKET_MAX_USDC) {
    return {
      ok: false,
      error: `Enter an amount between ${PER_MARKET_MIN_USDC} and ${PER_MARKET_MAX_USDC} USDC.`,
    };
  }
  return { ok: true, value: n };
}

/**
 * The ids of curated baskets that ship with Mimir.
 *
 * Kept here (the pure computation module, no server-only dependency) so that
 * tests and non-server code can verify the curated-basket guard without pulling
 * in lib/server/basket-directory which carries `import "server-only"`.
 *
 * This list must stay in sync with BASKT
 */
export const CURATED_BASKET_IDS: readonly string[] = [];
