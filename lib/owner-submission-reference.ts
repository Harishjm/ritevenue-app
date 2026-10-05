// The first submitted name supplies the readable prefix. The venue ID supplies
// a stable suffix, so editing or resubmitting cannot change the reference.
export function ownerSubmissionReference(venueId:string,firstSubmittedName:string):string{
 const uuid=venueId.replaceAll('-','').toUpperCase();
 if(!/^[0-9A-F]{32}$/.test(uuid))throw new Error('Invalid venue ID');
 const words=firstSubmittedName.match(/[\p{L}\p{N}]+/gu)||[];
 const prefix=words.slice(0,6).map(word=>word[0].toUpperCase()).join('').replace(/[^A-Z0-9]/g,'')||'VENUE';
 return `${prefix}-${uuid.slice(0,12)}`;
}
