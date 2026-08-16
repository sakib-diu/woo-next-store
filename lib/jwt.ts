import { createHmac, timingSafeEqual } from "crypto";

interface JwtPayload {
    id: string;
    email: string;
    username: string;
    iat: number;
    exp: number;
}

function base64UrlDecode(input: string): Buffer {
    return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Verifies an HS256 JWT issued by the Simple JWT Login WordPress plugin
 * against WP_JWT_AUTH_SECRET, and returns its payload if valid.
 */
export function verifyWpJwt(token: string): JwtPayload | null {
    const secret = process.env.WP_JWT_AUTH_SECRET;
    if (!secret) {
        throw new Error("WP_JWT_AUTH_SECRET is not defined in environment variables");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }
    const [headerB64, payloadB64, signatureB64] = parts;

    const expectedSignature = createHmac("sha256", secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();
    const actualSignature = base64UrlDecode(signatureB64);

    if (
        expectedSignature.length !== actualSignature.length ||
        !timingSafeEqual(expectedSignature, actualSignature)
    ) {
        return null;
    }

    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));

    if (payload.exp * 1000 < Date.now()) {
        return null;
    }

    return payload;
}
