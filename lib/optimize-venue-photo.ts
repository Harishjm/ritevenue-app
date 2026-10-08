import {MAX_SOURCE_BYTES,MAX_PHOTO_BYTES,MAX_PHOTO_EDGE,inspectOptimizedPhoto,normalizeCanvasPhoto,type OptimizedPhotoType} from './venue-photo';

export async function optimizeVenuePhoto(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose JPEG, PNG or WebP photos. Export HEIC photos as JPEG first.');
 if(!file.size||file.size>MAX_SOURCE_BYTES)throw new Error('Choose photos smaller than 15 MB each.');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('This photo could not be opened. Try exporting it as JPEG.');}
 const canvas=document.createElement('canvas');
 try{
  if(bitmap.width*bitmap.height>40_000_000)throw new Error('Choose a photo under 40 megapixels.');
  let scale=Math.min(1,MAX_PHOTO_EDGE/Math.max(bitmap.width,bitmap.height));
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Image optimization is unavailable in this browser. Try a current browser.');
  let type:OptimizedPhotoType='image/webp';
  const encode=(format:OptimizedPhotoType,quality:number)=>new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,format,quality));
  for(let pass=0;pass<4;pass++){
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [0.82,0.72,0.62]){
    let blob=await encode(type,quality);
    // Unsupported canvas encoders can silently return PNG, even when the
    // browser can display WebP. JPEG is the mobile-compatible fallback.
    if(type==='image/webp'&&(!blob||blob.type!==type)){
     type='image/jpeg';blob=await encode(type,quality);
    }
    if(!blob||blob.type!==type)throw new Error('Could not prepare this photo. Try a smaller JPEG or PNG image.');
    if(blob.size<=MAX_PHOTO_BYTES){
     const normalized=normalizeCanvasPhoto(new Uint8Array(await blob.arrayBuffer()),type);
     const dimensions=inspectOptimizedPhoto(normalized,type);
     return {blob:new Blob([normalized],{type}),...dimensions,originalBytes:file.size};
    }
   }
   scale*=0.8;
  }
  throw new Error('This photo is too detailed to compress. Try a smaller version.');
 }finally{bitmap.close();canvas.width=0;canvas.height=0;}
}
