import { supabase } from "./supabase.js";
import { requireRole, showToast } from "./common.js";
import { addToCart } from "./cart-api.js";

// Buyer layout UX. All data still comes from Supabase, not from demo localStorage.
const context = await requireRole("buyer");
if (context) {
  // Keranjang Buyer ditampilkan otomatis pada semua halaman lama tanpa perlu mengganti tiap HTML.
  const cartStyle=document.createElement('link');
  cartStyle.rel='stylesheet';
  cartStyle.href='../assets/css/cart-update.css?v=2';
  document.head.appendChild(cartStyle);
  const shopLink=document.querySelector('.sidebar a[href="shop.html"]');
  const cartNav=document.createElement('a');
  cartNav.href='cart.html';
  cartNav.className='nav-link cart-nav-link';
  cartNav.innerHTML='<i aria-hidden="true" class="bi bi-cart3"></i><span>My Cart</span><span class="cart-count-badge" data-cart-count>0</span>';
  shopLink?.after(cartNav);
  if(document.body.dataset.page==='cart') {
    document.querySelectorAll('.sidebar .nav-link.active').forEach(el=>{el.classList.remove('active');el.removeAttribute('aria-current');});
    cartNav.classList.add('active');cartNav.setAttribute('aria-current','page');
  }
  const actions=document.querySelector('.topbar-actions');
  if(actions){
    const cartTop=document.createElement('a');
    cartTop.href='cart.html';cartTop.className='cart-topbar-link';
    cartTop.title='Buka keranjang belanja';
    cartTop.setAttribute('aria-label','Buka keranjang belanja');
    cartTop.innerHTML='<i class="bi bi-cart3" aria-hidden="true"></i><span class="cart-count-badge" data-cart-count>0</span>';
    actions.prepend(cartTop);
  }
  async function refreshCartBadge(){
    const {data,error}=await supabase.from('cart_items').select('quantity').eq('user_id',context.user.id);
    if(error)return;
    const count=(data||[]).reduce((n,item)=>n+Number(item.quantity||0),0);
    document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=String(count));
  }
  window.addEventListener('pop3mart:cart-changed',refreshCartBadge);
  void refreshCartBadge();
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-add-cart]');
    if(!button||button.disabled)return;
    const id=Number(button.dataset.addCart);
    button.disabled=true;
    const before=button.innerHTML;
    try{
      await addToCart(context.user.id,id,1);
      showToast('Figure masuk keranjang! Klik ikon keranjang untuk melihatnya.');
      button.innerHTML='<i class="bi bi-check2-circle"></i> ADDED!';
      window.setTimeout(()=>{if(button.isConnected)button.innerHTML=before;},1100);
    }catch(error){showToast('Gagal menambah keranjang: '+error.message,'error');}
    finally{button.disabled=false;}
  });

  // Hamburger: desktop collapses sidebar; mobile opens a full menu overlay.
  const sidebar = document.getElementById("siteSidebar");
  const scrim = document.getElementById("sidebar-scrim");
  const toggle = document.getElementById("menuToggle");
  const desktop = window.matchMedia("(min-width: 621px)");
  let collapsed = false;
  try { collapsed = localStorage.getItem("pop3mart_buyer_sidebar") === "collapsed"; } catch (_) {}
  function reflectMenu() {
    if (desktop.matches) {
      document.body.classList.toggle("sidebar-collapsed", collapsed);
      sidebar?.classList.remove("menu-open");
      if(scrim) scrim.hidden = true;
      toggle?.setAttribute("aria-expanded", String(!collapsed));
      toggle?.setAttribute("aria-label", collapsed ? "Perluas sidebar" : "Ringkas sidebar");
    } else {
      document.body.classList.remove("sidebar-collapsed");
      const open = Boolean(sidebar?.classList.contains("menu-open"));
      if(scrim) scrim.hidden = !open;
      toggle?.setAttribute("aria-expanded", String(open));
      toggle?.setAttribute("aria-label", open ? "Tutup sidebar" : "Buka sidebar");
    }
  }
  toggle?.addEventListener("click", () => {
    if (desktop.matches) {
      collapsed = !collapsed;
      try { localStorage.setItem("pop3mart_buyer_sidebar", collapsed ? "collapsed" : "expanded"); } catch (_) {}
    } else sidebar?.classList.toggle("menu-open");
    reflectMenu();
  });
  scrim?.addEventListener("click", () => {sidebar?.classList.remove("menu-open");reflectMenu();});
  desktop.addEventListener("change", reflectMenu);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      sidebar?.classList.remove("menu-open");reflectMenu();
      if (notice) notice.hidden = true;
      noticeToggle?.setAttribute("aria-expanded", "false");
    }
  });
  sidebar?.querySelectorAll(".nav-link").forEach(a=>{a.title=a.textContent.trim();});
  reflectMenu();

  const params = new URLSearchParams(location.search);
  const form = document.getElementById("global-search-form");
  const search = document.getElementById("globalSearch");
  if (search && document.body.dataset.page === "shop" && params.get("q")) search.value = params.get("q");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    location.href = `shop.html?q=${encodeURIComponent(search?.value.trim() || "")}`;
  });

  const noticeToggle = document.getElementById("notice-toggle");
  const notice = document.getElementById("notice-popover");
  noticeToggle?.addEventListener("click", () => {
    notice.hidden = !notice.hidden;
    noticeToggle.setAttribute("aria-expanded", String(!notice.hidden));
  });
  document.addEventListener("click", (event) => {
    if (notice && !notice.hidden && !event.target.closest(".notice-wrap")) {
      notice.hidden = true;
      noticeToggle?.setAttribute("aria-expanded", "false");
    }
  });

  const { data, error } = await supabase.from("store_settings")
    .select("announcement,instagram_url,facebook_url,tiktok_url,x_url")
    .eq("id", 1).maybeSingle();
  const announcement = document.getElementById("store-announcement");
  if (announcement) announcement.textContent = error ? "Pengumuman belum dapat dimuat." : (data?.announcement?.trim() || "Belum ada pengumuman dari toko.");

  const socialMap = {Instagram:'instagram_url',Facebook:'facebook_url',TikTok:'tiktok_url',X:'x_url'};
  const allowedHosts={Instagram:['instagram.com'],Facebook:['facebook.com','fb.com'],TikTok:['tiktok.com'],X:['x.com','twitter.com']};
  let socialCount=0;
  document.querySelectorAll('[data-social]').forEach(button=>{
    const name=button.dataset.social;
    const raw=data?.[socialMap[name]]||'';
    let safeUrl=null;
    try{
      const url=new URL(raw);
      if(url.protocol==='https:'&&allowedHosts[name]?.some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))safeUrl=url.href;
    }catch{/* Not configured */}
    if(safeUrl){
      socialCount++;
      button.title=`Buka ${name} POP-3 MART`;
      button.addEventListener('click',()=>window.open(safeUrl,'_blank','noopener,noreferrer'));
    }else{
      button.title=`${name} belum diatur Admin`;
      button.addEventListener('click',()=>showToast(`Akun ${name} belum diatur oleh Admin.`,'error'));
    }
  });
  document.querySelectorAll('.social-footnote').forEach(el=>el.textContent=socialCount?'Ikuti akun resmi toko kami.':'Akun media sosial belum ditautkan.');

  try {
    if (localStorage.getItem("pop3mart_compact") === "1") document.body.classList.add("compact-cards");
    if (localStorage.getItem("pop3mart_reduce_motion") === "1") document.body.classList.add("reduce-animations");
  } catch (_) { /* Preferences are optional when storage is blocked. */ }
}
