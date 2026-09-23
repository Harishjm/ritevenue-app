'use client';
import {useRef,useState} from 'react';
import {Images,Upload} from 'lucide-react';

export const MIN_LISTING_PHOTOS=2;
export const MAX_LISTING_PHOTOS=15;

export default function VenuePhotoPicker({count,busy,disabled,completed,total,onFiles}:{count:number;busy:boolean;disabled:boolean;completed:number;total:number;onFiles:(files:File[])=>void}){
 const input=useRef<HTMLInputElement>(null);
 const [dragging,setDragging]=useState(false);
 const locked=busy||disabled||count>=MAX_LISTING_PHOTOS;
 const add=(files:FileList|null)=>{if(files?.length&&!locked)onFiles(Array.from(files));};
 return <div className={'venue-photo-picker'+(dragging?' is-dragging':'')+(disabled?' is-disabled':'')}
  onDragOver={event=>{event.preventDefault();if(!locked)setDragging(true);}}
  onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);}}
  onDrop={event=>{event.preventDefault();setDragging(false);add(event.dataTransfer.files);}}>
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="venue-photo-input" aria-label="Choose venue photos" disabled={locked} onChange={event=>{add(event.target.files);event.target.value='';}}/>
  <Images size={28} aria-hidden="true"/>
  <div className="venue-photo-picker-copy"><strong>Add venue photos</strong><span>Drag photos here, or choose them from your device.</span><small>{count} of {MAX_LISTING_PHOTOS} added · {count<MIN_LISTING_PHOTOS?`${MIN_LISTING_PHOTOS-count} more needed to submit`:'Photo requirement met'} · JPEG, PNG or WebP · 15 MB originals</small></div>
  <button type="button" className="filter-button" disabled={locked} onClick={()=>input.current?.click()}><Upload size={17} aria-hidden="true"/>Choose photos</button>
  {total>0&&<div className="venue-photo-progress" role="status" aria-live="polite"><progress value={completed} max={total}/><span>{completed<total?`Optimizing and uploading ${completed+1} of ${total}`:`${total} photo${total===1?'':'s'} uploaded`}</span></div>}
  {disabled&&<p className="muted">Confirm your rights to the venue details and photos above to enable uploads.</p>}
 </div>;
}
