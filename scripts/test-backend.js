// Starts an isolated, disposable MongoDB replica set unless TEST_MONGODB_URI is supplied.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {MongoClient}=require('mongodb');
const run=env=>new Promise(resolve=>{const p=spawn(process.execPath,['--test','tests/backend.test.js','tests/frontend.test.js','tests/lifecycle.test.js'],{stdio:'inherit',env});p.on('error',()=>resolve(1));p.on('exit',code=>resolve(code??1));});
(async()=>{
 if(process.env.TEST_MONGODB_URI){process.exitCode=await run(process.env);return;}
 const root=path.resolve(__dirname,'../artifacts');fs.mkdirSync(root,{recursive:true});const dir=fs.mkdtempSync(path.join(root,'test-mongo-'));
 const port=await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const binary=process.env.MONGOD_BINARY||(process.platform==='win32'?'C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe':'mongod');
 const child=spawn(binary,['--dbpath',dir,'--bind_ip','127.0.0.1','--port',String(port),'--replSet','pawearTest','--logpath',path.join(dir,'mongo.log')],{stdio:'ignore',windowsHide:true});
 let spawnError;child.on('error',e=>{spawnError=e;});
 const uri='mongodb://127.0.0.1:'+port;
 try{
  let client;
  for(let i=0;i<40;i++){if(spawnError)throw spawnError;try{client=await MongoClient.connect(uri+'/?directConnection=true',{serverSelectionTimeoutMS:300});break;}catch{await new Promise(r=>setTimeout(r,200));}}
  if(!client)throw new Error('Could not start test MongoDB. Set MONGOD_BINARY or TEST_MONGODB_URI.');
  await client.db('admin').command({replSetInitiate:{_id:'pawearTest',members:[{_id:0,host:'127.0.0.1:'+port}]}});
  await client.close();
  process.exitCode=await run({...process.env,TEST_MONGODB_URI:uri+'/?replicaSet=pawearTest'});
 }catch(e){console.error(e.message);process.exitCode=1;}
 finally{
  // Shut down only the MongoDB process created by this script.
  try{const c=await MongoClient.connect(uri+'/?directConnection=true',{serverSelectionTimeoutMS:500});await c.db('admin').command({shutdown:1,force:true}).catch(()=>{});await c.close();}catch{}
  if(child.exitCode===null)child.kill();
  // Retain logs/data under ignored artifacts for diagnosing failed tests.
 }
})();
