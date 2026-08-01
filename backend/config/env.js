// Centralized access to the JWT secret.
//
// Security: NEVER fall back to a hardcoded default. The previous code used
// `process.env.JWT_SECRET || "curoxa_secret_key"` in several places. Because
// that fallback string is public (committed in git history) and the real
// secret was also committed, anyone could forge a valid JWT. We now fail
// closed — if JWT_SECRET is missing or too weak, the process crashes on boot
// with a clear message instead of silently signing tokens with a guessable key.

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error(
      'FATAL: JWT_SECRET is missing or too short (need >= 16 chars). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  return secret.trim();
};

module.exports = { getJwtSecret };
