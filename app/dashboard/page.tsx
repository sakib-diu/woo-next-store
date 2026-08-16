import React from 'react'
import { redirect } from 'next/navigation'
import { fetchProfileData } from '@/actions/customer-action'
import DashboardClient from '@/components/Dashboard/DashboardClient'
import { getSession } from '@/lib/session'
import TopNavOne from '../../components/Header/TopNav/TopNavOne'
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb'
import Footer from '../../components/Footer/Footer'
import MenuOne from '../../components/Header/Menu/MenuOne'
import { Metadata } from 'next'
import { getProductCategories } from '../../actions/data-actions'



export const metadata: Metadata = {
    title: 'Dashboard - My Account',
    description: 'Manage your account, view orders, and update your profile information.',
}

interface DashboardPageProps {
    searchParams: { tab?: string; userId?: string }
}

const Dashboard = async ({ searchParams }: DashboardPageProps) => {
    const { tab = 'dashboard' } = await searchParams

    const [categories, session] = await Promise.all([
        getProductCategories(),
        getSession(),
    ])

    if (!session.isLoggedIn || !session.userId) {
        redirect('/login')
    }

    const userId = session.userId

    try {
        // Fetch all required data server-side
        const profileData = await fetchProfileData(userId)

        return (
            <>
                <TopNavOne props="style-one bg-black" slogan="New customers save 10% with the code GET10" />
                <div id="header" className='relative w-full'>
                    <MenuOne props="bg-transparent" categories={categories} />
                    <Breadcrumb heading='My Account' subHeading='My Account' />
                </div>
                <DashboardClient
                    initialTab={tab}
                    profileData={profileData}
                    userId={userId}
                />
                <Footer />
            </>
        )
    } catch (error) {
        console.error('Error fetching profile data:', error)
        redirect('/login')
    }
}

export default Dashboard