// Environment contract. Fails loudly in production; forgiving in dev.
// Copy .env.example → .env.local and fill in for production behavior.

// Enforce at serve time only — `next build` collects page data under
// NODE_ENV=production and must succeed on any machine.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const isProd = process.env.NODE_ENV === "production" && !isBuildPhase;

function required(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length >= 16) return v;
  if (isProd && process.env.ALLOW_INSECURE_DEFAULTS !== "1") {
    throw new Error(
      `${name} is not set (or too short). Set it in the environment — see .env.example. ` +
        `To run a throwaway production build anyway, set ALLOW_INSECURE_DEFAULTS=1.`
    );
  }
  return devFallback;
}

// Session-signing secret. Generate one: `openssl rand -hex 32`
export const AUTH_SECRET = required("AUTH_SECRET", "lendrock-dev-secret-do-not-use-in-prod");

// Rate limit for the public lead API (requests per minute per IP).
export const PUBLIC_LEADS_RPM = Number(process.env.PUBLIC_LEADS_RPM ?? 5);
