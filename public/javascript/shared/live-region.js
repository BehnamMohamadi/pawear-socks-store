(() => {
  let busy=false,dirty=false;
  document.addEventListener('input',e=>{if(e.target.closest('[data-live-region] form'))dirty=true;});
  async function refresh(url=location.href,force=false) {
    if(busy||(!force&&(document.hidden||dirty||document.activeElement?.closest('[data-live-region] form'))))return;
    busy=true;
    try{
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html'}});
      if(response.redirected){location.href=response.url;return;}
      if(!response.ok)throw new Error('به‌روزرسانی انجام نشد؛ دوباره تلاش کن.');
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      const current=document.querySelector('[data-live-region]'),next=doc.querySelector('[data-live-region]');
      if(!current||!next)throw new Error('دریافت اطلاعات تازه ممکن نشد.');
      current.replaceWith(next);dirty=false;
      const status=document.querySelector('[data-live-status]');
      if(status)status.textContent='به‌روز شد · '+new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
    }catch(error){const status=document.querySelector('[data-live-status]');if(status)status.textContent=error.message;}finally{busy=false;}
  }
  window.PawearLive={refresh};
  setInterval(()=>refresh(),20000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  document.addEventListener('submit',event=>{
    const form=event.target.closest('form[data-live-filter]');if(!form)return;
    event.preventDefault();const url=new URL(location.href);url.search=new URLSearchParams(new FormData(form)).toString();history.replaceState(null,'',url);refresh(url.href,true);
  });
  document.addEventListener('click',event=>{if(event.target.closest('[data-live-refresh]'))refresh(location.href,true);});
})();
