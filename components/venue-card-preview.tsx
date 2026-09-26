'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

export const PREVIEW_INTERVAL_MS=2400;
export function movePreview(previous:{active:number;seen:number[];wrap:boolean},direction:number,count:number){if(count<2)return previous;const active=(previous.active+direction+count)%count;return {active,seen:Array.from(new Set([...previous.seen,active])),wrap:Math.abs(active-previous.active)>1};}
export default function VenueCardPreview({href,name,images,descriptions,type,children}:{href:string;name:string;images:string[];descriptions:string[];type:string;children:ReactNode}){
 const [preview,setPreview]=useState({active:0,seen:[0],wrap:false}),[hovered,setHovered]=useState(false),[reducedMotion,setReducedMotion]=useState(true),[visible,setVisible]=useState(true);
 const {active,seen}=preview;
 const gesture=useRef<{x:number;y:number}|null>(null),suppressClick=useRef(false);
 const count=images.length;
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateMotion=()=>setReducedMotion(preference.matches),updateVisibility=()=>setVisible(!document.hidden);
  updateMotion();updateVisibility();preference.addEventListener('change',updateMotion);document.addEventListener('visibilitychange',updateVisibility);
  return ()=>{preference.removeEventListener('change',updateMotion);document.removeEventListener('visibilitychange',updateVisibility);};
 },[]);
 useEffect(()=>{
  if(!hovered||reducedMotion||!visible||count<2)return;
  const timer=window.setInterval(()=>setPreview(previous=>movePreview(previous,1,count)),PREVIEW_INTERVAL_MS);
  return ()=>window.clearInterval(timer);
 },[hovered,reducedMotion,visible,count]);
 function step(direction:number){setPreview(previous=>movePreview(previous,direction,count));}
 function reset(){setHovered(false);setPreview(previous=>({...previous,active:0,wrap:true}));}
 return <a className="venue-card" href={href}
  onPointerEnter={e=>{if(e.pointerType==='mouse')setHovered(true);}}
  onPointerLeave={e=>{if(e.pointerType==='mouse')reset();gesture.current=null;}}
  onBlur={reset}
  onKeyDown={e=>{if(count>1&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}}}
  onClickCapture={e=>{if(suppressClick.current){e.preventDefault();suppressClick.current=false;}}}>
  <div className="card-image venue-card-preview"
   onPointerDown={e=>{suppressClick.current=false;gesture.current=e.pointerType==='touch'?{x:e.clientX,y:e.clientY}:null;}}
   onPointerCancel={()=>{gesture.current=null;}}
   onPointerUp={e=>{const start=gesture.current;gesture.current=null;if(!start||count<2)return;const x=e.clientX-start.x,y=e.clientY-start.y;if(Math.abs(x)>40&&Math.abs(x)>Math.abs(y)*1.5){suppressClick.current=true;step(x<0?1:-1);}}}>
   <div className="venue-preview-track" style={{transform:`translateX(-${active*100}%)`,transition:preview.wrap?'none':undefined}}>
    {/* Fetch only visited photos and the next preview, not all 15 on page load. */}
    {images.map((src,index)=><div className="venue-preview-slide" key={src+'-'+index}>{(index===active||seen.includes(index)||(hovered&&!reducedMotion&&index===(active+1)%count))&&<img src={src} alt={descriptions[index]||`${name} — venue photograph ${index+1}`} width={640} height={420} loading="lazy" decoding="async"/>}</div>)}
   </div>
   <span className="image-label">{type}</span>
   {count>1&&<><span className="venue-preview-count" aria-hidden="true">{active+1} / {count}</span><span className="venue-preview-dots" aria-hidden="true">{images.map((_,i)=><i className={i===active?'active':''} key={i}/>)}</span><span className="sr-only">{count} photos. Hover to preview, swipe on touch screens, or use left and right arrow keys when this card is focused.</span></>}
  </div>
  {children}
 </a>;
}
