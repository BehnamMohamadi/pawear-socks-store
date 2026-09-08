const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {MongoClient}=require('mongodb');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
(async()=>{
 if(process.env.NODE_ENV==='production')throw new Error('Local database helper is disabled in production.');
 const target=new URL(process.env.MONGODB_URI);
 if(target.hostname!=='127.0.0.1'||target.port!=='27028'||target.searchParams.get('replicaSet')!=='pawearDev')throw new Error('This helper only manages 127.0.0.1:27028 replica set pawearDev. Configure other databases yourself.');
 const direct='mongodb://127.0.0.1:27028/?directConnection=true';
 let client;
 try{client=await MongoClient.connect(direct,{serverSelectionTimeoutMS:500});}
 catch{
  const dir=path.resolve(__dirname,'../artifacts/mongo');fs.mkdirSync(dir,{recursive:true});
  const binary=process.env.MONGOD_BINARY||(process.platform==='win32'?'C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe':'mongod');
  const child=spawn(binary,['--dbpath',dir,'--bind_ip','127.0.0.1','--port','27028','--replSet','pawearDev','--logpath',path.resolve(dir,'../mongo.log'),'--logappend'],{detached:true,stdio:'ignore',windowsHide:true});
  let error;child.on('error',e=>{error=e;});child.unref();
  for(let i=0;i<30;i++){if(error)throw error;try{client=await MongoClient.connect(direct,{serverSelectionTimeoutMS:300});break;}catch{await new Promise(r=>setTimeout(r,200));}}
 }
 if(!client)throw new Error('Local MongoDB did not start. Check artifacts/mongo.log and MONGOD_BINARY.');
 try{
  const hello=await client.db('admin').command({hello:1});
  if(hello.setName&&hello.setName!=='pawearDev')throw new Error('Another replica set owns this port; no changes made.');
  try{await client.db('admin').command({replSetGetStatus:1});}
  catch(e){if(e.code!==94)throw e;await client.db('admin').command({replSetInitiate:{_id:'pawearDev',members:[{_id:0,host:'127.0.0.1:27028'}]}});}
  for(let i=0;i<40;i++){if((await client.db('admin').command({hello:1})).isWritablePrimary){console.log('PAWEAR MongoDB ready on 127.0.0.1:27028 (pawearDev).');return;}await new Promise(r=>setTimeout(r,250));}
  throw new Error('Replica set primary is not ready yet.');
 }finally{await client.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
