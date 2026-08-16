"use client";
import {
    AuthResponse,
    User,
    userLogin,
    userLogout,
    userSignup,
    requestPasswordResetEmail,
    PasswordResetResponse
} from "@/actions/auth-actions";
import React, { ReactNode, createContext, useContext, useState } from "react";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (username: string, password: string, remember?: boolean) => Promise<AuthResponse>;
    signup: (username: string, email: string, password: string) => Promise<AuthResponse>;
    logout: () => Promise<AuthResponse>;
    requestPasswordReset: (email: string) => Promise<PasswordResetResponse>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
    children,
    initialUser = null,
}: {
    children: ReactNode;
    initialUser?: User | null;
}) => {
    const [user, setUser] = useState<User | null>(initialUser);
    const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
    const [loading] = useState(false);

    const login = async (username: string, password: string, remember: boolean = false): Promise<AuthResponse> => {
        const data = await userLogin(username, password, remember);
        if (data.success && data.user_id) {
            const userData: User = {
                user_id: data.user_id,
                user_email: data.user_email || "",
                user_display_name: data.user_display_name || "",
            };
            setUser(userData);
            setIsAuthenticated(true);
        }
        return data;
    };

    const signup = async (username: string, email: string, password: string): Promise<AuthResponse> => {
        const data = await userSignup(username, email, password);
        return data;
    };

    const logout = async (): Promise<AuthResponse> => {
        const data = await userLogout();
        if (data.success) {
            setUser(null);
            setIsAuthenticated(false);
        }
        return data;
    };

    const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
        const formData = new FormData();
        formData.append('email', email);
        return requestPasswordResetEmail(null, formData);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            loading,
            login,
            signup,
            logout,
            requestPasswordReset,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
