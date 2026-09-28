'use client';
import {useEffect,useState} from 'react';
export const OWNER_START_KEY='ritevenue-owner-start-v1';
export default function OwnerStart(){
 const [name,setName]=useState(''),[city,setCity]=useState('Bengaluru'),[locality,setLocality]=useState(''),[error,setError]=useState('');
 useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem(OWNER_START_KEY)||'null');if(saved){setName(saved.name||'');setCity(saved.city||'Bengaluru');setLocality(saved.locality||'');}}catch{}},[]);
 return <form className="owner-start stack-form" action="/api/auth/google-start" method="post" onSubmit={e=>{try{sessionStorage.setItem(OWNER_START_KEY,JSON.stringify({id:crypto.randomUUID(),name,city,locality}));}catch{e.preventDefault();setError('Your browser could not preserve these details. Sign in using the owner workspace link first.');}}}>
  <h2>Start with your venue</h2><p>Enter the basics, then continue with Google to save your draft and finish it whenever you’re ready.</p>
  <label>Venue name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
  <div className="form-grid"><label>City<input required maxLength={100} value={city} onChange={e=>setCity(e.target.value)}/></label><label>Locality<input required maxLength={100} value={locality} onChange={e=>setLocality(e.target.value)}/></label></div>
  <input type="hidden" name="audience" value="owner"/><input type="hidden" name="return_to" value="/owner?resume=1"/>
  <button className="primary">Save and continue with Google</button>{error&&<p className="error" role="alert">{error}</p>}
  <a href="/owner">Already submitted? Open your owner workspace</a>
 </form>;
}
