// POP-3 MART: collapsible admin navigation (desktop) + overlay navigation (mobile).
const sidebar=document.querySelector('.admin-page .sidebar');
const topbar=document.querySelector('.admin-page .topbar');
if(sidebar&&topbar){
 sidebar.id='adminSidebar';
 const button=document.createElement('button');
 button.type='button';button.className='admin-menu-toggle';
 button.setAttribute('aria-controls','adminSidebar');
 button.innerHTML='<i class="bi bi-list" aria-hidden="true"></i>';
 topbar.prepend(button);
 const scrim=document.createElement('div');scrim.className='admin-menu-scrim';scrim.hidden=true;document.body.append(scrim);
 const desktop=window.matchMedia('(min-width:621px)');
 let collapsed=false;
 try {collapsed=localStorage.getItem('pop3mart_admin_sidebar')==='collapsed';}catch(_){}
 function reflect(){
   if(desktop.matches){
     document.body.classList.toggle('sidebar-collapsed',collapsed);
     sidebar.classList.remove('menu-open');scrim.hidden=true;
     button.setAttribute('aria-expanded',String(!collapsed));
     button.setAttribute('aria-label',collapsed?'Perluas sidebar Admin':'Ringkas sidebar Admin');
   } else {
     document.body.classList.remove('sidebar-collapsed');
     const open=sidebar.classList.contains('menu-open');scrim.hidden=!open;
     button.setAttribute('aria-expanded',String(open));
     button.setAttribute('aria-label',open?'Tutup sidebar Admin':'Buka sidebar Admin');
   }
 }
 button.addEventListener('click',()=>{
   if(desktop.matches){collapsed=!collapsed;try{localStorage.setItem('pop3mart_admin_sidebar',collapsed?'collapsed':'expanded');}catch(_){}}
   else sidebar.classList.toggle('menu-open');
   reflect();
 });
 scrim.addEventListener('click',()=>{sidebar.classList.remove('menu-open');reflect();});
 desktop.addEventListener('change',reflect);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){sidebar.classList.remove('menu-open');reflect();}});
 sidebar.querySelectorAll('.nav-link').forEach(a=>a.title=a.textContent.trim());
 reflect();
}
