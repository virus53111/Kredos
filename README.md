# PhoneBridge — Stage 3

Two-sided marketplace concept for remote access to real Android phones.

- renters: **$1/hour** or **$10/24h**;
- host share: **$0.50 per paid hour**;
- languages: Russian, English, Latvian, Estonian, Lithuanian, Ukrainian.

## Implemented

### Stage 1 — Design
- responsive landing page;
- renter / host entry paths;
- device cards and pricing;
- host earnings explanation;
- referral-program UI;
- lawful-use notice;
- six-language UI.

### Stage 2 — Accounts & dashboards
- renter / host registration screens;
- role-specific dashboards;
- referral code per account.

### Stage 3 — Firebase & device database
- real Firebase Email/Password Authentication;
- Firebase session persistence across devices;
- Firestore `users/{uid}` profiles;
- Firestore `devices/{deviceId}` host phone records;
- host device onboarding form;
- device status starts as `pending`;
- Firestore security rules scoped to account/device ownership;
- manual GitHub Action for Firestore rules deployment.

## Required before Firestore writes work

Publish the new `firestore.rules` to Firebase project `kredos-3f3d6`.

See [FIREBASE_DEPLOY.md](FIREBASE_DEPLOY.md).

Firebase Authentication can work independently, but Firestore will reject the new `users` / `devices` structure until those rules are published.

## Next stages

4. **Android device agent & presence** — device registration token, heartbeat, online/offline status and verification.
5. **Remote sessions** — secure reservation, remote-control gateway and server-side timer.
6. **Crypto wallet & payments** — deposits, ledger and $1/hour billing.
7. **Host earnings & payouts** — $0.50/hour accounting and withdrawals.
8. **Referral engine** — host referral commission and renter discounts.
9. **Moderation & abuse controls** — verification, usage rules, logs, bans and rate limits.
10. **Production QA** — monitoring, backups, security review and end-to-end testing.

## Files

- `index.html` — public landing page.
- `auth.html` — Firebase registration / sign-in.
- `dashboard.html` — renter / host dashboard.
- `firebase-client.js` — Firebase client integration.
- `firestore.rules` — server-side database access rules.
- `FIREBASE_DEPLOY.md` — deployment instructions.

> **PhoneBridge** is currently a working project name and can be renamed before production.
