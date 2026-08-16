import { Metadata } from 'next'
import TopNavOne from "../../components/Header/TopNav/TopNavOne";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import MenuOne from "../../components/Header/Menu/MenuOne";
import { getProductCategories } from "../../actions/data-actions";
import Footer from "../../components/Footer/Footer";
import PasswordResetConfirm from "../../components/ForgotPassword/PasswordResetConfirm";
import Link from 'next/link';
import { PATH } from '../../constant/pathConstants';

export const metadata: Metadata = {
    title: 'Reset Your Password',
    description: 'Set a new password for your account.',
}

interface ResetPasswordPageProps {
    searchParams: Promise<{ key?: string; login?: string }>
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
    const [categories, params] = await Promise.all([
        getProductCategories(),
        searchParams,
    ])

    const { key, login } = params

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" categories={categories} />
                <Breadcrumb heading='Reset Password' subHeading='Reset Password' />
            </div>
            {key && login ? (
                <PasswordResetConfirm resetKey={key} login={login} />
            ) : (
                <div className="login-block md:py-20 py-10">
                    <div className="container text-center">
                        <div className="heading4 mb-4">Invalid Reset Link</div>
                        <p className="text-secondary mb-7">This password reset link is invalid or has expired.</p>
                        <Link href={PATH.ForgotPassword} className="button-main">Request a New Link</Link>
                    </div>
                </div>
            )}
            <Footer />
        </>
    );
}
