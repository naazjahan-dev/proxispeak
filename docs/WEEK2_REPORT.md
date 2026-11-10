# Week 2 Report (2026-10-17)

## Work Completed
- Expanded automated tests (unit + integration). All 19/19 green.
- Hardened session lifecycle (startup orphan sweep, single active session per user, TTL backstop, correct disconnect handling).
- Implemented proximity deltas (peer-entered-proximity/peer-left-proximity) with bidirectional set tracking.
- Documentation/scripts for reproducible runs (`npm test`, `npm run test:smoke`, `npm run test:schema`, `npm run test:e2e`).
- Graceful shutdown/refinements and Redis cleanup improvements.

## Known Limitations
- Multi-instance scaling with Redis adapter not verified (no Redis).
- No authentication/authorization (join unauthenticated). Real tokens/room ACLs recommended.
- Session janitor uses in-process socket map; cross-instance stale relies on TTL/backstop.

## Recommended Next Steps
- Add auth (join tokens) and per-room access control.
- Add metrics/structured logging; load testing; Redis-enabled integration tests in a containerized setup.
