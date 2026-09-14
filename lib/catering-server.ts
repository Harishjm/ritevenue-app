import {db} from './db';
import {sampleCaterers,supplierSchema,supplierView,samplePolicy,policySchema,type CateringPolicy} from './catering';
import {venueCatalog} from './demo-server';
export async function approvedCaterers(){const rows=await db().prepare("SELECT data_json FROM catering_drafts WHERE status='approved_for_demo' ORDER BY updated_at DESC,id").all<{data_json:string}>();return [...rows.results.map(r=>supplierView(supplierSchema.parse(JSON.parse(r.data_json)))),...sampleCaterers()];}
export async function cateringCatalog(){const [catalog,suppliers]=await Promise.all([venueCatalog(),approvedCaterers()]);return {suppliers,venues:catalog.venues.map(v=>({slug:v.slug,name:v.name,area:v.area,capacity:v.capacity,policy:v.cateringPolicy|| (v.source==='owner'?policySchema.parse({}):samplePolicy(v.slug,v.type))}))};}
export type CateringCatalog=Awaited<ReturnType<typeof cateringCatalog>>;
