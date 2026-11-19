import {requireRole,escapeHTML,rupiah,showToast} from './common.js';
import {getCart,setCartQuantity,removeFromCart} from './cart-api.js';
const context=await requireRole('buyer');
const host=document.querySelector('#cart-items');
const summary=document.querySelector('#cart-summary');
let rows=[];
function safeImage(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function render(){
  const count=rows.reduce((s,r)=>s+Number(r.quantity),0);
  const subtotal=rows.reduce((s,r)=>s+Number(r.quantity)*Number(r.products?.price||0),0);
  document.querySelector('#cart-count-label').textContent=`${rows.length} jenis figure • ${count} item`;
  if(!rows.length){
    host.innerHTML='<div class="feature-waiting"><i class="bi bi-cart3"></i><h3>CART IS EMPTY</h3><p>Keranjang masih kosong. Yuk, pilih figure favoritmu!</p><a class="comic-btn yellow-btn" href="shop.html">EXPLORE FIGURES</a></div>';
    summary.hidden=true;return;
  }
  const problems=[];
  host.innerHTML=rows.map(r=>{
    const p=r.products;
    const id=Number(r.product_id);
    const available=!!p?.is_active && Number(p.stock)>0;
    const tooMany=Number(r.quantity)>Number(p?.stock||0);
    if(!available||tooMany)problems.push(id);
    const photo=safeImage(p?.image_url);
    return `<article class="cart-item" data-cart-item="${id}">
      ${photo?`<img class="cart-item-image" loading="lazy" src="${escapeHTML(photo)}" alt="${escapeHTML(p?.name||'Figure')}">`:'<div class="cart-item-image cart-item-placeholder"><i class="bi bi-box-seam"></i></div>'}
      <div class="cart-item-details"><span class="eyebrow">${escapeHTML(p?.category||'Collectible')}</span><h3>${escapeHTML(p?.name||'Figure tidak tersedia')}</h3><strong>${rupiah(p?.price||0)}</strong><p>Total: ${rupiah(Number(p?.price||0)*r.quantity)}</p>${(!available||tooMany)?`<p class="cart-warning">${!available?'Figure tidak lagi tersedia.':'Stok sekarang hanya '+p.stock+'. Kurangi jumlahnya.'}</p>`:''}</div>
      <div class="cart-item-controls"><div class="cart-qty-controls"><button type="button" data-cart-qty="-1" data-product="${id}" aria-label="Kurangi jumlah" ${r.quantity<=1||!available?'disabled':''}>−</button><output aria-label="Jumlah produk">${r.quantity}</output><button type="button" data-cart-qty="1" data-product="${id}" aria-label="Tambah jumlah" ${!available||r.quantity>=Math.min(20,Number(p.stock))?'disabled':''}>+</button></div><button type="button" class="cart-remove" data-cart-remove="${id}"><i class="bi bi-trash"></i> REMOVE</button></div>
    </article>`;
  }).join('');
  summary.hidden=false;
  document.querySelector('#cart-total').textContent=rupiah(subtotal);
  const checkout=document.querySelector('#cart-checkout');
  const blocked=problems.length>0||count>20;
  checkout.setAttribute('aria-disabled',String(blocked));
  checkout.title=count>20?'Maksimal 20 figure untuk satu pesanan':problems.length?'Perbaiki jumlah dan produk tidak tersedia':'Lanjut ke checkout';
  if(count>20)host.insertAdjacentHTML('beforeend','<p class="cart-warning">Maksimal 20 figure per checkout. Kurangi beberapa item dahulu.</p>');
}
async function load(){
  if(!context)return;
  try{rows=await getCart(context.user.id);render();}
  catch(error){host.innerHTML='<div class="empty-state">Gagal memuat keranjang. Pastikan SQL upgrade_cart.sql sudah dijalankan.</div>';showToast(error.message,'error');}
}
if(context)await load();
host?.addEventListener('click',async e=>{
  if(!context)return;
  const minusPlus=e.target.closest('[data-cart-qty]');
  const remove=e.target.closest('[data-cart-remove]');
  const button=minusPlus||remove;
  if(!button||button.disabled)return;
  button.disabled=true;
  try{
    if(remove){await removeFromCart(context.user.id,Number(remove.dataset.cartRemove));showToast('Figure dihapus dari keranjang.');}
    else{
      const row=rows.find(r=>Number(r.product_id)===Number(minusPlus.dataset.product));
      if(!row)return;
      await setCartQuantity(context.user.id,Number(row.product_id),Number(row.quantity)+Number(minusPlus.dataset.cartQty));
    }
    await load();
  }catch(error){showToast('Keranjang gagal diperbarui: '+error.message,'error');button.disabled=false;}
});
document.querySelector('#cart-checkout')?.addEventListener('click',e=>{
  if(e.currentTarget.getAttribute('aria-disabled')==='true'){e.preventDefault();showToast('Perbaiki stok/jumlah keranjang sebelum checkout (maksimal 20 figure).','error');}
});
