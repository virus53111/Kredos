# PhoneBridge — Stage 2

Stage 1 design prototype for a two-sided marketplace where:

- renters can choose a real Android device and rent it remotely;
- phone owners can list eligible Android devices and earn only when a paid rental is active;
- current concept pricing: **$1/hour** or **$10/24h**;
- host share concept: **$0.50 per paid hour**;
- supported UI languages: Russian, English, Latvian, Estonian, Lithuanian, Ukrainian.

## What is implemented now

- responsive landing page;
- renter / host entry paths;
- device cards and pricing presentation;
- host earnings explainer;
- referral program UI;
- lawful-use notice;
- working language selector with local persistence.\n- renter/host registration and login screens;\n- role-specific dashboards;\n- local session persistence and referral code generation;\n- PBKDF2 password hashing for the Stage 2 browser prototype.

## Not implemented yet

Stage 2 auth is a browser-only prototype: accounts are stored locally on the current device. There is still no production server database, real network authentication, payments, device agent, remote-control gateway, session billing or payouts.

## Planned stages

1. **Design & UX** — current stage.
2. **Accounts & database** — renter/host profiles, phone records, admin.
4. **Device agent & presence** — Android client registration, online/offline state, verification.
5. **Remote sessions** — secure session token, reservation, connection gateway, server-side timer.
6. **Wallet & crypto payments** — deposits, ledger, hourly charging.
7. **Host earnings & payouts** — $0.50/hour accounting, payout requests.
8. **Referral engine** — host commissions and renter discounts.
9. **Moderation & abuse controls** — device verification, usage rules, logs, bans, rate limits.
10. **Production deployment & QA** — monitoring, backups, security review and end-to-end tests.

## Local preview

Open `index.html` in a browser.

> Placeholder brand name: **PhoneBridge**. It can be renamed before production.
