window.Pawear = (() => {
  function notice(message) { let el=document.querySelector('.paw-notice'); if(!el){el=document.createElement('div');el.className='paw-notice';el.setAttribute('role','status');document.body.append(el);} el.textContent=message; clearTimeout(el.timer);el.timer=setTimeout(()=>el.remove(),6000); }
  async function request(url, method='GET', body) {
    const response=await fetch(url,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
    const data=response.status===204?null:await response.json();
    if(!response.ok){const translated={DUPLICATE_PHONE:'این شماره قبلاً ثبت‌نام کرده است؛ وارد حساب شو.',DUPLICATE_EMAIL:'این ایمیل قبلاً ثبت شده است.'};const validation=data?.message==='validation failed';const error=new Error(translated[data?.code]||(validation?'اطلاعات واردشده را بررسی کن؛ شماره موبایل و نام‌ها باید معتبر باشند.':data?.message)||'درخواست انجام نشد.');error.status=response.status;error.code=data?.code;error.details=data?.details;throw error;}return data;
  }
  const formData=form=>Object.fromEntries([...new FormData(form)].filter(([,v])=>v!==''));
  const run=fn=>async event=>{event.preventDefault();const button=event.submitter||event.target.closest('button');if(button)button.disabled=true;try{await fn(event);}catch(error){notice(error.message);if(error.status===401&&!['/login','/signup','/admin/login'].includes(location.pathname))location.href='/login?next='+encodeURIComponent(location.pathname);}finally{if(button)button.disabled=false;}};
  const redirectAfterLogin=()=>{const next=new URLSearchParams(location.search).get('next'); location.href=location.pathname.startsWith('/admin')?'/admin':next&&next.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\')?next:'/account';};
  async function startPayment(id){const {data}=await request('/api/payments/order/'+id,'POST');if(data.redirectUrl)location.href=data.redirectUrl;else location.href='/orders/'+id;}
  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-add-cart]'); if(add){run(async()=>{const qty=add.dataset.quantity?Number(document.querySelector(add.dataset.quantity).value):1;if(!Number.isInteger(qty)||qty<1||qty>100)throw new Error('تعداد باید بین ۱ تا ۱۰۰ باشد.');const result=await request('/api/cart','POST',{itemType:add.dataset.type,item:add.dataset.addCart,quantity:qty});document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=result.data.cart.items.reduce((n,i)=>n+i.quantity,0));notice('به سبد خرید اضافه شد.');})(event);return;}

    if(event.target.closest('[data-logout]'))run(async()=>{await request('/api/auth/logout','POST');location.href='/login';})(event);
  });
  return {request,notice,formData,run,redirectAfterLogin,startPayment};
})();
