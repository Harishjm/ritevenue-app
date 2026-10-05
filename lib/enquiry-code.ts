// A short display code only. Enquiry records and admin actions continue to use
// the full UUID; four digits are not unique enough to be an identifier or secret.
export function enquiryDisplayCode(reference:string):string{
 const firstEight=reference.replaceAll('-','').slice(0,8);
 if(!/^[0-9a-f]{8}$/i.test(firstEight))throw new Error('Invalid enquiry reference');
 return String(1000+Number.parseInt(firstEight,16)%9000);
}
