"use server"

import { graphqlRequest } from "@/lib/graphql-client";
import { applyRememberMe, getSession } from "@/lib/session";
import { verifyWpJwt } from "@/lib/jwt";
import { requestPasswordResetSchema, confirmPasswordResetSchema } from "../lib/validations/resetPasswordValidation";
import dns from 'dns/promises';

const wordpressSiteUrl = process.env.WORDPRESS_SITE_URL;

if (!wordpressSiteUrl) {
    throw new Error("WORDPRESS_SITE_URL is not defined in environment variables");
}

async function isEmailDomainReal(email: string): Promise<boolean> {
    try {
        const domain = email.split('@')[1];
        const addresses = await dns.resolveMx(domain);
        return addresses && addresses.length > 0;
    } catch (error) {
        return false; // Domain does not exist or has no MX records
    }
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user_id?: number;
    user_email?: string;
    user_display_name?: string;
}

export interface User {
    user_id: number;
    user_email: string;
    user_display_name: string;
}

export interface PasswordResetResponse {
    success?: string;
    error?: string | { [key: string]: string[] | undefined };
    resetComplete?: boolean;
}

interface RegisterPayload {
    registerUser: {
        user: {
            databaseId: number;
        };
    };
}

const REGISTER_MUTATION = /* GraphQL */ `
  mutation RegisterUser($username: String!, $email: String!, $password: String!) {
    registerUser(input: { username: $username, email: $email, password: $password }) {
      user {
        databaseId
      }
    }
  }
`;

const SEND_PASSWORD_RESET_EMAIL_MUTATION = /* GraphQL */ `
  mutation SendPasswordResetEmail($username: String!) {
    sendPasswordResetEmail(input: { username: $username }) {
      success
    }
  }
`;

const RESET_USER_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ResetUserPassword($key: String!, $login: String!, $password: String!) {
    resetUserPassword(input: { key: $key, login: $login, password: $password }) {
      user {
        databaseId
      }
    }
  }
`;

export const userLogin = async (username: string, password: string, remember: boolean = false): Promise<AuthResponse> => {
    let response: Response;
    try {
        response = await fetch(`${wordpressSiteUrl}/wp-json/simple-jwt-login/v1/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: username, password }),
            cache: "no-store",
        });
    } catch (error) {
        return { success: false, message: "Could not connect to the server. Please try again." };
    }

    const body = await response.json();
    if (!response.ok || !body?.success || !body?.data?.jwt) {
        return { success: false, message: body?.data?.errorMessage || "Invalid username or password." };
    }

    const payload = verifyWpJwt(body.data.jwt);
    if (!payload) {
        return { success: false, message: "Received an invalid token from the server." };
    }

    const session = await getSession();
    session.isLoggedIn = true;
    session.userId = Number(payload.id);
    session.email = payload.email;
    session.displayName = payload.username;
    session.wpAuthToken = body.data.jwt;
    applyRememberMe(session, remember);
    await session.save();

    return {
        success: true,
        message: "Login successful",
        user_id: Number(payload.id),
        user_email: payload.email,
        user_display_name: payload.username,
    };
};

export const userSignup = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    if (!(await isEmailDomainReal(email))) {
        return { success: false, message: "Email domain appears to be invalid." };
    }

    const { data, errors } = await graphqlRequest<RegisterPayload>(REGISTER_MUTATION, { username, email, password });

    if (errors || !data?.registerUser) {
        return { success: false, message: errors?.[0]?.message || "Signup failed." };
    }

    return { success: true, message: "Signup successful", user_id: data.registerUser.user.databaseId };
};

export const userLogout = async (): Promise<AuthResponse> => {
    const session = await getSession();
    session.destroy();
    return { success: true, message: "Logout successful" };
};

export async function requestPasswordResetEmail(prevState: unknown, formData: FormData): Promise<PasswordResetResponse> {
    const validatedFields = requestPasswordResetSchema.safeParse({ email: formData.get('email') });
    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors };
    }

    const { errors } = await graphqlRequest(SEND_PASSWORD_RESET_EMAIL_MUTATION, {
        username: validatedFields.data.email,
    });

    if (errors) {
        return { error: errors[0]?.message || "Failed to send reset email." };
    }
    return { success: "If an account exists for that email, a reset link has been sent." };
}

export async function resetPasswordWithKey(
    key: string,
    login: string,
    prevState: unknown,
    formData: FormData
): Promise<PasswordResetResponse> {
    const validatedFields = confirmPasswordResetSchema.safeParse({ password: formData.get('password') });
    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors };
    }

    const { errors } = await graphqlRequest(RESET_USER_PASSWORD_MUTATION, {
        key,
        login,
        password: validatedFields.data.password,
    });

    if (errors) {
        return { error: errors[0]?.message || "Password reset failed. The link may have expired." };
    }
    return { success: "Your password has been reset.", resetComplete: true };
}
