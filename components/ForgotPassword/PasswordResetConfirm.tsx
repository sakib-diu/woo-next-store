'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordWithKey } from '@/actions/auth-actions';
import { confirmPasswordResetSchema } from '@/lib/validations/resetPasswordValidation';
import { z } from 'zod';
import Link from 'next/link';
import { PATH } from '../../constant/pathConstants';

type ConfirmForm = z.infer<typeof confirmPasswordResetSchema>;

export default function PasswordResetConfirm({ resetKey, login }: { resetKey: string; login: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ConfirmForm>({ resolver: zodResolver(confirmPasswordResetSchema) });

    if (isComplete) {
        return (
            <div className="login-block md:py-20 py-10">
                <div className="container">
                    <div className="content-main flex gap-y-8 max-md:flex-col">
                        <div className="md:w-1/2 w-full max-w-md text-center">
                            <div className="heading4 mb-4">Password Reset Successful!</div>
                            <p className="text-secondary mb-7">Your password has been successfully reset. You can now login with your new password.</p>
                            <div className="block-button">
                                <Link href={PATH.LOGIN} className="button-main">Go to Login</Link>
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
                        <div className="heading4 mb-7">Set New Password</div>
                        <form
                            onSubmit={handleSubmit((data) => {
                                setError(null);
                                startTransition(async () => {
                                    const formData = new FormData();
                                    formData.append('password', data.password);
                                    const result = await resetPasswordWithKey(resetKey, login, null, formData);
                                    if (result.success) {
                                        setIsComplete(true);
                                    } else {
                                        const message = typeof result.error === 'string'
                                            ? result.error
                                            : 'Password reset failed. The link may have expired.';
                                        setError(message);
                                    }
                                });
                            })}
                        >
                            <div className="pass relative">
                                <input
                                    {...register('password')}
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="New Password *"
                                    className={`border-line px-4 pt-3 pb-3 w-full rounded-lg pr-12 ${errors.password ? "border-red" : ""}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-black transition-colors"
                                >
                                    {showPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                                {errors.password && <p className="text-red text-sm mt-1">{errors.password.message}</p>}
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
                                    {isPending ? 'Please wait...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
