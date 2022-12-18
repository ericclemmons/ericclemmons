import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Image from 'next/image'
import Link from './Link'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import MobileNav from './MobileNav'
import ThemeSwitch from './ThemeSwitch'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const LayoutWrapper = ({ children }: Props) => {
  return (
    <SectionContainer>
      <div className="flex flex-col justify-between h-screen">
        <header
          className="fixed left-0 z-10 flex items-center justify-between w-full p-4 md:p-10 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 1.5vw), 0 100%)',
          }}
        >
          <div>
            <Link href="/" aria-label={`${siteMetadata.headerTitle} Blog`}>
              <div className="flex items-center justify-between relative top-[-0.25rem]">
                <div className="relative top-[0.4em] mr-3">
                  <Image
                    alt="Eric Clemmons avatar"
                    className="rounded-full"
                    src="/static/favicons/android-chrome-192x192.png"
                    width="24"
                    height="24"
                  />
                </div>

                {typeof siteMetadata.headerTitle === 'string' ? (
                  <div className="h-6 text-2xl font-semibold sm:block">
                    {siteMetadata.headerTitle}
                  </div>
                ) : (
                  siteMetadata.headerTitle
                )}
              </div>
            </Link>
          </div>
          <div className="flex items-center text-base leading-5">
            <div className="hidden sm:block">
              {headerNavLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="p-1 font-medium text-gray-900 sm:p-4 dark:text-gray-100"
                >
                  {link.title}
                </Link>
              ))}
            </div>
            <ThemeSwitch />
            <MobileNav />
          </div>
        </header>
        <main className="mb-auto mt-28">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
