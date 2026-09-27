import {slugify} from './slugify';

type VenueAddress = {id:string;name:string;locality:string;city:string};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Encode the complete UUID, not a truncated hash: identical names cannot collide.
// The stable suffix also lets old descriptive links survive a venue rename.
function venueKey(id:string){
  if(!uuidPattern.test(id))throw new Error('Invalid venue identifier');
  return BigInt('0x'+id.replace(/-/g,'')).toString(36).padStart(25,'0');
}

export function venuePublicSlug(venue:VenueAddress){
  const words=[venue.name,venue.locality,venue.city].map(slugify).filter(Boolean);
  const description=Array.from(new Set(words)).join('-').slice(0,120).replace(/-+$/,'')||'venue';
  return description+'-'+venueKey(venue.id);
}

export function venuePublicPath(venue:VenueAddress){
  return '/venues/'+venuePublicSlug(venue);
}

export function matchesVenueUrl(slug:string,id:string){
  if(slug==='owner-'+id)return true;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{25}$/i.test(slug)
    && slug.toLowerCase().endsWith('-'+venueKey(id));
}
