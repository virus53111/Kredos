# PhoneBridge — Firebase deployment

The web app already uses Firebase project `kredos-3f3d6`.

## One-time requirement

The new PhoneBridge Firestore rules in `firestore.rules` must be published before host device records can be created.

### Option A — Firebase Console

1. Open Firebase Console → project `kredos-3f3d6`.
2. Firestore Database → Rules.
3. Replace the current rules with the contents of `firestore.rules`.
4. Publish.

### Option B — GitHub Actions

1. Install Firebase CLI locally and authenticate:
   `npx firebase-tools login:ci`
2. Copy the generated CI token.
3. GitHub repository → Settings → Secrets and variables → Actions.
4. Create secret `FIREBASE_TOKEN`.
5. Actions → **Deploy Firestore Rules** → Run workflow.

No service-account private keys belong in this repository.

## Stage 3 collections

- `users/{uid}` — account role and referral code.
- `devices/{deviceId}` — phone metadata owned by a host.
- `sessions/{sessionId}` — reserved for Stage 5; client access currently denied.
- `wallets/{uid}` — reserved for Stage 6; client writes currently denied.

Phone records start as `pending` and `public:false`. Stage 4 will attach the Android agent and online/offline state.
