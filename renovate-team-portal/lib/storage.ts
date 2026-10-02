import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {dataDir} from './database.mjs';
function path(key:string){if(!/^(receipts|board)\/[a-zA-Z0-9_-]+\/[a-f0-9-]+$/.test(key))throw Error('Invalid file key');return join(dataDir,'uploads',key);}
export const bucket={
 async put(key:string,buffer:ArrayBuffer,options:{httpMetadata:{contentType:string}}){const target=path(key);await mkdir(dirname(target),{recursive:true,mode:0o700});await writeFile(target,Buffer.from(buffer),{mode:0o600});await writeFile(target+'.type',options.httpMetadata.contentType,{mode:0o600});},
 async get(key:string){try{const target=path(key),body=await readFile(target),type=await readFile(target+'.type','utf8');return {body:new Uint8Array(body),httpMetadata:{contentType:type}}}catch{return null;}},
 async delete(key:string){const target=path(key);await Promise.all([unlink(target).catch(()=>{}),unlink(target+'.type').catch(()=>{})]);}
};
