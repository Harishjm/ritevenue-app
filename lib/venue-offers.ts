import {z} from 'zod';

const text=z.string().trim().min(1).max(120);
const amount=z.number().int().min(0).max(100000000);
export const taxSchema=z.object({status:z.enum(['included','extra','unconfirmed']).default('unconfirmed'),rate:z.number().min(0).max(100).nullable().default(null)}).strict().refine(t=>t.status!=='extra'||t.rate!==null,'Enter the tax rate when tax is extra.');
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Use a valid time.');
export const rentalDetailsSchema=z.object({
 version:z.literal(1),
 spaces:z.array(z.object({id:text,name:text,capacity:z.number().int().min(1).max(50000).nullable().default(null)}).strict()).max(10),
 offers:z.array(z.object({id:text,name:text,spaceIds:z.array(text).max(10),status:z.enum(['available','not_applicable','not_available']),amount:amount.nullable(),tax:taxSchema,start:time.nullable(),end:time.nullable(),endDay:z.number().int().min(0).max(2),food:z.enum(['optional','required','not_included','unconfirmed']),notes:z.string().trim().max(500)}).strict()).min(1).max(15),
 facilities:z.array(z.object({name:text,quantity:z.number().int().min(1).max(50000).nullable(),status:z.enum(['included','not_available','unconfirmed'])}).strict()).max(25),
 charges:z.array(z.object({name:text,amount:amount.nullable(),basis:z.enum(['per_event','per_hour','per_item']),tax:taxSchema,required:z.boolean(),offerIds:z.array(text).max(15)}).strict()).max(15),
 menus:z.array(z.object({name:text,diet:z.enum(['vegetarian','non_vegetarian','unconfirmed']),style:z.enum(['buffet','plantain_leaf','served','unconfirmed']),perPerson:amount.nullable(),tax:taxSchema,minimumGuests:z.number().int().min(1).max(50000).nullable(),offerIds:z.array(text).max(15)}).strict()).max(10),
}).strict().superRefine((d,ctx)=>{
 const unique=(ids:string[],path:string)=>{if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',path:[path],message:'Use unique IDs.'});};
 unique(d.spaces.map(s=>s.id),'spaces');unique(d.offers.map(o=>o.id),'offers');
 for(const [i,o] of d.offers.entries()){
  if(new Set(o.spaceIds).size!==o.spaceIds.length||o.spaceIds.some(id=>!d.spaces.some(s=>s.id===id)))ctx.addIssue({code:'custom',path:['offers',i,'spaceIds'],message:'Select existing spaces without duplicates.'});
  if((o.start===null)!==(o.end===null)||(o.start!==null&&o.end!==null&&o.endDay===0&&o.end<=o.start))ctx.addIssue({code:'custom',path:['offers',i,'end'],message:'Set both times and choose the correct ending day.'});
 }
 for(const group of ['charges','menus'] as const)for(const [i,item] of d[group].entries())if(new Set(item.offerIds).size!==item.offerIds.length||item.offerIds.some(id=>!d.offers.some(o=>o.id===id)))ctx.addIssue({code:'custom',path:[group,i,'offerIds'],message:'Select existing offers without duplicates.'});
});
export type RentalDetails=z.infer<typeof rentalDetailsSchema>;
export const emptyLegacyPricing={rent:0,marriageRent:0,morningRent:0,eveningRent:0,extraHour:0,ac:0,generator:0,parking:0,cleaning:0};
export function newRentalDetails():RentalDetails{return {version:1,spaces:[],offers:[{id:crypto.randomUUID(),name:'Venue rental',spaceIds:[],status:'available',amount:null,tax:{status:'unconfirmed',rate:null},start:null,end:null,endDay:0,food:'unconfirmed',notes:''}],facilities:[],charges:[],menus:[]};}
export function taxLabel(t:z.infer<typeof taxSchema>){return t.status==='included'?'GST included':t.status==='extra'?`+ ${t.rate}% GST`:'GST treatment unconfirmed';}
export function offerHours(o:RentalDetails['offers'][number]){return o.start&&o.end?`${o.start}–${o.end}${o.endDay?` (${o.endDay===1?'next day':`${o.endDay} days later`})`:''}`:'Timings to be confirmed';}
