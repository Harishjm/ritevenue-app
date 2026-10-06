import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

function sourceFiles(directory){
 return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=join(directory,entry.name);
  return entry.isDirectory()?sourceFiles(path):entry.name.endsWith('.tsx')?[path]:[];
 });
}

for(const file of [...sourceFiles('app'),...sourceFiles('components')]){
 const source=readFileSync(file,'utf8');
 assert.doesNotMatch(source,/from\s+['"]next\/link['"]/,`${file} uses client-side Link, which currently prevents live navigation`);
}
const header=readFileSync('components/header.tsx','utf8');
assert.match(header,/<Link href="\/list-your-venue"/);
assert.match(header,/<Link href="\/guides"/);
console.log('Passed navigation safety: public and workspace links use native browser navigation.');
