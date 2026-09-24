import type {Metadata} from 'next';
import './globals.css';
import './wedding-enquiries.css';
import {Header,Footer} from '@/components/header';
import {SITE_ORIGIN,publicIndexingEnabled} from '@/lib/launch';
import VenueGallery from '@/components/venue-gallery';
export function generateMetadata():Metadata{return {metadataBase:new URL(SITE_ORIGIN),title:{default:'RiteVenue | Wedding venues & halls in Bengaluru',template:'%s | RiteVenue'},description:'Explore published wedding halls, hotels, resorts and party venues in Bengaluru, with photographs and reported calendars.',robots:{index:publicIndexingEnabled(),follow:publicIndexingEnabled()},icons:{icon:'/favicon.svg'}};}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-IN"><body><Header/>{children}<VenueGallery/><Footer/></body></html>}
