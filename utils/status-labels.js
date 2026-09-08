const labels={
 pending:'در انتظار',payment_pending:'در انتظار پرداخت',review:'نیازمند بررسی',confirmed:'تأییدشده',shipped:'ارسال‌شده',delivered:'تحویل‌شده',cancelled:'لغوشده',expired:'مهلت تمام‌شده',
 unpaid:'پرداخت‌نشده',paid:'پرداخت‌شده',failed:'ناموفق',refunded:'بازپرداخت‌شده',created:'ایجادشده',processing:'در حال بررسی پرداخت',
 active:'فعال',deactivated:'غیرفعال',suspended:'تعلیق‌شده',not_required:'بدون نیاز به بررسی',resolving:'در حال رسیدگی',resolved:'رسیدگی‌شده',
 none:'بدون رزرو',reserved:'رزروشده',consumed:'مصرف‌شده',released:'آزادشده',stock_supplied:'موجودی تأمین شد',
 opened:'بررسی باز شد',resolution_changed:'نتیجه تغییر کرد',user:'مشتری',admin:'مدیر',mock:'آزمایشی',zarinpal:'زرین‌پال'
};
module.exports=value=>labels[value]||value||'—';
