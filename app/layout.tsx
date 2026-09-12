import type { Metadata } from 'next';
import './globals.css';
import {Header,Footer} from '@/components/header';
export const metadata:Metadata={title:{default:'RiteVenue | Bengaluru venue booking demonstration',template:'%s | RiteVenue'},description:'Explore a private demonstration of self-serve venue booking, shared availability and locked itemized pricing. Fictional venues in Bengaluru; no real payments.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-IN"><body><Header/>{children}<Footer/></body></html>}
