# PhoneBridge

Working Stage 3 source for the deployed PhoneBridge marketplace prototype.

Live app: https://phonebridge-zfvppo.v2.appdeploy.ai/

Current functionality:
- managed sign-in (Google or email link);
- renter / phone-owner roles;
- persistent server-side profiles;
- host phone records stored in the managed database;
- $1/hour and $10/24h pricing presentation;
- $0.50/hour host-share presentation;
- referral code per profile;
- Russian, English, Latvian, Estonian, Lithuanian and Ukrainian UI;
- desktop and mobile responsive design.

Stage 4 will add the Android device agent, device registration token and online/offline heartbeat.

The deployed runtime uses the AppDeploy-managed `@appdeploy/client` and `@appdeploy/sdk` packages. They are injected by the deployment platform rather than committed as ordinary npm dependencies.
