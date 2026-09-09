const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('wishlist toggles both ways and synchronizes duplicate cards',async()=>{
 const buttons=[0,1].map(()=>({dataset:{wishlist:'product-1'},attributes:{'aria-pressed':'false'},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},querySelector(){return null}}));
 let handler,work;const calls=[];
 vm.runInNewContext(fs.readFileSync('public/javascript/shared/wishlist.js','utf8'),{
 document:{querySelectorAll:()=>buttons,addEventListener:(name,fn)=>handler=fn},
 location:{pathname:'/shop'},Pawear:{run:fn=>()=>{work=fn()},request:async(...args)=>{calls.push(args)},notice(){}}
 });
 const event={target:{closest:()=>buttons[0]}};
 handler(event);await work;
 assert.equal(calls[0][1],'POST');assert.ok(buttons.every(b=>b.attributes['aria-pressed']==='true'));
 handler(event);await work;
 assert.equal(calls[1][0],'/api/wishlists/product-1');assert.equal(calls[1][1],'DELETE');
 assert.ok(buttons.every(b=>b.attributes['aria-pressed']==='false'));
});
