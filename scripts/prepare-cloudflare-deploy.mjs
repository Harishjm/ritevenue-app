import {access,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const allowedEnvironments=new Set(['staging','production']);

export function deploymentValues(environment,source=process.env){
 if(!allowedEnvironments.has(environment))throw new Error('Environment must be either staging or production.');
 const prefix=`CLOUDFLARE_${environment.toUpperCase()}`,d1Variable=`${prefix}_D1_DATABASE_ID`,r2Variable=`${prefix}_R2_BUCKET`;
 const required={d1Variable,r2Variable,d1:source[d1Variable],r2:source[r2Variable],adminEmail:source.RITEVENUE_ADMIN_EMAIL,fromEmail:source.RITEVENUE_OTP_FROM_EMAIL};
 for(const [name,value] of [[d1Variable,required.d1],[r2Variable,required.r2],['RITEVENUE_ADMIN_EMAIL',required.adminEmail],['RITEVENUE_OTP_FROM_EMAIL',required.fromEmail]])if(!value?.trim())throw new Error(`${name} is required.`);
 if(!/^[0-9a-f-]{32,36}$/i.test(required.d1))throw new Error(`${d1Variable} has an invalid format.`);
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(required.r2))throw new Error(`${r2Variable} has an invalid format.`);
 for(const [name,value] of [['RITEVENUE_ADMIN_EMAIL',required.adminEmail],['RITEVENUE_OTP_FROM_EMAIL',required.fromEmail]])if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error(`${name} has an invalid format.`);
 return {...required,d1:required.d1.trim(),r2:required.r2.trim(),adminEmail:required.adminEmail.trim().toLowerCase(),fromEmail:required.fromEmail.trim().toLowerCase()};
}

export function prepareCloudflareConfig(source,environment,values){
 const config=structuredClone(source);
 config.name=`ritevenue-${environment}`;config.workers_dev=true;config.preview_urls=false;
 if(environment==='production')config.routes=[{pattern:'ritevenue.in',custom_domain:true},{pattern:'www.ritevenue.in',custom_domain:true}];else delete config.routes;
 delete config.route;
 config.vars={...(config.vars??{}),RITEVENUE_MODE:'public_directory',RITEVENUE_DEPLOYMENT:`standalone_cloudflare_${environment}`,RITEVENUE_ADMIN_EMAIL:values.adminEmail,RITEVENUE_OTP_FROM_EMAIL:values.fromEmail};
 config.d1_databases=[{binding:'DB',database_name:`ritevenue-${environment}`,database_id:values.d1,migrations_dir:'../../drizzle'}];
 config.r2_buckets=[{binding:'BUCKET',bucket_name:values.r2}];
 config.send_email=[{name:'AUTH_EMAIL',destination_address:values.adminEmail,allowed_sender_addresses:[values.fromEmail]}];
 return config;
}

async function main(){
 const environment=process.argv[2],checkOnly=process.argv.includes('--check'),values=deploymentValues(environment);
 const projectRoot=process.cwd(),sourcePath=path.join(projectRoot,'dist/server/wrangler.json'),outputPath=path.join(projectRoot,`dist/server/wrangler.${environment}.json`);await access(sourcePath);
 const config=prepareCloudflareConfig(JSON.parse(await readFile(sourcePath,'utf8')),environment,values);
 if(checkOnly)console.log(`Standalone ${environment} configuration is valid.`);else{await writeFile(outputPath,`${JSON.stringify(config,null,2)}\n`,'utf8');console.log(`Prepared ${path.relative(projectRoot,outputPath)}.`);}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
