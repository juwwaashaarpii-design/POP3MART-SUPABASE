import {supabase} from './supabase.js';
import {requireRole,escapeHTML,rupiah,showToast} from './common.js';
const context=await requireRole('buyer');
const host=document.querySelector('#orders-list');
const dialog=document.querySelector('#proof-dialog');
const proofForm=document.querySelector('#proof-form');
let orders=[];
let linesByOrder=new Map();
const statusNames={awaiting_payment:'MENUNGGU PEMBAYARAN',under_review:'MENUNGGU VERIFIKASI',paid:'PEMBAYARAN VALID',processing:'DIPROSES',shipped:'DIKIRIM',completed:'SELESAI',cancelled:'DIBATALKAN'};
function safeImage(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function paymentInstructions(order){
 const method=order.payment_method_snapshot||{};
 const qr=safeImage(method.qris_image_url);
 return `<div class="payment-instruction"><strong>${escapeHTML(method.name||'Metode pembayaran')}</strong><p>${escapeHTML(method.instructions||'Pastikan jumlah transfer sesuai total pesanan.')}</p>${method.kind==='bank'?`<p>Bank: <strong>${escapeHTML(method.provider||'-')}</strong></p><p>Nomor: <strong class="copyable">${escapeHTML(method.account_number||'-')}</strong></p><p>Atas nama: <strong>${escapeHTML(method.account_name||'-')}</strong></p>`:qr?`<img class="qris-preview" src="${escapeHTML(qr)}" alt="QRIS merchant POP-3 MART"><p>Scan melalui aplikasi pembayaran yang mendukung QRIS. Masukkan total sesuai pesanan.</p>`:'<p>QRIS belum tersedia. Hubungi Admin.</p>'}</div>`;
}

function renderOrderedItems(order) {
 const lines=linesByOrder.get(order.id)||[];
 const details=lines.length?`<div class="order-line-list">${lines.map(item=>{
   const photo=safeImage(item.product_image_url);
   return `<div class="order-line">${photo?`<img src="${escapeHTML(photo)}" alt="${escapeHTML(item.product_name)}">`:'<span class="line-fallback"><i class="bi bi-box-seam"></i></span>'}<div><strong>${escapeHTML(item.product_name)}</strong><small>${rupiah(item.unit_price)} × ${item.quantity} = ${rupiah(item.line_total)}</small></div></div>`;
 }).join('')}</div>`
 :`<div class="order-item"><div>${safeImage(order.product_image_url)?`<img src="${escapeHTML(safeImage(order.product_image_url))}" alt="${escapeHTML(order.product_name)}">`:'<i class="bi bi-box-seam"></i>'}</div><div><strong>${rupiah(order.unit_price)} × ${order.quantity}</strong></div></div>`;
 return `${details}<p class="order-line-total">Subtotal ${rupiah(order.subtotal)} • Ongkir ${rupiah(order.shipping_fee)}</p><strong class="order-total">TOTAL ${rupiah(order.total_amount)}</strong>`;
}

function displayOrder(order){
 const status=order.order_status;
 const allowProof=status==='awaiting_payment';
 const canCancel=allowProof && ['unpaid','rejected'].includes(order.payment_status);
 const pill=`<span class="status-pill order-status status-${status}">${statusNames[status]||escapeHTML(status)}</span>`;
 return `<article class="order-card" id="order-${escapeHTML(order.id)}">
  <div class="order-heading"><div><span class="eyebrow">ORDER #${escapeHTML(order.id.slice(0,8).toUpperCase())}</span><h3>${escapeHTML(order.product_name)}</h3><small>${new Date(order.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</small></div>${pill}</div>
  ${renderOrderedItems(order)}
  <div class="order-steps"><span class="${status==='cancelled'?'step-cancel':'step-current'}">${status==='cancelled'?'Pesanan dibatalkan':'1. Order dibuat'}</span><span class="${['under_review','paid','processing','shipped','completed'].includes(status)?'step-current':''}">2. Verifikasi bayar</span><span class="${['processing','shipped','completed'].includes(status)?'step-current':''}">3. Proses</span><span class="${['shipped','completed'].includes(status)?'step-current':''}">4. Dikirim</span><span class="${status==='completed'?'step-current':''}">5. Selesai</span></div>
  ${status!=='cancelled'?`<div class="order-meta"><p><strong>Penerima/alamat:</strong> ${escapeHTML(order.shipping_address)}</p>${order.tracking_number?`<p><strong>Nomor resi:</strong> ${escapeHTML(order.tracking_number)}</p>`:''}${order.admin_note?`<p class="note-box"><strong>Catatan Admin:</strong> ${escapeHTML(order.admin_note)}</p>`:''}${order.payment_status==='rejected'?'<p class="error-note">Bukti pembayaran sebelumnya ditolak. Periksa catatan Admin dan unggah ulang bukti yang benar.</p>':''}</div>`:''}
  ${allowProof?paymentInstructions(order):''}
  ${status==='under_review'?'<p class="note-box">Bukti sudah diterima sistem. Menunggu Admin memeriksa dana masuk. Jangan membayar dua kali.</p>':''}
  ${['paid','processing','shipped','completed'].includes(status)?`<p class="success-note"><i class="bi bi-patch-check-fill"></i> Pembayaran telah diverifikasi Admin ${order.paid_at?'pada '+new Date(order.paid_at).toLocaleDateString('id-ID'):''}.</p>`:''}
  <div class="order-actions">${allowProof?`<button type="button" class="comic-btn yellow-btn" data-proof="${escapeHTML(order.id)}"><i class="bi bi-upload"></i> UPLOAD BUKTI</button>`:''}${canCancel?`<button type="button" class="comic-btn" data-cancel="${escapeHTML(order.id)}">BATALKAN ORDER</button>`:''}${order.payment_proof_path?`<button type="button" class="comic-btn blue-btn" data-view-proof="${escapeHTML(order.id)}">LIHAT BUKTI</button>`:''}</div>
 </article>`;
}
async function load(){
 if(!context)return;
 const {data,error}=await supabase.from('orders').select('*').eq('user_id',context.user.id).order('created_at',{ascending:false}).limit(100);
 if(error){host.innerHTML='<div class="empty-state">Gagal memuat pesanan. Pastikan upgrade_checkout.sql sudah dijalankan.</div>';showToast(error.message,'error');return;}
 orders=data||[];
 linesByOrder=new Map();
 if(orders.length){
  const {data:lineRows,error:lineError}=await supabase.from('order_line_items')
    .select('order_id,product_name,product_image_url,unit_price,quantity,line_total')
    .in('order_id',orders.map(o=>o.id)).order('id');
  if(lineError)showToast('Detail keranjang belum dapat dimuat: '+lineError.message,'error');
  for(const item of lineRows||[]){
   if(!linesByOrder.has(item.order_id))linesByOrder.set(item.order_id,[]);
   linesByOrder.get(item.order_id).push(item);
  }
 }
 host.innerHTML=orders.length?orders.map(displayOrder).join(''):'<div class="feature-waiting"><i class="bi bi-bag-check"></i><h3>NO ORDERS YET</h3><p>Belum ada transaksi. Mulai belanja untuk melihat pembayaran dan status pengiriman di sini.</p><a href="shop.html" class="comic-btn yellow-btn">BROWSE FIGURES</a></div>';
 const deepLink=new URLSearchParams(location.search).get('order');
 if(deepLink){document.getElementById('order-'+deepLink)?.scrollIntoView({behavior:'smooth',block:'center'});}
}
if(context)await load();
host?.addEventListener('click',async e=>{
 const proof=e.target.closest('[data-proof]');
 const cancel=e.target.closest('[data-cancel]');
 const view=e.target.closest('[data-view-proof]');
 if(proof){const order=orders.find(o=>o.id===proof.dataset.proof);if(!order)return;
  proofForm.elements.namedItem('order_id').value=order.id;
  document.querySelector('#proof-order-details').innerHTML=`<p><strong>${escapeHTML(order.product_name)}</strong> • Total <strong>${rupiah(order.total_amount)}</strong></p>${paymentInstructions(order)}`;
  dialog.showModal();
 }
 if(cancel){const id=cancel.dataset.cancel;if(!confirm('Batalkan pesanan ini? Stok produk akan dikembalikan.'))return;
  cancel.disabled=true;const {error}=await supabase.rpc('cancel_my_order',{p_order_id:id});
  if(error)showToast('Gagal membatalkan: '+error.message,'error');else{showToast('Pesanan dibatalkan.');await load();}cancel.disabled=false;
 }
 if(view){const order=orders.find(o=>o.id===view.dataset.viewProof);if(!order?.payment_proof_path)return;
  const {data,error}=await supabase.storage.from('payment-proofs').createSignedUrl(order.payment_proof_path,120);
  if(error)showToast('Gagal membuka bukti: '+error.message,'error');else window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }
});
document.querySelector('#close-proof-dialog')?.addEventListener('click',()=>dialog.close());
proofForm?.addEventListener('submit',async e=>{
 e.preventDefault();if(!context)return;
 const file=proofForm.elements.namedItem('payment_proof').files[0];
 const orderId=proofForm.elements.namedItem('order_id').value;
 if(!file || !['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)||file.size>5242880)return showToast('Pilih bukti berupa PDF/JPG/PNG/WEBP maks. 5 MB.','error');
 const button=proofForm.querySelector('button[type="submit"]');button.disabled=true;
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[file.type];
 const path=`${context.user.id}/${orderId}/${crypto.randomUUID()}.${ext}`;
 try{
  const {error:uploadError}=await supabase.storage.from('payment-proofs').upload(path,file,{cacheControl:'60',upsert:false,contentType:file.type});
  if(uploadError)throw uploadError;
  const {error}=await supabase.rpc('submit_payment_proof',{p_order_id:orderId,p_storage_path:path,p_reference:proofForm.elements.namedItem('payment_reference').value.trim()});
  if(error)throw error;
  dialog.close();proofForm.reset();showToast('Bukti terkirim. Menunggu verifikasi Admin.');await load();
 }catch(error){showToast('Gagal mengunggah bukti: '+error.message,'error');}
 finally{button.disabled=false;}
});
