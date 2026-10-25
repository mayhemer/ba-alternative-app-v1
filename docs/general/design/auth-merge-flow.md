# Auth & Anonymous → Login Merge Flow

```
1. First open → generate anonymous UUID, store locally
2. All interests saved locally with { slug, artistId, status, updatedAt }
   (AsyncStorage `user:interests:v2:<slug>`; status values are the server's. Older builds wrote
   v1 keys with 'must_see' — store/storageMigration converts them once at startup and deletes them;
   when a v2 key already exists the v1 key is dropped unread, so a downgrade starts empty and a
   re-upgrade keeps the newer data. `lens:scope` → `lens:scope:v2` the same way.)
3. User taps "Login" → Cognito OAuth flow
4. On successful login:
   a. Fetch cloud interests for this userId (all slugs)
   b. Merge with local interests: for each slug#artistId, keep the entry with the higher updatedAt
   c. Write merged set to DynamoDB under Cognito userId
   d. Clear local anonymous data
5. Future sessions: sync from DynamoDB, update on change
```
