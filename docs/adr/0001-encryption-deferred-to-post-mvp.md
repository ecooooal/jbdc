# Encryption at rest deferred to post-MVP

v1 stores the catalog as plaintext: the SQLite file and image files are protected by the OS only (iOS data protection, Android file-based encryption), with no app-level encryption. `expo-sqlite` supports SQLCipher (`useSQLCipher` + `PRAGMA key`) and `expo-crypto` supports AES-GCM, but the cost is a mandatory prebuild/dev build (never Expo Go), **silent failure if the SQLCipher binary is missing** (`PRAGMA key` is ignored, not rejected), an undocumented interaction with Drizzle's open path, slower image rendering (every image must be decrypted to cache before `expo-image` can show it, since it cannot decode ciphertext), and a web gap. Deferred rather than dropped because sign-in may arrive later, and the encryption story should be designed once, with that decision in hand.

## Consequences

- No screen, empty state, or copy may imply the data is encrypted. The protection is the OS and the device passcode.
- The export is the only backup path, which makes it non-negotiable rather than a nice-to-have.
- Verify with `PRAGMA cipher_version` and refuse to start if it is absent — never trust `PRAGMA key` to fail loudly.

## Considered options

- **DB only (SQLCipher, images plaintext)**: rejected — pays the whole build cost while leaving the more private half (unreleased sketches) readable.
- **OS-level only, permanently**: plausible, but sign-in is on the table; this ADR makes the deferral explicit so nobody assumes encryption exists.
