# Distributing to invited testers (no App Store)

iOS uses **ad-hoc** distribution: each tester's device UDID must be registered *before* the build, and
adding a device requires a new build (the device list is baked into the provisioning profile).

Because this project uses **local credentials** (see [credentials.md](credentials.md)), device registration is manual portal work —
`eas device:create` does **not** apply here, since EAS never talks to Apple:

1. Get the UDID (`xcrun devicectl list devices`, or Finder → device → click the line under the name).
2. Add it at <https://developer.apple.com/account/resources/devices/list>.
3. Regenerate the ad-hoc provisioning profile so it includes the new device, re-download it, and rebuild.

Testers themselves need **nothing** — no Apple Developer account, no Expo account, no team membership.
Only their device UDID has to be in the profile.

A successful `preview` build gives a hosted build page with a QR code and install link — EAS serves the
`itms-services://` manifest for iOS and the `.apk` directly for Android, so nothing needs to be
published to `ba.janbambas.cz`. Tell iOS testers to open the link **in Safari**; it fails silently in
some in-app browsers. Build artifacts and their links **expire** (30 days on the free plan).

Limits: 100 ad-hoc devices per device type per membership year; provisioning profiles expire after 12
months, so an annual rebuild is unavoidable.
