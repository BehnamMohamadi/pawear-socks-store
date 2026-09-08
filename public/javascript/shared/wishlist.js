(() => {
 const pending=new Set();
 function paint(id,on){
  document.querySelectorAll('[data-wishlist]').forEach(button=>{
   if(button.dataset.wishlist!==id)return;
   button.setAttribute('aria-pressed',String(on));
   button.setAttribute('aria-label',on?'حذف از علاقه‌مندی‌ها':'افزودن به علاقه‌مندی‌ها');
   const label=button.querySelector('[data-wishlist-label]');if(label)label.textContent=on?'ذخیره شده':'ذخیره برای بعد';
  });
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-wishlist]');if(!button)return;
  const id=button.dataset.wishlist;if(pending.has(id))return;
  Pawear.run(async()=>{
   pending.add(id);
   const saved=button.getAttribute('aria-pressed')==='true';
   try{
    await Pawear.request('/api/wishlists'+(saved?'/'+id:''),saved?'DELETE':'POST',saved?undefined:{productId:id});
    paint(id,!saved);
    Pawear.notice(saved?'از علاقه‌مندی‌ها حذف شد.':'به علاقه‌مندی‌ها اضافه شد.');
    if(saved&&location.pathname==='/wishlist'){
     button.closest('.product-card')?.remove();
     const count=document.querySelectorAll('.product-card').length;
     const counter=document.querySelector('.wishlist-count');if(counter)counter.textContent=count.toLocaleString('fa-IR')+' انتخاب';
     if(!count)location.reload();
    }
   }catch(error){
    // A second tab may already have applied this change.
    if((!saved&&error.status===409)||(saved&&error.status===404)){paint(id,!saved);if(location.pathname==='/wishlist')location.reload();}
    else throw error;
   }finally{pending.delete(id);}
  })(event);
 });
})();
