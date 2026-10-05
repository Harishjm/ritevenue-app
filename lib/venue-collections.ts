import type {PublicVenue} from './public-venues';

export const BANGALORE_VENUES_PATH='/wedding-venues/bangalore';

export function isBangaloreVenue(venue:Pick<PublicVenue,'city'>){
 const city=venue.city.trim().toLowerCase();
 return city==='bengaluru'||city==='bangalore';
}

export function bangaloreVenues(venues:readonly PublicVenue[]){
 return venues.filter(isBangaloreVenue);
}

// A collection should offer a meaningful choice before it is submitted for indexing.
export function hasUsefulBangaloreCollection(venues:readonly PublicVenue[]){
 return bangaloreVenues(venues).length>=3;
}
