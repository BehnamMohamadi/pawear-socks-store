const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
test('restoring a frozen history page fetches fresh account and cart state',()=>{
 const events={};let reloads=0;
 vm.runInNewContext(fs.readFileSync('public/javascript/shared/lifecycle.js','utf8'),{
 window:{addEventListener:(name,fn)=>events[name]=fn,matchMedia:()=>({matches:true})},
 document:{documentElement:{classList:{remove(){}}},addEventListener(){}},
 location:{reload:()=>reloads++}
 });
 events.pageshow({persisted:false});assert.equal(reloads,0);
 events.pageshow({persisted:true});assert.equal(reloads,1);
});
