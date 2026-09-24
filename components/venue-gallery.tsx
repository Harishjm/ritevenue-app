"use client";

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

export default function VenueGallery(){
 const pathname=usePathname();
 useEffect(()=>{
  const preview=document.querySelector<HTMLImageElement>('.detail-photo');
  const thumbnails=Array.from(document.querySelectorAll<HTMLImageElement>('.venue-gallery img'));
  if(!preview||thumbnails.length===0)return;
  const select=(thumbnail:HTMLImageElement)=>{
   preview.src=thumbnail.currentSrc||thumbnail.src;
   preview.alt=thumbnail.alt;
   thumbnails.forEach(image=>image.classList.toggle('selected',image===thumbnail));
  };
  const handlers=thumbnails.map(thumbnail=>{
   thumbnail.setAttribute('role','button');
   thumbnail.tabIndex=0;
   const onClick=()=>select(thumbnail);
   const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(thumbnail);}};
   thumbnail.addEventListener('click',onClick);
   thumbnail.addEventListener('keydown',onKeyDown);
   return {thumbnail,onClick,onKeyDown};
  });
  return ()=>handlers.forEach(({thumbnail,onClick,onKeyDown})=>{thumbnail.removeEventListener('click',onClick);thumbnail.removeEventListener('keydown',onKeyDown);});
 },[pathname]);
 return null;
}