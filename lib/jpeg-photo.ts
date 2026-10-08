// A bounded structural check for the baseline/progressive JPEGs canvas emits.
// This is not an image decoder. Strip all APP/COM segments (including EXIF/GPS)
// in the browser; reject them on upload, together with trailing/unknown data.
export function inspectCanvasJpeg(bytes:Uint8Array,stripMetadata=false){
 const invalid=()=>new Error('This photo is not a supported, metadata-free JPEG image.');
 if(bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8)throw invalid();
 const parts:Uint8Array[]=[bytes.subarray(0,2)];
 let offset=2,width=0,height=0,scans=0,quantization=false,huffman=false;
 while(offset<bytes.length){
  const start=offset;
  if(bytes[offset++]!==0xff)throw invalid();
  while(bytes[offset]===0xff)offset++;
  const marker=bytes[offset++];
  if(marker===0xd9){
   if(offset!==bytes.length||!width||!height||!scans||!quantization||!huffman)throw invalid();
   parts.push(bytes.subarray(start,offset));
   const normalized=new Uint8Array(parts.reduce((size,part)=>size+part.length,0));
   let at=0;for(const part of parts){normalized.set(part,at);at+=part.length;}
   return {width,height,bytes:normalized};
  }
  if(offset+2>bytes.length)throw invalid();
  const length=(bytes[offset]<<8)|bytes[offset+1],end=offset+length;
  if(length<2||end>bytes.length)throw invalid();
  const metadata=(marker>=0xe0&&marker<=0xef)||marker===0xfe;
  if(metadata){if(!stripMetadata)throw invalid();}
  else if(marker===0xc0||marker===0xc2){
   const components=bytes[offset+7];
   if(width||length<11||bytes[offset+2]!==8||![1,3].includes(components)||length!==8+3*components)throw invalid();
   height=(bytes[offset+3]<<8)|bytes[offset+4];width=(bytes[offset+5]<<8)|bytes[offset+6];
   if(!width||!height)throw invalid();
  }else if(marker===0xdb){if(length<67)throw invalid();quantization=true;}
  else if(marker===0xc4){if(length<19)throw invalid();huffman=true;}
  else if(marker===0xdd){if(length!==4)throw invalid();}
  else if(marker===0xda){
   const components=bytes[offset+2];
   if(!width||!quantization||!huffman||![1,2,3].includes(components)||length!==6+2*components)throw invalid();
   scans++;
  }else throw invalid();
  if(!metadata)parts.push(bytes.subarray(start,end));
  offset=end;
  if(marker===0xda){
   const scanStart=offset;
   // Entropy-coded bytes use FF00 escaping and optional restart markers.
   while(offset<bytes.length){
    if(bytes[offset]!==0xff){offset++;continue;}
    if(bytes[offset+1]===0||bytes[offset+1]>=0xd0&&bytes[offset+1]<=0xd7){offset+=2;continue;}
    break;
   }
   if(offset===scanStart)throw invalid();
   parts.push(bytes.subarray(scanStart,offset));
  }
 }
 throw invalid();
}
