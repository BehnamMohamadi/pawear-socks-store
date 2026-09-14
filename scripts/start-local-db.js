const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {MongoClient}=require('mongodb');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});

const ALLOW_EMPTY_TOKEN='YES_I_UNDERSTAND';
const legacyDir=path.resolve(__dirname,'../artifacts/mongo');
const protectedRoot=path.resolve(process.env.PAWEAR_LOCAL_DATA_DIR||path.join(os.homedir(),'.pawear-local'));
const protectedDir=path.join(protectedRoot,'mongo');
const markerPath=path.join(protectedRoot,'database-initialized.json');

const hasMongoFiles=dir=>{
 if(!fs.existsSync(dir))return false;
 const names=fs.readdirSync(dir);
 return names.some(name=>name==='WiredTiger'||name.startsWith('WiredTiger.')||name.startsWith('collection-')||name.startsWith('index-'));
};

const migrateLegacyDatabase=()=>{
 if(hasMongoFiles(protectedDir)||!hasMongoFiles(legacyDir))return;
 fs.mkdirSync(protectedRoot,{recursive:true});
 console.log(`[PAWEAR DB SAFETY] Migrating local MongoDB data out of the repository:\n  from: ${legacyDir}\n  to:   ${protectedDir}`);
 fs.cpSync(legacyDir,protectedDir,{recursive:true,errorOnExist:false,force:true});
};

const assertLocalDataSafe=()=>{
 fs.mkdirSync(protectedRoot,{recursive:true});
 const wasInitialized=fs.existsSync(markerPath);
 if(wasInitialized&&!hasMongoFiles(protectedDir)&&process.env.ALLOW_EMPTY_LOCAL_DB!==ALLOW_EMPTY_TOKEN){
  throw new Error(
   `[PAWEAR DB SAFETY] Protected MongoDB data is missing from ${protectedDir}. `+
   `Startup was stopped to avoid silently creating an empty replacement database. `+
   `Restore the data/backup first, or set ALLOW_EMPTY_LOCAL_DB=${ALLOW_EMPTY_TOKEN} only if an empty reset is intentional.`
  );
 }
 fs.mkdirSync(protectedDir,{recursive:true});
};

const writeMarker=()=>{
 fs.mkdirSync(protectedRoot,{recursive:true});
 fs.writeFileSync(markerPath,JSON.stringify({
  app:'PAWEAR',
  replicaSet:'pawearDev',
  dataPath:protectedDir,
  initializedAt:new Date().toISOString()
 },null,2));
};

const startLocalDatabase=async()=>{
 if(process.env.NODE_ENV==='production')throw new Error('Local database helper is disabled in production.');
 const target=new URL(process.env.MONGODB_URI);
 if(target.hostname!=='127.0.0.1'||target.port!=='27028'||target.searchParams.get('replicaSet')!=='pawearDev')throw new Error('This helper only manages 127.0.0.1:27028 replica set pawearDev. Configure other databases yourself.');
 const direct='mongodb://127.0.0.1:27028/?directConnection=true';
 let client;
 try{client=await MongoClient.connect(direct,{serverSelectionTimeoutMS:500});}
 catch{
  migrateLegacyDatabase();
  assertLocalDataSafe();
  const binary=process.env.MONGOD_BINARY||(process.platform==='win32'?'C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe':'mongod');
  const logPath=path.join(protectedRoot,'mongo.log');
  const child=spawn(binary,['--dbpath',protectedDir,'--bind_ip','127.0.0.1','--port','27028','--replSet','pawearDev','--logpath',logPath,'--logappend'],{detached:true,stdio:'ignore',windowsHide:true});
  let error;child.on('error',e=>{error=e;});child.unref();
  for(let i=0;i<30;i++){if(error)throw error;try{client=await MongoClient.connect(direct,{serverSelectionTimeoutMS:300});break;}catch{await new Promise(r=>setTimeout(r,200));}}
 }
 if(!client)throw new Error(`Local MongoDB did not start. Check ${path.join(protectedRoot,'mongo.log')} and MONGOD_BINARY.`);
 try{
  const hello=await client.db('admin').command({hello:1});
  if(hello.setName&&hello.setName!=='pawearDev')throw new Error('Another replica set owns this port; no changes made.');
  try{await client.db('admin').command({replSetGetStatus:1});}
  catch(e){if(e.code!==94)throw e;await client.db('admin').command({replSetInitiate:{_id:'pawearDev',members:[{_id:0,host:'127.0.0.1:27028'}]}});}
  for(let i=0;i<40;i++){
   if((await client.db('admin').command({hello:1})).isWritablePrimary){
    writeMarker();
    console.log(`PAWEAR MongoDB ready on 127.0.0.1:27028 (pawearDev). Protected data path: ${protectedDir}`);
    return;
   }
   await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('Replica set primary is not ready yet.');
 }finally{await client.close();}
};

module.exports={startLocalDatabase};
if(require.main===module)startLocalDatabase().catch(e=>{console.error(e.message);process.exitCode=1;});
