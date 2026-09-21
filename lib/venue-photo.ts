// Shared limits: browser optimization and server enforcement must agree.
export const MAX_VENUE_PHOTOS=6;
export const MAX_PHOTO_BYTES=350*1024;
export const MAX_PHOTO_EDGE=1600;
export const MAX_SOURCE_BYTES=15*1024*1024;
export const MAX_PHOTO_REQUEST_BYTES=MAX_VENUE_PHOTOS*MAX_PHOTO_BYTES+64*1024;

// Some browsers include a colour profile/extended header in canvas WebP output.
// Repackage the one opaque still-image payload, without ancillary metadata.
export function normalizeCanvasPhoto(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(start:number,end:number)=>new TextDecoder().decode(bytes.subarray(start,end));
 if(bytes.length<20||text(0,4)!=='RIFF'||text(8,12)!=='WEBP'||view.getUint32(4,true)!==bytes.length-8)throw new Error('This browser produced an unsupported WebP image.');
 let payload:Uint8Array|undefined;
 for(let offset=12;offset<bytes.length;){
  if(offset+8>bytes.length)throw new Error('Incomplete WebP image.');
  const kind=text(offset,offset+4),size=view.getUint32(offset+4,true),end=offset+8+size+(size%2);
  if(end>bytes.length)throw new Error('Incomplete WebP image.');
  if(kind==='VP8 '){if(payload)throw new Error('Multiple image frames are not supported.');payload=bytes.slice(offset,end);}
  else if(!['VP8X','ICCP','EXIF','XMP '].includes(kind))throw new Error('Only opaque still photos are supported.');
  offset=end;
 }
 if(!payload)throw new Error('This browser produced an unsupported WebP image.');
 const result=new Uint8Array(12+payload.length);
 result.set(new TextEncoder().encode('RIFF'),0);result.set(new TextEncoder().encode('WEBP'),8);result.set(payload,12);
 new DataView(result.buffer).setUint32(4,result.length-8,true);
 inspectOptimizedPhoto(result);
 return result;
}

// Accept only the static, metadata-free lossy WebP format emitted by our canvas.
// Never trust a filename or Content-Type to authorize public image bytes.
export function inspectOptimizedPhoto(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(start:number,end:number)=>new TextDecoder().decode(bytes.subarray(start,end));
 if(bytes.length<30||bytes.length>MAX_PHOTO_BYTES||text(0,4)!=='RIFF'||text(8,12)!=='WEBP'||view.getUint32(4,true)!==bytes.length-8||text(12,16)!=='VP8 ')throw new Error('Choose a photo optimized by this form (static WebP, at most 350 KB).');
 const size=view.getUint32(16,true);
 if(size<10||20+size+(size%2)!==bytes.length||bytes[20]&1||bytes[23]!==0x9d||bytes[24]!==1||bytes[25]!==0x2a)throw new Error('The photo is not a valid static WebP image.');
 const width=view.getUint16(26,true)&0x3fff,height=view.getUint16(28,true)&0x3fff;
 if(!width||!height||width>MAX_PHOTO_EDGE||height>MAX_PHOTO_EDGE)throw new Error('Photos must be resized to 1600 pixels or less.');
 return {width,height};
}
