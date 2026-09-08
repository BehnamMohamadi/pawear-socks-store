document.addEventListener('click',event=>{
  const button=event.target.closest('[data-mock-payment],[data-pay-order],[data-cancel-order],[data-copy-tracking],[data-confirm-received]');if(!button)return;
  Pawear.run(async()=>{
    if(button.dataset.copyTracking){await navigator.clipboard.writeText(button.dataset.copyTracking);Pawear.notice('کد رهگیری کپی شد.');return;}
    if(button.dataset.payOrder)return Pawear.startPayment(button.dataset.payOrder);
    if(button.dataset.confirmReceived){if(!window.confirm('بسته را دریافت کرده‌ای؟ تأیید دریافت ثبت می‌شود.'))return;await Pawear.request('/api/orders/'+button.dataset.confirmReceived+'/received','POST');}
    if(button.dataset.mockPayment)await Pawear.request('/api/payments/mock/'+button.dataset.mockPayment+'/success','POST');
    if(button.dataset.cancelOrder)await Pawear.request('/api/orders/'+button.dataset.cancelOrder,'DELETE');
    await PawearLive.refresh(location.href,true);
  })(event);
});
