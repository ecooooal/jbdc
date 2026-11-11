# Export is a plaintext folder, and Restore replaces

Export writes the whole catalog as a plain zip of `archive.json` plus an `images/` folder, saved wherever the owner chooses; Restore wipes the current catalog and loads the archive, showing the counts it is about to destroy. Merge-on-restore and encrypted exports are deliberately absent: merge without sync means inventing conflict rules for every field (and an answer for deleted-vs-edited) for a problem that does not exist yet, and a passphrase-encrypted archive needs a KDF that `expo-crypto` does not provide, producing a file that only this app version can open — a worse preservation story than the one the catalog exists for.

## Consequences

- The export doubles as the "cloud backup" path: save it to iCloud Drive or Drive from the share sheet, no backend.
- If sync or sign-in arrives, Restore must be revisited; merge becomes a real requirement at that point.
- The JSON shape is a public contract. Renaming a field is a breaking change to every export already on disk.
