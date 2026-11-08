import jwt from "jsonwebtoken";
import { env } from "@/config/env";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface TokenPayload {
  sub: number;
}

export function signAccessToken(userId: number): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string") throw new Error("Malformed token payload");
  const sub = Number(decoded.sub);
  if (!Number.isFinite(sub)) throw new Error("Malformed token payload");
  return { sub };
}

export function verifyAccessToken(token: string): TokenPayload {
  return verifyToken(token, env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token: string): TokenPayload {
  return verifyToken(token, env.JWT_REFRESH_SECRET);
}

