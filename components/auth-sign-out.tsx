'use client';
import {useState} from 'react';
export default function AuthSignOut(){const [busy,setBusy]=useState(false);async function signOut(){setBusy(true);try{await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}finally{window.location.assign('/');}}return <button className="filter-button" type="button" disabled={busy} onClick={signOut}>{busy?'Signing out…':'Sign out'}</button>;}
