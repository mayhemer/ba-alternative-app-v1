# Fixtures

`tests/fixtures/generated/` is produced by `npm run gen:fixtures`, which runs the backend's real
captured API responses through the backend's own `normalize` functions. The shapes are therefore
correct by construction, and the volume is realistic (260 artists, 311 events for ba2025). The
output is committed, so a test run needs no backend and no build step — regenerate only when the
captures are refreshed or a normalizer changes.

`npm run serve:fixtures` serves them on the real endpoint paths, which is also how to run the app
against frozen data by hand (see the `EXPO_PUBLIC_API_ORIGIN` note in [credentials.md](../build/credentials.md)).
