# Security

Status of the hardening checklist for this project. "Verified" items were
tested with an automated penetration test (`login`, SQLi, auth bypass, JWT
forgery, IDOR, brute force, oversized body, CORS) — all 27 checks pass.

| # | Item | Status |
|---|------|--------|
| 1 | Protect admin routes / server-side permission | **Done.** Everything under `/protected` requires a valid JWT; manager-only routes use `authorizeRoles('manager')`. Self-only routes use the token's user id. A cashier gets 403 on manager routes. |
| 2 | Enable RLS | **N/A (MySQL).** RLS is a Postgres feature. The equivalent — per-row/per-user access — is enforced in the route handlers (object-level checks, e.g. a cashier can only edit their own profile). |
| 3 | Verify email addresses | **Format verified** everywhere (matches the DB constraint). Email-ownership verification on sign-up is **N/A**: accounts are created by a trusted manager, not by public self-sign-up. |
| 4 | Hash passwords securely | **Done.** bcrypt, work factor **12** (`BCRYPT_ROUNDS`). Length 6–72. |
| 5 | Keep tokens out of localStorage | **Done on device.** The app stores the JWT in the OS secure store (`expo-secure-store`), not localStorage. Web (testing only) falls back to localStorage because browsers have no secure store. |
| 6 | Keep API secrets server-side | **Done.** `JWT_SECRET`, `EMAIL_PASS`, DB credentials live only in `backend/.env`. The app bundle contains no secrets. |
| 7 | Remove env files from git | **Ignored.** `.env` / `.env.*` are in `.gitignore`. **If `backend/.env` was ever committed, run:** `git rm --cached backend/.env && git commit -m "stop tracking .env"` and rotate `JWT_SECRET` + the Gmail app password. |
| 8 | Keep sensitive data out of logs | **Done.** No passwords/tokens/OTP codes are logged. Errors log a concise message (no request body, no SQL values); stack traces only outside production. |
| 9 | Parameterized SQL | **Done.** Every query uses bound parameters; no string-built SQL. Verified against injection payloads. |
| 10 | Validate form inputs | **Done.** Server validates ids, numbers, dates, email/phone, password length, and order items; the app validates before submit. |
| 11 | Block XSS | **Done.** The API returns JSON (not HTML) and React Native doesn't interpret HTML. The one HTML surface — the OTP email — escapes the user's name. `X-Content-Type-Options: nosniff` is set. |
| 12 | Verify webhook signatures | **N/A.** The app has no inbound webhooks. If you add a payment/e-wallet webhook later, verify its signature before trusting it. |
| 13 | Rate limit requests | **Done.** Per-IP limits on login / OTP endpoints + a global flood guard. Verified (429 after the limit). |
| 14 | Tighten CORS | **Done.** Browser requests are allowed only from configured origins (`CORS_ORIGINS`), or local/LAN origins when none are set; other sites are blocked. Native apps (no Origin) always work. No cookies/credentials. |
| 15 | Disable production debugging | **Done.** Clients only ever get generic error messages; stack traces are logged (not returned) and are suppressed in logs when `NODE_ENV=production`. No debug routes. `X-Powered-By` is hidden. |
| 16 | Update vulnerable dependencies | **Backend: 0 vulnerabilities.** Frontend: run `npm audit fix` (safe). Two advisories can't be auto-fixed safely and are low real-risk here: **xlsx** (prototype-pollution/ReDoS only affect *parsing* untrusted spreadsheets — this app only *generates* them; a fixed build exists on the SheetJS CDN if you want zero findings) and **zod / Expo tooling** (build-time only; the "fix" downgrades Expo — not worth it). |
| 17 | Claude Code security review | This review. You can also run `/security-review` in Claude Code against the repo any time. |

## Deployment must-dos

- **Use HTTPS.** On plain `http://` over the LAN, passwords and tokens are sent
  in clear text. Put the API behind HTTPS (reverse proxy) for real use.
- Set a long random `JWT_SECRET` (the server warns if it's short) and
  `NODE_ENV=production` on the live server.
- Keep `backend/.env` out of git; rotate secrets if they were ever committed.
