# The Renovate Team — individual-account portal

This is the separately hosted version of the existing portal. It retains the RT branding and timesheets, expenses, PTO, handbook placeholder, confidential HR reports and team board. Team members sign in with their own username and password; ChatGPT accounts are not used.

## Current status

The application builds and passes the authentication and HTTP integration checks. It is prepared for deployment but is not online. The original Site remains unchanged. A separate hosting account, persistent storage, HTTPS and DNS access are still needed.

The included migration snapshot was read from the live Site on October 1, 2026 UTC (September 30 in Oklahoma). It contains one existing administrator member and zero rows in entries, posts, comments and reactions. No receipt or board-photo objects are referenced. The original administrator ID is retained when importing. Before cutover, recheck the live Site for any records added after this snapshot and export those too; never replace a populated destination database with this snapshot.

## Local check

Use Node.js 24 or newer.

```sh
npm ci
npm test
node tests/http-smoke.mjs
npm run build
node tests/http-smoke.mjs --production
```

For local use, set PORTAL_DATA_DIR to a private absolute path and PORTAL_ORIGIN to http://localhost:3000. Run `npm run init`, open the resulting private link to set Marc's password, then `npm run dev`. No default password is provided. Production uses secure cookies and requires HTTPS.

## Deploy with Docker

The host must support Docker with a persistent named volume. This setup is intended for one application instance. Do not use ephemeral storage, edge-only hosting or multiple independent SQLite copies.

1. Point team.renovateteam.com at the chosen server; leave www.renovateteam.com on Squarespace.
2. Put an HTTPS reverse proxy in front of localhost:3000. Preserve the original Host header; do not rewrite Origin or enable wildcard allowed origins. Restrict inbound traffic to the proxy.
3. Run `docker compose build`, then `docker compose up -d`.
4. Run `docker compose exec portal node scripts/init.mjs`. This imports the included snapshot only into an empty destination. It issues a one-hour, one-use link for the existing Marc administrator, with username `marc`. Treat the link as a password: it is printed only for the operator, and must not be posted publicly.
5. Set Marc's password through that link. Log in, open Admin, and create team-member accounts. Send each setup link directly to that person after confirming their identity. Links expire after one hour and are replaced when a new link is issued.
6. Test from a team-member account and phone before adding a Team Member Login link to Squarespace.

Use `docker compose exec portal node scripts/init.mjs --recover-admin` only for verified administrator recovery from the server console. The initializer does not overwrite an established password. In-app password changes require the old password and revoke all sessions. Password recovery for team members is administrator-assisted; automatic recovery emails are not configured.

## Account behavior

- Usernames are case-insensitive, 3–40 characters, and unique.
- Passwords are 12–128 characters; salted scrypt hashes are stored instead of passwords.
- Sessions expire after eight hours. Logout, password reset and disabling an account invalidate access.
- Only administrators create accounts and issue recovery links. New accounts never receive admin permissions through user input.
- Every existing submission action still checks the signed-in member on the server. Receipts stay restricted to their owner and administrators. Board photos are available only to active team members.
- Password-link tokens are stored as hashes. Links put the token in a browser fragment rather than an HTTP query string; the page removes the fragment after reading it.
- Per-username sign-in limits and a global sign-in limit are backed by SQLite, rather than process memory.

## Data and backups

SQLite and receipt/photo files live under PORTAL_DATA_DIR, outside public assets. Docker stores this at /data in the portal-data volume. Back up both the database and uploads together. Stop writes during a filesystem backup, or use SQLite's online backup API and copy uploads in the same controlled window. Test a restore before employee rollout. Keep backups and exports private.

The handbook and mail service are still pending as in the original portal. Existing paid-holiday wording remains; this version does not add automatic holiday exclusions to PTO calculations.

## Validation

The authentication suite tests salted password hashes, incorrect credentials, username validation, preservation of existing member IDs, one-time and expired setup links, replaced links, disabled accounts, session expiry and sign-in throttling. The HTTP check exercises actual Next.js form submissions: sign-in, employee record isolation, admin-only data and account creation, rejection of employee account-management attempts, password setup/reuse, session revocation and logout.

A production build and TypeScript checks pass, and the HTTP checks pass against the standalone production server. Administrator bootstrap was verified to preserve the captured original member ID. The Docker configuration is supplied but was not built in this environment. A host deployment, HTTPS/DNS checks, backups and phone review remain to be completed on the selected host.
