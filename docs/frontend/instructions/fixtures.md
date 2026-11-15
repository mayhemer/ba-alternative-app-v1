# Fixtures

`tests/fixtures/generated/` is produced by `npm run gen:fixtures`, which runs the backend's real
captured API responses through the backend's own `normalize` functions. The shapes are therefore
correct by construction, and the volume is realistic (260 artists, 311 events for ba2025). The
output is committed, so a test run needs no backend and no build step — regenerate only when the
captures are refreshed or a normalizer changes.

`tests/fixtures/e2e/seeds.json` is written by hand: the picks the iOS E2E build can store at launch
(see [startup.md › E2E test seeds](../design/architecture/startup.md#e2e-test-seeds)). Its picks
name each artist by id and lineup name, and a Jest test checks both against `generated/`, so a
regenerated lineup that drops one fails there first.

`npm run serve:fixtures` serves them on the real endpoint paths, which is also how to run the app
against frozen data by hand (see the `EXPO_PUBLIC_API_ORIGIN` note in [credentials.md](../build/credentials.md)).
