import ModalCart from '@/components/Modal/ModalCart'
import ModalCompare from '@/components/Modal/ModalCompare'
import ModalQuickview from '@/components/Modal/ModalQuickview'
import ModalSearch from '@/components/Modal/ModalSearch'
import ModalWishlist from '@/components/Modal/ModalWishlist'
import { countdownTime } from '@/store/countdownTime'
import '@/styles/styles.scss'
import CountdownTimeType from '@/types/CountdownType'
import type { Metadata } from 'next'
import { Instrument_Sans } from 'next/font/google'
import GlobalProvider from './GlobalProvider'

const serverTimeLeft: CountdownTimeType = countdownTime();

const instrument = Instrument_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Anvogue',
  description: 'Multipurpose eCommerce Template',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <GlobalProvider>
      <html lang="en">
        <body className={instrument.className}>
          {children}
          <ModalCart />
          <ModalWishlist />
          <ModalSearch />
          <ModalQuickview />
          <ModalCompare />
        </body>
      </html>
    </GlobalProvider>
  )
}
