import {slugify} from './slugify';

export function venueImageFilename(name:string,locality:string,city:string,position:number,extension:'webp'|'jpg'|'png'='webp'){
 return `${slugify(name)}-${slugify(locality)}-${slugify(city)}-wedding-venue-${position}.${extension}`;
}

export function venueImageAlt(name:string,locality:string,city:string,position:number){
 return `${name.trim()} wedding venue in ${locality.trim()}, ${city.trim()} — banquet hall photo ${position}`;
}
