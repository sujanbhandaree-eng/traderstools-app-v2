# Security Specification - SmartTrade Planner

## Data Invariants
1. A user document can only be created or modified by the user themselves.
2. The `email` field must be present and match the authenticated user's email.
3. The `uid` field must match the authenticated user's UID.
4. Timestamps must be server-generated.

## The "Dirty Dozen" Payloads (Red Team Tests)
1. **Identity Theft**: Create a user doc with ID `victim_id` using `attacker` auth.
2. **Email Spoofing**: Set `email` to `admin@example.com` while authenticated as `user@example.com`.
3. **Ghost Fields**: Add `isAdmin: true` to a user document.
4. **ID Poisoning**: Use a 2KB string as a document ID.
5. **PII Leak**: Read another user's document using `isSignedIn()`.
6. **Immutable field update**: Change `createdAt` after creation.
7. **Type confusion**: Set `email` to an array instead of a string.
8. **Size attack**: Set `displayName` to a 1MB string.
9. **Unverified access**: Write sensitive data without `email_verified == true`.
10. **Orphan creation**: Create a sub-resource for a non-existent user.
11. **State skip**: Transition status from 'active' to 'deleted' without permission.
12. **Blanket Query**: Request `getDocs(collection(users))` and expect all user emails.
