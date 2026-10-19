# Changelog

All notable changes to Mimir are documented here. The format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); entries describe the
why, the commit history records the what.

## [Unreleased]

### Changed

- **CI path filters now fail closed** ([#127](https://github.com/mimir-stellar/mimir-markets/issues/127), [#168](https://github.com/mimir-stellar/mimir-markets/pull/168)). CI selects what to run from an allowlist of changed paths instead of one monolithic job: a changed path either maps to a tier (`app`, `agents`, `contracts`, `tests`) and runs that tier's checks, or it matches nothing and is UNKNOWN — and UNKNOWN fails the build. Filters that fail open are worse than none at all: they turn a green check into a lie about what was verified. Every degenerate case therefore resolves to "run more", never "run less":
  - An unclassified path (new top-level directory, unlisted root file, near-miss like `appx/`) fails the paths job and runs all tiers.
  - An undecidable change set (missing event payload, failed fetch, no merge-base) runs all tiers and marks the run red.
  - Doc-only changes (`README.md`, `CHANGELOG.md`, `LICENSE`, `docs/`) are the one explicit "run nothing" outcome.
- Adding a scope is now a reviewed, parity-checked decision: `lib/ci/path-scope.ts` (the tested contract) and `scripts/ci/changed-paths.mjs` (the workflow driver) must stay identical, enforced by `npm run check:driver-parity` and `tests/node/ci-path-scope.test.ts`. A green CI run now means the suites that ran are exactly the suites the change required.

### Added

- **Two-step ownership transfer** in `contracts-soroban/mimir-market`. Ownership no longer moves on a single call. The owner now calls `propose_owner(new_owner)`, and the proposed address must sign `accept_ownership`` before the owner slot changes. `cancel_owner_proposal` lets the owner withdraw a pending proposal, and a second proposal overwrites the first. This closes the brick risk of a typo or a contract that cannot sign locking fee policy and oracle rotations forever. New events: `OwnershipProposed`, `OwnershipProposalCancelled`, and the existing `OwnershipTransferred` now fires on acceptance. See `docs/LIFECYCLE_EVENTS.md`.

### Deprecated

- `transfer_ownership(new_owner)` is kept as a deprecated alias for `propose_owner(new_owner)`. It no longer changes the owner immediately; it only stores a pending owner that must still be accepted. Callers should migrate to `propose_owner` + `accept_ownership`.
