import type {PublicVenue} from './public-venues';
import {packageTimeLabel,rentalKeys,rentalLabels} from './standard-rentals';

type ListingPriceFields=Pick<PublicVenue,'authorizationSource'|'rentalDetails'|'pricing'|'packageAvailability'|'packageTimings'>;

// Use the first published, priced package in the order people compare them.
// An unquoted Full Day must not hide a priced 24-hour or shorter slot.
export function listingCardPrice(venue:ListingPriceFields){
 if(venue.authorizationSource!=='owner'||venue.rentalDetails)return null;
 for(const key of rentalKeys){
  const amount=venue.pricing[key];
  if(venue.packageAvailability[key]==='available'&&typeof amount==='number'&&Number.isSafeInteger(amount)&&amount>0){
   return {key,amount,label:rentalLabels[key],timing:packageTimeLabel(venue.packageTimings[key])};
  }
 }
 return null;
}
