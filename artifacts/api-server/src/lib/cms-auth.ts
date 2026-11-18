import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import type { CmsSession } from "@workspace/api-zod";

const SESSION_LIFETIME_SECONDS = 60 * 60;
const SESSION_SUBJECT = "blog-admin";

export class CmsAuthConfigurationError extends Error {
  constructor() {
    super("Admin login is not configured.");
    this.name = "CmsAuthConfigurationError";
  }
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new CmsAuthConfigurationError();
  }
  return secret;
}

function secureCompare(left: string, right: string, secret: string, purpose: string): boolean {
  const leftDigest = createHmac("sha256", secret).update(`${purpose}\0${left}`).digest();
  const rightDigest = createHmac("sha256", secret).update(`${purpose}\0${right}`).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const secret = getSessionSecret();
  const expectedUsername = process.env.CMS_ADMIN_USERNAME?.trim() || "admin";
  const expectedPassword = process.env.CMS_ADMIN_PASSWORD;

  if (!expectedPassword || expectedPassword.length < 12) {
    throw new CmsAuthConfigurationError();
  }

  const usernameMatches = secureCompare(username, expectedUsername, secret, "cms-username");
  const passwordMatches = secureCompare(password, expectedPassword, secret, "cms-password");
  return usernameMatches && passwordMatches;
}

export function createCmsSession(): CmsSession {
  const secret = getSessionSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAt + SESSION_LIFETIME_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({
      sub: SESSION_SUBJECT,
      iat: issuedAt,
      exp: expiresAtSeconds,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`cms-session.v1.${payload}`)
    .digest("base64url");

  return {
    token: `${payload}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000),
  };
}

export function isValidCmsSession(token: string): boolean {
  const secret = getSessionSecret();
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return false;
  }

  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`cms-session.v1.${payload}`)
    .digest();
  const supplied = Buffer.from(signature, "base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return false;
  }

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded || typeof decoded !== "object") {
      return false;
    }

    const session = decoded as { sub?: unknown; iat?: unknown; exp?: unknown };
    const now = Math.floor(Date.now() / 1000);
    return (
      session.sub === SESSION_SUBJECT &&
      typeof session.iat === "number" &&
      typeof session.exp === "number" &&
      session.iat <= now + 30 &&
      session.exp > now &&
      session.exp - session.iat <= SESSION_LIFETIME_SECONDS
    );
  } catch {
    return false;
  }
}

export const requireCmsAuth: RequestHandler = (req, res, next) => {
  const authorization = req.get("Authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization);
  if (!match) {
    res.status(401).json({ error: "Sign in to manage blog posts." });
    return;
  }

  try {
    if (!isValidCmsSession(match[1])) {
      res.status(401).json({ error: "Your admin session has expired. Sign in again." });
      return;
    }
  } catch {
    res.status(503).json({ error: "Admin login is not configured." });
    return;
  }

  next();
};
