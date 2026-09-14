export async function cateringApi<T>(action:string,body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch('/api/catering/'+action,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal});
 let data:unknown;try{data=await response.json();}catch{throw new Error('Could not read the response. Open the site in a signed-in tab and retry.');}
 if(!response.ok)throw new Error(data&&typeof data==='object'&&'error' in data?String(data.error):'Could not complete this request.');return data as T;
}
