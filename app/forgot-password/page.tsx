import { Metadata } from 'next'
import TopNavOne from "../../components/Header/TopNav/TopNavOne";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import MenuOne from "../../components/Header/Menu/MenuOne";
import { getProductCategories } from "../../actions/data-actions";
import Footer from "../../components/Footer/Footer";
import PasswordResetRequest from "../../components/ForgotPassword/PasswordResetRequest";

export const metadata: Metadata = {
    title: 'Forgot Password - Reset Your Password',
    description: 'Enter your email to receive a password reset link.',
}

export default async function ForgotPasswordPage() {
    const [categories] = await Promise.all([
        getProductCategories()
    ])

    return (
        <>
            <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
            <div id="header" className='relative w-full'>
                <MenuOne props="bg-transparent" categories={categories} />
                <Breadcrumb heading='Forget your password' subHeading='Forget your password' />
            </div>
            <PasswordResetRequest />
            <Footer />
        </>
    );
}