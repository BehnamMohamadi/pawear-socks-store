document.querySelector('#newPasswordForm').addEventListener('submit',Pawear.run(async event=>{
  const body=Pawear.formData(event.currentTarget);
  if(body.password!==body.confirmPassword)throw new Error('تکرار رمز با رمز جدید یکسان نیست.');
  await Pawear.request('/api/auth/password','PUT',{password:body.password});
  Pawear.redirectAfterLogin();
}));
