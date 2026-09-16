import type {Metadata} from 'next';
import './globals.css';
import {Header,Footer} from '@/components/header';
import {SITE_ORIGIN} from '@/lib/launch';
export const metadata:Metadata={metadataBase:new URL(SITE_ORIGIN),title:{default:'RiteVenue | Wedding venues & halls in Bengaluru',template:'%s | RiteVenue'},description:'Explore owner-approved wedding halls, hotels, resorts and party venues in Bengaluru, with photographs and owner-reported calendars.',robots:{index:true,follow:true},icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-IN"><body><Header/>{children}<Footer/></body></html>}
