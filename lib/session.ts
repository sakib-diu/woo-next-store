import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: number;
  email?: string;
  displayName?: string;
  wpAuthToken?: string;
  isLoggedIn: boolean;
}

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET is not defined or is too short. It must be at least 32 characters.",
  );
}

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "vertex_session",
  ttl: REMEMBER_ME_MAX_AGE,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REMEMBER_ME_MAX_AGE,
  },
};

const defaultSession: SessionData = { isLoggedIn: false };

export async function getSession() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  if (!session.isLoggedIn) {
    Object.assign(session, defaultSession);
  }
  return session;
}

/**
 * Switches the session cookie between persistent ("remember me", 7 days)
 * and session-only (deleted when the browser closes). Call before session.save().
 */
export function applyRememberMe(
  session: IronSession<SessionData>,
  remember: boolean,
) {
  session.updateConfig({
    ...sessionOptions,
    cookieOptions: {
      ...sessionOptions.cookieOptions,
      maxAge: remember ? REMEMBER_ME_MAX_AGE : undefined,
    },
  });
}
