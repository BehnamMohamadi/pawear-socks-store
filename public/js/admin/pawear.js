(() => {
 const form=document.querySelector('#resourceForm');
 const run=fn=>async event=>{event.preventDefault();const button=event.submitter||event.target.closest('button');if(button)button.disabled=true;try{await fn(event);}catch(error){adminToast(error.message,'error');const message=document.querySelector('#formMessage');if(message)message.textContent=error.message;}finally{if(button)button.disabled=false;}};
 const payload=form=>Object.fromEntries([...new FormData(form)].filter(([,v])=>v!==''));
 const componentRows=()=>[...document.querySelectorAll('[data-component]')];
 function updateBox(){const selected=componentRows().filter(el=>Number(el.value)>0);const total=selected.reduce((n,el)=>n+Number(el.value)*Number(el.dataset.price),0);const pairs=selected.reduce((n,el)=>n+Number(el.value),0);const stock=selected.length?Math.min(...selected.map(el=>el.dataset.active==='true'?Math.floor(Number(el.dataset.stock)/Number(el.value)):0)):0;const discount=Number(form?.elements.discount?.value)||0;const el=document.querySelector('#boxPreview');if(el)el.textContent=pairs+' جفت — قیمت با تخفیف: '+Math.round(total*(100-discount)/100).toLocaleString('fa-IR')+' تومان — '+stock+' باکس قابل فروش';}
 function filterSubcategories(){const category=form?.elements.category?.value;const select=form?.elements.subCategory;if(!select)return;[...select.options].forEach(o=>{o.hidden=Boolean(o.value&&o.dataset.category!==category);o.disabled=o.hidden;});if(select.selectedOptions[0]?.disabled)select.value='';}
 form?.elements.category?.addEventListener('change',filterSubcategories);filterSubcategories();
 form?.addEventListener('input',updateBox);updateBox();
 form?.addEventListener('submit',run(async()=>{
  const body=payload(form);[...form.elements].forEach(el=>{if(!el.name)return;if(el.type==='checkbox')body[el.name]=el.checked;else if(el.type==='number'&&el.value!=='')body[el.name]=Number(el.value);});
  const key=form.dataset.resource,id=form.dataset.id;
  if(key==='products'){body.size='free-size';body.description=form.elements.description.value;body.details=[...document.querySelectorAll('.paw-detail-row')].map(row=>({title:row.querySelector('[data-detail-title]').value.trim(),value:row.querySelector('[data-detail-value]').value.trim()}));}
  if(key==='boxes'){body.description=form.elements.description.value;body.products=componentRows().filter(el=>Number(el.value)>0).map(el=>({product:el.dataset.component,quantity:Number(el.value)}));}
  if(key==='users'&&id){body.accountStatus={status:body.accountState,reason:body.accountState==='active'?null:'admin_deactivated'};delete body.accountState;}
  const result=await AdminAPI.request(form.dataset.api+(id?'/'+id:''),{method:id?'PATCH':'POST',body});
  const record=Object.values(result.data).find(r=>r&&r._id);
  location.href='/admin/'+key+'/'+(id||record._id)+'/edit';
 }));
 document.querySelector('#addDetail')?.addEventListener('click',()=>{const row=document.createElement('div');row.className='paw-detail-row';row.innerHTML='<input data-detail-title placeholder="عنوان" maxlength="100" required><input data-detail-value placeholder="مقدار" maxlength="500" required><button type="button" data-remove-row>حذف</button>';document.querySelector('#detailRows').append(row);});
 document.addEventListener('click',event=>{if(event.target.closest('[data-remove-row]'))event.target.closest('.paw-detail-row').remove();});
 const imagePath=(key,id)=>'/api/'+key+'/'+id+(key==='products'?'/gallery':'/images');
 document.querySelector('#imageUpload')?.addEventListener('submit',run(async event=>{const f=event.currentTarget;await AdminAPI.request(imagePath(f.dataset.key,f.dataset.id),{method:'POST',body:new FormData(f)});location.reload();}));
 document.querySelector('#saveImages')?.addEventListener('click',run(async event=>{const b=event.currentTarget;const images=[...document.querySelectorAll('[data-keep-image]:checked')].map(el=>el.value);const coverImage=document.querySelector('[name=coverChoice]:checked')?.value;if(coverImage&&!images.includes(coverImage))throw new Error('تصویر جلد باید در تصاویر نگه‌داشته‌شده باشد.');await AdminAPI.request(imagePath(b.dataset.key,b.dataset.id),{method:'PUT',body:{images,...(coverImage?{coverImage}:{})}});location.reload();}));
 document.querySelector('#iconUpload')?.addEventListener('submit',run(async event=>{const f=event.currentTarget;await AdminAPI.request(f.dataset.api+'/edit-icon/'+f.dataset.id,{method:'PATCH',body:new FormData(f)});location.reload();}));
 document.querySelector('[data-delete-resource]')?.addEventListener('click',run(async event=>{const b=event.currentTarget;if(!await adminConfirm('این دسته خالی حذف شود؟'))return;await AdminAPI.request(b.dataset.deleteResource,{method:'DELETE'});location.href=b.dataset.return;}));
 document.addEventListener('submit',event=>{if(event.target.id!=='orderStatusForm')return;run(async event=>{const f=event.target;if(!await adminConfirm('تغییر وضعیت سفارش ثبت شود؟'))return;await AdminAPI.request('/api/orders/admin/'+f.dataset.id,{method:'PATCH',body:payload(f)});await PawearLive.refresh(location.href,true);})(event);});
 document.addEventListener('submit',event=>{if(event.target.id!=='paymentReviewForm')return;run(async event=>{const f=event.target;const body=payload(f);if(body.resolution==='refunded'&&!body.refundReference)throw new Error('شماره پیگیری بازپرداخت انجام‌شده لازم است.');if(body.resolution==='stock_supplied')delete body.refundReference;if(!await adminConfirm('نتیجه نهایی ثبت شود؟ پس از ثبت قابل تغییر نیست.'))return;await AdminAPI.request('/api/payments/admin/'+f.dataset.id+'/review',{method:'PATCH',body});await PawearLive.refresh(location.href,true);})(event);});
})();
