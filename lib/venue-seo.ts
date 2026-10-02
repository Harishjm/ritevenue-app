import {capacityLabel,type CapacityDetails} from './venue-capacity';

type VenueSeoFields={name:string;area:string;city:string;type:string;capacity:number;capacityDetails?:CapacityDetails|null};

function searchCity(city:string){return city.trim().toLowerCase()==='bengaluru'?'Bangalore':city;}

export function venueSeoTitle(venue:VenueSeoFields){
 return `${venue.name} Wedding Venue in ${venue.area}, ${searchCity(venue.city)}`;
}

export function venueSeoDescription(venue:VenueSeoFields){
 const type=venue.type.trim().toLowerCase();
 const article=/^[aeiou]/.test(type)?'an':'a';
 const city=venue.city.trim().toLowerCase()==='bengaluru'?'Bengaluru (Bangalore)':venue.city;
 return `${venue.name} in ${venue.area}, ${city} is ${article} ${type} with ${capacityLabel(venue.capacity,venue.capacityDetails).toLowerCase()}. View photos, rental details and reported availability.`;
}

export function relatedVenues<T extends {slug:string;area:string;city:string}>(venues:readonly T[],current:T,limit=3){
 const currentCity=current.city.trim().toLowerCase(),currentArea=current.area.trim().toLowerCase();
 return venues.filter(venue=>venue.slug!==current.slug&&venue.city.trim().toLowerCase()===currentCity)
  .sort((a,b)=>Number(b.area.trim().toLowerCase()===currentArea)-Number(a.area.trim().toLowerCase()===currentArea))
  .slice(0,limit);
}
