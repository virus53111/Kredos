# PhoneBridge

Stage 4 working prototype for a marketplace that rents access to real Android phones.

Live app: https://phonebridge-zfvppo.v2.appdeploy.ai/

## Implemented

- managed sign-in;
- renter / phone-owner roles;
- persistent server-side profiles;
- host phone records;
- one-time device pairing codes (10 minute expiry);
- Android agent claim flow with a server-issued device token;
- visible Android foreground service with a 60-second heartbeat;
- host dashboard Online / Offline status (120-second online window);
- $1/hour and $10/24h pricing presentation;
- $0.50/hour host-share presentation;
- referral code per profile;
- Russian, English, Latvian, Estonian, Lithuanian and Ukrainian UI.

## Android Agent

Source is in `android-agent/`.

The agent currently does only Stage 4 presence:
- pairs a phone to a host-owned device record;
- stores the issued device token locally;
- sends heartbeat and basic model/Android metadata;
- shows a persistent Android notification while active.

It does **not** read SMS, contacts, call logs, IMEI, photos, or accounts. It does not provide screen control yet.

GitHub Actions builds a debug APK and publishes it as a prerelease:
https://github.com/virus53111/Kredos/releases

## Next

Stage 5: explicit-consent remote screen/control session, reservation state, and server-side rental timer.
