'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { requestPasswordResetSchema } from '@/lib/validations/resetPasswordValidation';
import { z } from 'zod';
import Link from 'next/link';
import { PATH } from '../../constant/pathConstants';

type RequestForm = z.infer<typeof requestPasswordResetSchema>;

export default function PasswordResetRequest() {
    const { requestPasswordReset } = useAuth();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [isSent, setIsSent] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RequestForm>({ resolver: zodResolver(requestPasswordResetSchema) });

    if (isSent) {
        return (
            <div className="login-block md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="md:w-1/2 w-full max-w-md">
                            <div className="heading4 mb-4">Check your email</div>
                            <p className="text-secondary mb-7">
                                If an account exists for that email address, we&apos;ve sent a link to reset your password.
                            </p>
                            <div className="block-button">
                                <Link href={PATH.LOGIN} className="button-main">Back to Login</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-block md:py-20 py-10">
            <div className="container">
                <div className="content-main flex gap-y-8 max-md:flex-col">
                    <div className="left md:w-1/2 w-full lg:pr-[60px] md:pr-[40px] md:border-r border-line">
                        <div className="heading4 mb-7">Reset Your Password</div>
                        <form
                            onSubmit={handleSubmit((data) => {
                                setError(null);
                                startTransition(async () => {
                                    const result = await requestPasswordReset(data.email);
                                    if (result.success) {
                                        setIsSent(true);
                                    } else {
                                        const message = typeof result.error === 'string'
                                            ? result.error
                                            : 'Failed to send reset email.';
                                        setError(message);
                                    }
                                });
                            })}
                        >
                            <div className="email">
                                <input
                                    {...register('email')}
                                    id="email"
                                    type="email"
                                    placeholder="Email Address *"
                                    className={`border-line px-4 pt-3 pb-3 w-full rounded-lg ${errors.email ? "border-red" : ""}`}
                                />
                                {errors.email && <p className="text-red text-sm mt-1">{errors.email.message}</p>}
                                {error && <p className="text-red text-sm mt-1">{error}</p>}
                            </div>
                            <div className="block-button md:mt-7 mt-4">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className={`button-main w-full disabled:opacity-100 disabled:pointer-events-none ${isPending ?
                                        "bg-surface text-secondary2 border cursor-not-allowed disabled hover:normal-case"
                                        : "bg-black text-white hover:bg-green-300"
                                        }`}
                                >
                                    {isPending ? 'Sending...' : 'Send Reset Link'}
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
    );
}
