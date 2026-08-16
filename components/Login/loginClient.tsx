'use client'

import { useAuth } from '@/context/AuthContext'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Icon from "@phosphor-icons/react/dist/ssr"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'


const loginSchema = z.object({
    username: z.string().min(1, "Username or email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    remember: z.boolean().optional(),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const Login = () => {
    const [error, setError] = useState<string | null>(null);
    const { login, loading, isAuthenticated } = useAuth()
    const [isLoading, setIsLoading] = useState<boolean>(loading);
    const router = useRouter()


    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormInputs>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormInputs) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await login(data.username, data.password, data.remember);
            if (response.success) {
                router.push('/dashboard');
            } else {
                // Handle login failure
                setError(response.message || "Login failed. Please try again.");
            }
        } catch (err) {
            setError("Invalid username or password. Please try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
        return null; // Prevent rendering the login form while redirecting
    }

    return (
        <>
            <div className="login-block md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
                            <div className="heading4">Login</div>
                            <form onSubmit={handleSubmit(onSubmit)} className="md:mt-7 mt-4">
                                <div className="email">
                                    <input
                                        className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${errors.username ? "border-red" : ""
                                            }`}
                                        id="username"
                                        type="text"
                                        placeholder="Username or email address *"
                                        {...register("username")}
                                    />
                                    {errors.username && (
                                        <p className="text-red text-sm mt-1">{errors.username.message}</p>
                                    )}
                                </div>

                                <div className="pass mt-5">
                                    <input
                                        className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${errors.password ? "border-red" : ""
                                            }`}
                                        id="password"
                                        type="password"
                                        placeholder="Password *"
                                        {...register("password")}
                                    />
                                    {errors.password && (
                                        <p className="text-red text-sm mt-1">{errors.password.message}</p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-5">
                                    <div className="flex items-center">
                                        <div className="block-input relative w-5 h-5">
                                            <input
                                                type="checkbox"
                                                id="remember"
                                                className="absolute w-full h-full opacity-0 cursor-pointer"
                                                {...register("remember")}
                                            />
                                            {/* This is a common pattern for custom checkboxes */}
                                            <Icon.CheckSquareIcon
                                                size={20}
                                                weight="fill"
                                                className="icon-checkbox text-gray-300 peer-checked:text-green"
                                            />
                                        </div>
                                        <label htmlFor="remember" className="pl-2 cursor-pointer select-none">
                                            Remember me
                                        </label>
                                    </div>
                                    <Link href={"/forgot-password"} className="font-semibold hover:underline">
                                        Forgot Your Password?
                                    </Link>
                                </div>

                                {/* Display general form errors here */}
                                {error && <p className="text-red text-center mt-4">{error}</p>}

                                <div className="block-button md:mt-7 mt-4">
                                    <button
                                        type="submit"
                                        className={`button-main w-full disabled:opacity-100 disabled:pointer-events-none ${isLoading ?
                                            "bg-surface text-secondary2 border cursor-not-allowed disabled hover:normal-case"
                                            : "bg-black text-white hover:bg-green-300"
                                            }`}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Logging in..." : "Login"}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div className="right md:w-1/2 w-full lg:pl-[60px] md:pl-[40px] flex items-center">
                            <div className="text-content">
                                <div className="heading4">New Customer</div>
                                <div className="mt-2 text-secondary">Be part of our growing family of new customers! Join us today and unlock a world of exclusive benefits, offers, and personalized experiences.</div>
                                <div className="block-button md:mt-7 mt-4">
                                    <Link href={'/register'} className="button-main">Register</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}




export default Login

