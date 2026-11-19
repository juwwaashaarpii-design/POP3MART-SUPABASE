// Toggle show/hide password: keyboard accessible, applies to Login and Register.
document.querySelectorAll('input[type="password"]').forEach(input => {
  const wrap = document.createElement('div');
  wrap.className = 'password-input-wrap';
  input.parentNode.insertBefore(wrap,input);
  wrap.appendChild(input);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-eye';
  toggle.setAttribute('aria-label','Tampilkan password');
  toggle.setAttribute('aria-pressed','false');
  toggle.innerHTML = '<i class="bi bi-eye" aria-hidden="true"></i>';
  toggle.addEventListener('click',() => {
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    toggle.innerHTML = `<i class="bi bi-eye${showing ? '-slash' : ''}" aria-hidden="true"></i>`;
    toggle.setAttribute('aria-label',showing?'Sembunyikan password':'Tampilkan password');
    toggle.setAttribute('aria-pressed',String(showing));
    input.focus({preventScroll:true});
  });
  wrap.appendChild(toggle);
});
