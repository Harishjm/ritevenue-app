"use client";
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="content-page narrow"><p className="eyebrow">RITEVENUE DEMONSTRATION</p><h1>This page could not load.</h1><p>Please retry. If you were confirming a demo booking, check My bookings before starting another checkout.</p><div className="workspace-actions"><button className="primary" onClick={reset}>Try again</button><Link href="/bookings" className="filter-button">My bookings</Link><Link href="/" className="filter-button">Explore venues</Link></div></main>;}
