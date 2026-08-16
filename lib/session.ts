import { getIronSession, SessionOptions } from "iron-session";
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
        "SESSION_SECRET is not defined or is too short. It must be at least 32 characters."
    );
}

export const sessionOptions: SessionOptions = {
    password: sessionSecret,
    cookieName: "vertex_session",
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};

const defaultSession: SessionData = { isLoggedIn: false };

export async function getSession() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.isLoggedIn) {
        Object.assign(session, defaultSession);
    }
    return session;
}
