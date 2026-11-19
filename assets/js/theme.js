// Theme is a per-browser preference. Database roles, checkout and Supabase remain unchanged.
const key='pop3mart_theme';
const allowed=new Set(['light','dark','system']);
let preference='light';
try {const saved=localStorage.getItem(key);if(allowed.has(saved))preference=saved;}catch(_){}
const media=window.matchMedia('(prefers-color-scheme: dark)');
function apply(pref){
  preference=allowed.has(pref)?pref:'light';
  document.documentElement.dataset.theme=preference==='system'?(media.matches?'dark':'light'):preference;
  try {localStorage.setItem(key,preference);}catch(_){}
  document.querySelectorAll('[data-theme-select]').forEach(el=>el.value=preference);
  document.querySelectorAll('[data-theme-toggle]').forEach(el=>{
     const dark=document.documentElement.dataset.theme==='dark';
     el.innerHTML=dark?'<i class="bi bi-sun" aria-hidden="true"></i>':'<i class="bi bi-moon-stars" aria-hidden="true"></i>';
     el.title=dark?'Pindah ke Light Mode':'Pindah ke Dark Mode';
     el.setAttribute('aria-label',el.title);
  });
}
media.addEventListener('change',()=>{if(preference==='system')apply('system');});
document.querySelectorAll('[data-theme-select]').forEach(el=>el.addEventListener('change',()=>apply(el.value)));
const bar=document.querySelector('.buyer-page .topbar-actions') || document.querySelector('.admin-page .topbar');
if(bar){
 const button=document.createElement('button');button.type='button';button.className='theme-quick-toggle';button.setAttribute('data-theme-toggle','');
 if(document.body.classList.contains('buyer-page'))bar.insertBefore(button,bar.firstChild);
 else {const chip=bar.querySelector('.user-chip');if(chip)bar.insertBefore(button,chip);else bar.append(button);}
 button.addEventListener('click',()=>apply(document.documentElement.dataset.theme==='dark'?'light':'dark'));
}
apply(preference);
