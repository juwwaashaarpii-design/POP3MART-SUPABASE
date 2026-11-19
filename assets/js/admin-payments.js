import {supabase} from './supabase.js';
import {requireRole,escapeHTML,rupiah,showToast} from './common.js';
const context=await requireRole('admin');
const methodDialog=document.querySelector('#method-dialog');
const methodForm=document.querySelector('#method-form');
const methodsHost=document.querySelector('#methods-list');
const ordersHost=document.querySelector('#admin-orders');
let methods=[];let orders=[];let linesByOrder=new Map();
const cartStyles=document.createElement('link');cartStyles.rel='stylesheet';cartStyles.href='../assets/css/cart-update.css?v=2';document.head.appendChild(cartStyles);
const statuses={awaiting_payment:'MENUNGGU BAYAR',under_review:'PERIKSA BUKTI',paid:'TERBAYAR',processing:'DIPROSES',shipped:'DIKIRIM',completed:'SELESAI',cancelled:'DIBATALKAN'};
function imageUrl(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function formInput(name){return methodForm.elements.namedItem(name);}
function showMethodType(){const qris= formInput('kind').value==='qris';
 document.querySelectorAll('.method-bank').forEach(el=>el.hidden=qris);
 document.querySelectorAll('.method-qris').forEach(el=>el.hidden=!qris);
}
function resetForm(){methodForm.reset();formInput('method_id').value='';document.querySelector('#method-dialog-title').textContent='TAMBAH METODE PEMBAYARAN';document.querySelector('#qris_preview').hidden=true;showMethodType();}
async function loadMethods(){
 const {data,error}=await supabase.from('payment_methods').select('*').order('created_at',{ascending:false});
 if(error){methodsHost.innerHTML='<div class="empty-state">Jalankan upgrade_checkout.sql terlebih dahulu.</div>';showToast('Gagal memuat pembayaran: '+error.message,'error');return;}
 methods=data||[];
 methodsHost.innerHTML=methods.length?methods.map(m=>`<article class="payment-method-card">
 <div class="method-badge"><i class="bi ${m.kind==='qris'?'bi-qr-code':'bi-bank'}"></i></div>
 <div><h3>${escapeHTML(m.name)}</h3><p>${escapeHTML(m.provider)}</p><p>${m.kind==='bank'?`No. ${escapeHTML(m.account_number||'-')} • ${escapeHTML(m.account_name||'-')}`:'QRIS Merchant'}</p><span class="status-pill ${m.is_active?'status-active':'status-hidden'}">${m.is_active?'Aktif':'Nonaktif'}</span></div>
 ${imageUrl(m.qris_image_url)?`<img class="method-thumb" src="${escapeHTML(imageUrl(m.qris_image_url))}" alt="QRIS">`:''}
 <div class="method-buttons"><button class="small-btn" data-method-edit="${m.id}">EDIT</button><button class="small-btn danger-btn" data-method-delete="${m.id}">HAPUS</button></div></article>`).join(''):'<div class="empty-state">Belum ada metode pembayaran. Tambahkan rekening bank atau QRIS merchant terlebih dahulu.</div>';
}
function orderActions(order){const s=order.order_status;
 if(s==='under_review')return `<button class="comic-btn yellow-btn" data-action="approve" data-id="${order.id}">SETUJUI BAYAR</button><button class="comic-btn" data-action="reject" data-id="${order.id}">TOLAK BUKTI</button>`;
 if(s==='paid')return `<button class="comic-btn yellow-btn" data-action="process" data-id="${order.id}">PROSES PESANAN</button>`;
 if(s==='processing')return `<button class="comic-btn yellow-btn" data-action="ship" data-id="${order.id}">MASUKKAN RESI & KIRIM</button>`;
 if(s==='shipped')return `<button class="comic-btn yellow-btn" data-action="complete" data-id="${order.id}">TANDAI SELESAI</button>`;
 return '';
}
function renderAdminOrderLines(order){
 const rows=linesByOrder.get(order.id)||[];
 return rows.length?`<div class="admin-order-lines"><strong>FIGURES DALAM PESANAN:</strong><ul>${rows.map(r=>`<li>${escapeHTML(r.product_name)} • ${r.quantity} × ${rupiah(r.unit_price)} = ${rupiah(r.line_total)}</li>`).join('')}</ul></div>`:'';
}
function orderCard(order){
 const user=order.profiles||{};
 return `<article class="order-card"><div class="order-heading"><div><span class="eyebrow">#${escapeHTML(order.id.slice(0,8).toUpperCase())} • ${new Date(order.created_at).toLocaleString('id-ID')}</span><h3>${escapeHTML(order.product_name)} × ${order.quantity}</h3><p>Buyer: <strong>${escapeHTML(user.full_name||user.email||order.user_id)}</strong> ${user.email?`(${escapeHTML(user.email)})`:''}</p></div><span class="status-pill order-status status-${order.order_status}">${statuses[order.order_status]||escapeHTML(order.order_status)}</span></div>
 ${renderAdminOrderLines(order)}
 <div class="order-meta"><p>Total: <strong class="order-total">${rupiah(order.total_amount)}</strong> • ${escapeHTML(order.payment_method_snapshot?.name||'')}</p><p><strong>Alamat:</strong> ${escapeHTML(order.shipping_address)}</p><p><strong>Payment status:</strong> ${escapeHTML(order.payment_status)} ${order.payment_reference?' • Referensi: '+escapeHTML(order.payment_reference):''}</p>${order.tracking_number?`<p><strong>Resi:</strong> ${escapeHTML(order.tracking_number)}</p>`:''}${order.admin_note?`<p><strong>Catatan:</strong> ${escapeHTML(order.admin_note)}</p>`:''}</div>
 <div class="order-actions">${order.payment_proof_path?`<button class="comic-btn blue-btn" data-proof-view="${order.id}">LIHAT BUKTI BAYAR</button>`:''}${orderActions(order)}${['awaiting_payment','under_review','paid','processing'].includes(order.order_status)?`<button class="comic-btn" data-action="cancel" data-id="${order.id}">BATALKAN</button>`:''}</div></article>`;
}
async function loadOrders(){
 const {data,error}=await supabase.from('orders').select('*,profiles(full_name,email)').order('created_at',{ascending:false}).limit(150);
 if(error){ordersHost.innerHTML='<div class="empty-state">Gagal memuat pesanan. Jalankan upgrade_checkout.sql.</div>';showToast(error.message,'error');return;}
 orders=data||[];
 linesByOrder=new Map();
 if(orders.length){
   const {data:lineRows,error:lineError}=await supabase.from('order_line_items')
     .select('order_id,product_name,unit_price,quantity,line_total').in('order_id',orders.map(o=>o.id)).order('id');
   if(lineError)showToast('Gagal membaca rincian keranjang: '+lineError.message,'error');
   for(const item of lineRows||[]){
     if(!linesByOrder.has(item.order_id))linesByOrder.set(item.order_id,[]);
     linesByOrder.get(item.order_id).push(item);
   }
 }
 renderOrders();
 const [review,unpaid,paid,processing,complete]=await Promise.all([
  supabase.from('orders').select('id',{count:'exact',head:true}).eq('order_status','under_review'),
  supabase.from('orders').select('id',{count:'exact',head:true}).eq('order_status','awaiting_payment'),
  supabase.from('orders').select('id',{count:'exact',head:true}).eq('order_status','paid'),
  supabase.from('orders').select('id',{count:'exact',head:true}).eq('order_status','processing'),
  supabase.from('orders').select('id',{count:'exact',head:true}).eq('order_status','completed')
 ]);
 document.querySelector('#stat-review').textContent=review.count??0;
 document.querySelector('#stat-unpaid').textContent=unpaid.count??0;
 document.querySelector('#stat-shipping').textContent=(paid.count??0)+(processing.count??0);
 document.querySelector('#stat-complete').textContent=complete.count??0;
}
function renderOrders(){
 const filter=document.querySelector('#order-status-filter').value;
 const list=orders.filter(o=>!filter||o.order_status===filter);
 ordersHost.innerHTML=list.length?list.map(orderCard).join(''):'<div class="empty-state">Tidak ada order pada status yang dipilih.</div>';
}
if(context){await Promise.all([loadMethods(),loadOrders()]);}
document.querySelector('#new-method')?.addEventListener('click',()=>{resetForm();methodDialog.showModal();});
document.querySelector('#close-method')?.addEventListener('click',()=>methodDialog.close());
formInput('kind')?.addEventListener('change',showMethodType);
methodsHost?.addEventListener('click',async e=>{
 const edit=e.target.closest('[data-method-edit]');const del=e.target.closest('[data-method-delete]');
 if(edit){const m=methods.find(m=>String(m.id)===edit.dataset.methodEdit);if(!m)return;
  resetForm();
  for(const key of ['name','kind','provider','account_name','account_number','instructions'])formInput(key).value=m[key]||'';
  formInput('method_id').value=m.id;formInput('is_active').checked=!!m.is_active;
  const pic=document.querySelector('#qris_preview');if(imageUrl(m.qris_image_url)){pic.src=imageUrl(m.qris_image_url);pic.hidden=false;}
  document.querySelector('#method-dialog-title').textContent='EDIT METODE PEMBAYARAN';showMethodType();methodDialog.showModal();
 }
 if(del){const m=methods.find(m=>String(m.id)===del.dataset.methodDelete);if(!m||!confirm(`Hapus ${m.name}? Pesanan lama tetap menyimpan informasi metode saat checkout.`))return;
  del.disabled=true;const {error}=await supabase.from('payment_methods').delete().eq('id',m.id);
  if(error)showToast('Gagal menghapus: '+error.message,'error');else{showToast('Metode pembayaran dihapus.');await loadMethods();}del.disabled=false;
 }
});
methodForm?.addEventListener('submit',async e=>{
 e.preventDefault();if(!context)return;
 const button=methodForm.querySelector('button[type=submit]');button.disabled=true;
 try{
  const get=key=>formInput(key).value.trim();
  const kind=get('kind');const id=get('method_id');
  const old=methods.find(m=>String(m.id)===id);
  const payload={name:get('name'),kind,provider:get('provider'),account_name:get('account_name'),account_number:get('account_number'),instructions:get('instructions'),is_active:formInput('is_active').checked,updated_at:new Date().toISOString(),qris_image_url:old?.qris_image_url||''};
  const file=formInput('qris_file').files[0];
  if(kind==='qris'&&file){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880)throw new Error('Gambar QRIS JPG/PNG/WEBP maksimum 5MB.');
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
    const path=`payment-methods/${crypto.randomUUID()}.${ext}`;
    const {error}=await supabase.storage.from('product-images').upload(path,file,{cacheControl:'3600',contentType:file.type});
    if(error)throw error;
    payload.qris_image_url=supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }
  if(kind==='bank')payload.qris_image_url='';
  if(payload.is_active && ((kind==='bank'&&(!payload.account_name||!payload.account_number))||(kind==='qris'&&!payload.qris_image_url)))throw new Error('Lengkapi nomor & nama rekening atau upload QRIS sebelum metode diaktifkan.');
  const {error}=id?await supabase.from('payment_methods').update(payload).eq('id',Number(id)):await supabase.from('payment_methods').insert(payload);
  if(error)throw error;
  showToast('Metode pembayaran tersimpan.');methodDialog.close();await loadMethods();
 }catch(err){showToast('Gagal menyimpan metode: '+err.message,'error');}finally{button.disabled=false;}
});
document.querySelector('#order-status-filter')?.addEventListener('change',renderOrders);
document.querySelector('#refresh-orders')?.addEventListener('click',loadOrders);
ordersHost?.addEventListener('click',async e=>{
 const view=e.target.closest('[data-proof-view]');
 if(view){const order=orders.find(o=>o.id===view.dataset.proofView);if(!order?.payment_proof_path)return;
  const {data,error}=await supabase.storage.from('payment-proofs').createSignedUrl(order.payment_proof_path,120);
  if(error)showToast('Gagal membuka bukti: '+error.message,'error');else window.open(data.signedUrl,'_blank','noopener,noreferrer');return;
 }
 const button=e.target.closest('[data-action]');if(!button)return;
 const id=button.dataset.id,action=button.dataset.action;
 const order=orders.find(o=>o.id===id);if(!order)return;
 let note='',tracking='';
 if(action==='approve'&&!confirm('Pastikan uang BENAR-BENAR MASUK ke rekening/QRIS merchant dan nominal cocok. Setujui pembayaran?'))return;
 if(action==='reject'){const reason=prompt('Alasan bukti ditolak (wajib isi):');if(reason===null)return;if(!reason.trim())return showToast('Tulis alasan penolakan.','error');note=reason.trim();}
 if(action==='ship'){const input=prompt('Masukkan nomor resi pengiriman:');if(input===null)return;tracking=input.trim();if(tracking.length<3)return showToast('Nomor resi minimal 3 karakter.','error');}
 if(action==='cancel'){if(!confirm('Batalkan pesanan? Stok akan dikembalikan. Jika uang sudah diterima, refund harus ditangani manual!'))return;note=prompt('Alasan pembatalan untuk buyer (opsional):')||'';}
 if(['process','complete'].includes(action)&&!confirm(`Yakin ingin ${action==='process'?'memproses':'menyelesaikan'} order ini?`))return;
 button.disabled=true;
 const {error}=await supabase.rpc('admin_update_order',{p_order_id:id,p_action:action,p_note:note,p_tracking_number:tracking});
 if(error){showToast('Gagal mengubah status: '+error.message,'error');button.disabled=false;}
 else{showToast('Status pesanan diperbarui!');await loadOrders();}
});
