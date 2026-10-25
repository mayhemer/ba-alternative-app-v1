# Share Link Flow (V1)

```
1. User taps "Share my schedule"
2. POST /share → Lambda generates opaque random token, stores { token, userId, createdAt }
3. Returns shareable URL: https://app.brutalassault.cz/shared/{token}
4. Recipient opens URL → GET /share/{token} → read-only view of that user's personal schedule
```

Token has no userId exposed. No automatic expiry — user revokes via DELETE.
