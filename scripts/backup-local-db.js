const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});

const uri=process.env.MONGODB_URI;
if(!uri)throw new Error('MONGODB_URI is not configured');

const target=new URL(uri);
if(target.hostname!=='127.0.0.1'||target.port!=='27028'||target.searchParams.get('replicaSet')!=='pawearDev'){
 throw new Error('Automatic local backup only supports PAWEAR local MongoDB on 127.0.0.1:27028/pawearDev.');
}

const backupRoot=path.resolve(process.env.PAWEAR_BACKUP_DIR||path.join(os.homedir(),'.pawear-backups'));
fs.mkdirSync(backupRoot,{recursive:true});

const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.join(backupRoot,timestamp);
const binary=process.env.MONGODUMP_BINARY||'mongodump';
const result=spawnSync(binary,['--uri',uri,'--out',output],{stdio:'inherit',windowsHide:true});

if(result.error&&result.error.code==='ENOENT'){
 console.warn('[PAWEAR DB SAFETY] mongodump was not found. Install MongoDB Database Tools or set MONGODUMP_BINARY. Backup was skipped.');
 process.exitCode=0;
 return;
}
if(result.error)throw result.error;
if(result.status!==0)throw new Error(`mongodump failed with exit code ${result.status}`);

const entries=fs.readdirSync(backupRoot,{withFileTypes:true})
 .filter(entry=>entry.isDirectory())
 .map(entry=>({name:entry.name,path:path.join(backupRoot,entry.name),mtime:fs.statSync(path.join(backupRoot,entry.name)).mtimeMs}))
 .sort((a,b)=>b.mtime-a.mtime);
for(const old of entries.slice(10))fs.rmSync(old.path,{recursive:true,force:true});

console.log(`[PAWEAR DB SAFETY] Local database backup created: ${output}`);
