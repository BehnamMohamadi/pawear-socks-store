const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Small event fixtures exercise our controllers, not browser layout or rendering.
class Element {
  constructor() {
    this.dataset = {}; this.attributes = {}; this.events = {}; this.hidden = false;
    this.value = ''; this.disabled = false; this.textContent = ''; this.inputs = [];
    const classes = new Set();
    this.classList = { toggle(name, force) { const on = force ?? !classes.has(name); if(on)classes.add(name);else classes.delete(name);return on; }, contains: name => classes.has(name) };
  }
  addEventListener(name, fn) { this.events[name] = fn; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  querySelectorAll() { return this.inputs; }
  querySelector() { return this.inputs[0]; }
  focus() { this.focused = true; }
  reportValidity() { return Boolean(this.value); }
  contains() { return false; }
  closest() { return null; }
  fire(name, extra = {}) { return this.events[name]?.({ target:this,currentTarget:this,submitter:this,preventDefault(){},...extra }); }
}
const script = file => fs.readFileSync(path.join(__dirname,'../public/javascript/pages',file),'utf8');

function sliderFixture(reduce = false) {
  const root = new Element(), slides = [new Element(),new Element()], tabs = [new Element(),new Element()];
  const nodes = Object.fromEntries(['pause','status','next','prev'].map(name=>['[data-slider-'+name+']',new Element()]));
  root.querySelector = selector => nodes[selector];
  root.querySelectorAll = selector => selector==='[data-slide]'?slides:tabs;
  let now=0,id=0; const timers=new Map();
  const document = {hidden:false,events:{},querySelector:()=>root,addEventListener(name,fn){this.events[name]=fn;}};
  const media = {matches:reduce,addEventListener(){}};
  vm.runInNewContext(script('home/home.js'), {document,matchMedia:()=>media,Date:{now:()=>now},setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)});
  return {root,slides,tabs,nodes,timers,document,advance:n=>now+=n};
}
test('slideshow preserves remaining time on pause, wraps and hides inactive links', () => {
  const f=sliderFixture();assert.equal([...f.timers.values()][0].delay,7000);
  f.advance(2500);f.root.fire('mouseenter');assert.equal(f.timers.size,0);
  f.advance(9000);f.root.fire('mouseleave');assert.equal([...f.timers.values()][0].delay,4500);
  f.nodes['[data-slider-next]'].fire('click');
  assert.equal(f.slides[0].inert,true);assert.equal(f.slides[1].inert,false);
  assert.equal(f.slides[0].attributes['aria-hidden'],'true');
  assert.equal(f.tabs[1].attributes['aria-current'],'true');
  assert.equal([...f.timers.values()][0].delay,7000);
  f.nodes['[data-slider-next]'].fire('click');assert.equal(f.slides[0].inert,false);
  f.root.fire('touchstart',{changedTouches:[{clientX:200}]});
  f.root.fire('touchend',{changedTouches:[{clientX:80}]});assert.equal(f.slides[1].inert,false);
});
test('reduced motion stops autoplay; users can explicitly resume or pause', () => {
  const f=sliderFixture(true);assert.equal(f.timers.size,0);
  f.nodes['[data-slider-pause]'].fire('click');assert.equal(f.timers.size,1);
  f.document.hidden=true;f.document.events.visibilitychange();assert.equal(f.timers.size,0);
  f.document.hidden=false;f.document.events.visibilitychange();assert.equal(f.timers.size,1);
  f.nodes['[data-slider-pause]'].fire('click');assert.equal(f.timers.size,0);
});

function authFixture(mode='login') {
  const ids=['authForm','otpForm','authMessage','otpPhone','otpCode','otpPhoneStep','otpCodeStep','otpProfile','resendOtp','otpTimer','passwordPhone','passwordInput','passwordPanel','otpPanel','requestOtp','editOtpPhone','otpDestination'];
  const nodes=Object.fromEntries(ids.map(id=>['#'+id,new Element()]));
  for(const selector of ['.password-toggle','[data-switch-otp]','[data-switch-password]'])nodes[selector]=new Element();
  nodes['[data-auth-mode]']=new Element();nodes['[data-auth-mode]'].dataset.authMode=mode;
  const tabs=['password','otp'].map(method=>{const e=new Element();e.dataset.authTab=method;return e;});
  nodes['#otpPanel'].hidden=true;nodes['#otpCodeStep'].hidden=true;nodes['#otpProfile'].hidden=true;
  nodes['#passwordPhone'].name='phonenumber';nodes['#passwordInput'].name='password';nodes['#passwordInput'].type='password';
  nodes['#otpPhone'].name='phonenumber';nodes['#otpCode'].name='code';nodes['#otpCode'].disabled=true;
  const names=['firstname','lastname'].map(name=>{const e=new Element();e.name=name;e.disabled=true;return e;});
  nodes['#otpProfile'].inputs=names;
  nodes['#authForm'].inputs=[nodes['#passwordPhone'],nodes['#passwordInput']];
  nodes['#otpForm'].inputs=[nodes['#otpPhone'],nodes['#otpCode'],...names];
  const calls=[];let redirects=0,reply=async()=>({data:{user:{role:'user'},retryAfter:60}});
  const Pawear={formData:form=>Object.fromEntries(form.inputs.filter(e=>!e.disabled&&e.value).map(e=>[e.name,e.value])),request:async(...args)=>{calls.push(args);return reply(...args);},redirectAfterLogin:()=>redirects++};
  const location={search:'',href:''};
  vm.runInNewContext(script('auth/auth.js'),{document:{querySelector:s=>nodes[s],querySelectorAll:()=>tabs},Pawear,URLSearchParams,location,Date,setInterval:()=>1,clearInterval(){}});
  return {nodes,tabs,names,calls,location,setReply:fn=>reply=fn,get redirects(){return redirects;}};
}
test('password login stays independent of SMS and normalizes Persian phone digits', async () => {
  const f=authFixture();f.nodes['#passwordPhone'].value='۰۹۱۲ ۳۴۵ ۶۷۸۹';f.nodes['#passwordInput'].value='a-secure-password';
  await f.nodes['#authForm'].fire('submit');
  assert.equal(f.calls.length,1);assert.equal(f.calls[0][0],'/api/auth/login');
  assert.equal(f.calls[0][2].phonenumber,'09123456789');assert.equal(f.redirects,1);
  f.nodes['.password-toggle'].fire('click');assert.equal(f.nodes['#passwordInput'].type,'text');
});
test('OTP flow switches methods, enforces resend cooldown and completes missing profile', async () => {
  const f=authFixture();f.nodes['#passwordPhone'].value='09123456789';f.tabs[1].fire('click');
  assert.equal(f.nodes['#passwordPanel'].hidden,true);assert.equal(f.nodes['#otpPanel'].hidden,false);
  assert.equal(f.nodes['#otpPhone'].value,'09123456789');
  await f.nodes['#requestOtp'].fire('click');
  assert.equal(f.nodes['#otpCodeStep'].hidden,false);assert.equal(f.nodes['#resendOtp'].disabled,true);
  f.nodes['#otpCode'].value='۱۲۳۴۵۶';
  f.setReply(async()=>{const e=new Error('نام و نام خانوادگی لازم است.');e.code='PROFILE_REQUIRED';throw e;});
  await f.nodes['#otpForm'].fire('submit');
  assert.equal(f.calls.at(-1)[2].code,'123456');assert.equal(f.nodes['#otpProfile'].hidden,false);
  assert.ok(f.names.every(e=>e.required&&!e.disabled));assert.equal(f.redirects,0);
  f.names[0].value='بهنام';f.names[1].value='محمدی';f.setReply(async()=>({data:{user:{role:'user'}}}));
  await f.nodes['#otpForm'].fire('submit');assert.equal(f.redirects,1);assert.equal(f.calls.at(-1)[2].firstname,'بهنام');
});
test('admin login rejects customer role without reporting successful admin access', async () => {
  const f=authFixture('admin');f.nodes['#passwordPhone'].value='09123456789';f.nodes['#passwordInput'].value='a-secure-password';
  await f.nodes['#authForm'].fire('submit');assert.equal(f.redirects,0);assert.match(f.nodes['#authMessage'].textContent,/دسترسی مدیریت/);
});
test('forgot password verifies OTP before offering a new password without the old one',async()=>{
  const f=authFixture();f.nodes['#passwordPhone'].value='09123456789';
  f.nodes['[data-switch-otp]'].fire('click');
  await f.nodes['#requestOtp'].fire('click');f.nodes['#otpCode'].value='123456';
  await f.nodes['#otpForm'].fire('submit');
  assert.equal(f.location.href,'/login/password');assert.equal(f.redirects,0);
});
