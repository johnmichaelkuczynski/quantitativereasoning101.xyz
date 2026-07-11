const CREDENTIAL_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const;

for (const key of CREDENTIAL_KEYS) {
  const value = process.env[key];
  if (value !== undefined) {
    const trimmed = value.replace(/\s+/g, "");
    if (trimmed !== value) {
      process.env[key] = trimmed;
      console.warn(
        `Env hygiene: removed stray whitespace from ${key} (length ${value.length} -> ${trimmed.length})`,
      );
    }
  }
}

export {};
