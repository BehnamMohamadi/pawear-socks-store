let preparedOrder = null;

const editor = document.querySelector('#addressEditor');
const form = document.querySelector('#addressForm');
const checkoutForm = document.querySelector('#checkoutForm');
const provinceSelect = document.querySelector('#provinceSelect');
const citySelect = document.querySelector('#citySelect');
const statusBox = document.querySelector('#addressFormStatus');
const cancelButton = document.querySelector('#cancelAddress');
const continueButton = document.querySelector('.checkout-continue');
const fields = ['title','recipientName','recipientPhone','province','city','addressLine','postalCode','buildingNumber','unit'];

const locationTree = (() => {
  try { return JSON.parse(document.querySelector('#iranLocations')?.textContent || '[]'); }
  catch { return []; }
})();
const locationMap = new Map(locationTree.map(item => [item.province, new Set(item.cities)]));

const normalizeDigits = value => String(value ?? '')
  .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .trim();

const normalizeText = value => String(value ?? '').replace(/\s+/g, ' ').trim();

function clearErrors() {
  document.querySelectorAll('[data-error-for]').forEach(el => {
    el.hidden = true;
    el.textContent = '';
  });
  form?.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
  if (statusBox) statusBox.textContent = '';
}

function showFieldError(field, message) {
  const error = document.querySelector(`[data-error-for="${field}"]`);
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  const input = form?.elements[field];
  if (input) input.setAttribute('aria-invalid', 'true');
}

function setCities(province, selectedCity = '') {
  const cities = [...(locationMap.get(province) || [])];
  citySelect.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = province ? 'انتخاب شهر' : 'اول استان را انتخاب کن';
  citySelect.append(first);
  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    option.selected = city === selectedCity;
    citySelect.append(option);
  });
  citySelect.disabled = !province || !cities.length;
}

function normalizeFormValues() {
  ['recipientPhone','postalCode','buildingNumber','unit'].forEach(key => {
    if (form.elements[key]) form.elements[key].value = normalizeDigits(form.elements[key].value);
  });
  ['title','recipientName','addressLine'].forEach(key => {
    if (form.elements[key]) form.elements[key].value = normalizeText(form.elements[key].value);
  });
}

function validateAddressForm() {
  clearErrors();
  normalizeFormValues();
  const data = Pawear.formData(form);
  const errors = {};

  if (!data.title || data.title.length > 40) errors.title = 'یک عنوان کوتاه مثل «خانه» یا «محل کار» وارد کن.';
  if (!data.recipientName || data.recipientName.length < 2 || data.recipientName.length > 80) errors.recipientName = 'نام گیرنده را درست وارد کن.';
  if (!/^09\d{9}$/.test(data.recipientPhone || '')) errors.recipientPhone = 'شماره موبایل باید با 09 شروع شود و دقیقاً 11 رقم باشد.';
  if (!locationMap.has(data.province)) errors.province = 'استان معتبر را از فهرست انتخاب کن.';
  if (!data.province || !locationMap.get(data.province)?.has(data.city)) errors.city = 'شهر معتبر مربوط به همین استان را انتخاب کن.';
  if (!data.addressLine || data.addressLine.length < 10 || data.addressLine.length > 500) errors.addressLine = 'آدرس کامل باید بین ۱۰ تا ۵۰۰ کاراکتر باشد.';
  if (!/^\d{10}$/.test(data.postalCode || '')) errors.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم و فقط عدد باشد.';
  if (!/^\d{1,10}$/.test(data.buildingNumber || '')) errors.buildingNumber = 'پلاک الزامی است و باید فقط عدد باشد.';
  if (data.unit && !/^\d{1,6}$/.test(data.unit)) errors.unit = 'واحد باید فقط عدد باشد.';

  Object.entries(errors).forEach(([field, message]) => showFieldError(field, message));
  const firstField = Object.keys(errors)[0];
  if (firstField) {
    form.elements[firstField]?.focus();
    return null;
  }
  return data;
}

function applyServerErrors(error) {
  const details = Array.isArray(error.details) ? error.details : [];
  details.forEach(item => item?.field && showFieldError(String(item.field).split('.')[0], item.message || 'مقدار واردشده معتبر نیست.'));
  if (statusBox) statusBox.textContent = details.length ? 'لطفاً موارد مشخص‌شده را اصلاح کن.' : (error.message || 'ذخیره آدرس انجام نشد.');
}

function openEditor(data = null) {
  clearErrors();
  editor.hidden = false;
  cancelButton.hidden = false;
  form.dataset.id = data?._id || '';
  document.querySelector('#addressEditorTitle').textContent = data ? 'ویرایش آدرس' : 'آدرس جدید';
  form.reset();

  if (data) {
    fields.filter(key => !['province','city'].includes(key)).forEach(key => {
      if (form.elements[key]) form.elements[key].value = data[key] ?? '';
    });
    provinceSelect.value = data.province || '';
    setCities(provinceSelect.value, data.city || '');
    if (form.elements.isDefault) form.elements.isDefault.checked = Boolean(data.isDefault);
  } else {
    provinceSelect.value = '';
    setCities('');
  }
  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

provinceSelect?.addEventListener('change', () => {
  setCities(provinceSelect.value);
  showFieldError('province', '');
  document.querySelector('[data-error-for="province"]')?.setAttribute('hidden', '');
});

document.querySelector('#showAddressForm')?.addEventListener('click', () => openEditor());

cancelButton?.addEventListener('click', () => {
  form.reset();
  form.dataset.id = '';
  clearErrors();
  setCities('');
  if (document.querySelector('[data-address-card]')) editor.hidden = true;
});

document.addEventListener('click', Pawear.run(async event => {
  const edit = event.target.closest('[data-edit-address]');
  const del = event.target.closest('[data-delete-address]');
  if (edit) {
    openEditor(JSON.parse(edit.dataset.editAddress));
    return;
  }
  if (del) {
    if (!confirm('این آدرس حذف شود؟')) return;
    await Pawear.request('/api/addresses/' + del.dataset.deleteAddress, 'DELETE');
    location.reload();
  }
}));

form?.addEventListener('input', event => {
  const field = event.target.name;
  if (!field) return;
  const error = document.querySelector(`[data-error-for="${field}"]`);
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  event.target.removeAttribute('aria-invalid');
});

form?.addEventListener('submit', Pawear.run(async event => {
  const body = validateAddressForm();
  if (!body) return;
  const id = form.dataset.id;
  try {
    if (!id && !document.querySelector('[data-address-card]')) body.isDefault = true;
    await Pawear.request('/api/addresses' + (id ? '/' + id : ''), id ? 'PATCH' : 'POST', body);
    if (statusBox) statusBox.textContent = 'آدرس با موفقیت ذخیره شد.';
    location.reload();
  } catch (error) {
    applyServerErrors(error);
    throw error;
  }
}));

checkoutForm?.addEventListener('submit', Pawear.run(async event => {
  const selected = checkoutForm.querySelector('input[name="addressId"]:checked');
  const addressError = document.querySelector('[data-error-for="addressId"]');
  if (!selected) {
    addressError.textContent = 'برای ادامه یک آدرس را انتخاب کن.';
    addressError.hidden = false;
    return;
  }
  addressError.hidden = true;
  const result = await Pawear.request('/api/orders', 'POST', { addressId: selected.value });
  preparedOrder = result.data.order;
  document.querySelector('#orderPreview').hidden = false;
  document.querySelector('#orderSummary').textContent = 'جمع محصولات: ' + preparedOrder.subtotal.toLocaleString('fa-IR') + ' + ارسال: ' + preparedOrder.shippingAmount.toLocaleString('fa-IR') + ' = ' + preparedOrder.totalAmount.toLocaleString('fa-IR') + ' تومان';
}));

checkoutForm?.addEventListener('change', () => {
  preparedOrder = null;
  document.querySelector('#orderPreview').hidden = true;
  const addressError = document.querySelector('[data-error-for="addressId"]');
  if (addressError) addressError.hidden = true;
});

document.querySelector('#payOrder')?.addEventListener('click', Pawear.run(async () => {
  if (preparedOrder) await Pawear.startPayment(preparedOrder._id);
}));

if (!document.querySelector('[data-address-card]')) {
  editor.hidden = false;
  cancelButton.hidden = true;
  continueButton?.setAttribute('hidden', '');
  setCities('');
}
