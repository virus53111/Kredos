# PhoneBridge Agent

Stage 4 Android agent for PhoneBridge.

What it does:
- accepts the one-time pairing string generated in the host dashboard;
- stores a server-issued device token locally on the phone;
- runs a visible Android foreground service;
- sends a heartbeat every 60 seconds so the PhoneBridge dashboard can show Online / Offline.

What it does NOT do in Stage 4:
- no screen capture;
- no remote taps or keyboard control;
- no SMS, contacts, call logs, IMEI, photos, or account access.

Minimum Android: 12 (API 31).

The debug APK is built by GitHub Actions and published as a prerelease for testing.
