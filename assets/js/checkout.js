import {supabase} from './supabase.js';
import {requireRole,escapeHTML,rupiah,showToast} from './common.js';
import {getCart,cartChanged} from './cart-api.js';
const context=await requireRole('buyer');
const params=new URLSearchParams(location.search);
const isCart=params.get('cart')==='1';
const productId=Number(params.get('product'));
const form=document.querySelector('#checkout-form');
const methodEl=document.querySelector('#payment_method');
const quantityEl=document.querySelector('#quantity');
const checkoutProduct=document.querySelector('#checkout-product');
const submit=form.querySelector('button[type=submit]');
let product=null,cart=[],fee=0,methods=[],checkoutReady=false;
function safeImage(raw){try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}
function subtotal(){return isCart?cart.reduce((n,r)=>n+Number(r.quantity)*Number(r.products?.price||0),0):Number(product?.price||0)*Number(quantityEl.value||0);}
function updateTotals(){
  document.querySelector('#subtotal').textContent=rupiah(subtotal());
  document.querySelector('#shipping-fee').textContent=rupiah(fee);
  document.querySelector('#grand-total').textContent=rupiah(subtotal()+fee);
}
function showMethod(){
  const method=methods.find(m=>String(m.id)===methodEl.value);
  const el=document.querySelector('#checkout-payment-hint');
  if(!method){el.textContent='Pilih metode untuk melihat instruksi pembayaran.';return;}
  const photo=method.kind==='qris'&&safeImage(method.qris_image_url)?`<img class="qris-preview" src="${escapeHTML(safeImage(method.qris_image_url))}" alt="QRIS merchant">`:'';
  el.innerHTML=`<strong>${escapeHTML(method.name)}</strong><p>${escapeHTML(method.instructions||'Instruksi akan diberikan setelah membuat pesanan.')}</p>${photo}`;
}
function renderCart(){
  const totalItems=cart.reduce((n,r)=>n+Number(r.quantity),0);
  const invalid=cart.some(r=>!r.products?.is_active||!r.products?.stock||Number(r.products.stock)<Number(r.quantity));
  checkoutReady=cart.length>0&&totalItems<=20&&!invalid;
  document.querySelector('#checkout-subtitle').textContent='Beberapa figure dalam satu pesanan • Ongkir sekali • Bukti bayar diverifikasi Admin';
  document.querySelector('#checkout-quantity-field').hidden=true;
  document.querySelector('#checkout-back').href='cart.html';
  checkoutProduct.innerHTML=cart.length?`<div class="checkout-cart-list">${cart.map(r=>{
    const p=r.products||{};
    const photo=safeImage(p.image_url);
    return `<div class="checkout-cart-row">${photo?`<img src="${escapeHTML(photo)}" alt="${escapeHTML(p.name||'Figure')}">`:'<div class="product-placeholder"><i class="bi bi-box-seam"></i></div>'}<div><h3>${escapeHTML(p.name||'Figure tidak tersedia')}</h3><p>${r.quantity} × ${rupiah(p.price)}</p><strong>${rupiah(Number(r.quantity)*Number(p.price||0))}</strong></div></div>`;
  }).join('')}</div>`:'<div class="empty-state">Keranjang kosong. <a href="cart.html">Kembali ke keranjang</a>.</div>';
  if(!checkoutReady){showToast('Cek isi keranjang, stok figure, dan batas 20 item sebelum checkout.','error');}
}
if(context){
  const [mr,sr]=await Promise.all([
    supabase.from('payment_methods').select('id,name,kind,provider,instructions,qris_image_url').eq('is_active',true).order('name'),
    supabase.from('store_settings').select('shipping_fee').eq('id',1).maybeSingle()
  ]);
  if(mr.error)showToast('Gagal memuat pembayaran: '+mr.error.message,'error');
  if(sr.error)showToast('Gagal memuat ongkir: '+sr.error.message,'error');
  methods=mr.data||[];
  fee=Number(sr.data?.shipping_fee||0);
  if(isCart){
    try{cart=await getCart(context.user.id);renderCart();}
    catch(error){checkoutProduct.innerHTML='<div class="empty-state">Keranjang belum tersedia. Jalankan SQL upgrade_cart.sql.</div>';showToast(error.message,'error');}
  }else if(!Number.isSafeInteger(productId)||productId<1){
    checkoutProduct.innerHTML='<div class="empty-state">Pilih figure dari katalog.</div>';
    showToast('Produk tidak ditemukan.','error');
  }else{
    const {data,error}=await supabase.from('products').select('id,name,category,description,price,stock,image_url').eq('id',productId).eq('is_active',true).maybeSingle();
    product=data;
    if(error||!product){checkoutProduct.innerHTML='<div class="empty-state">Produk tidak tersedia.</div>';showToast(error?.message||'Produk tidak ditemukan.','error');}
    else{
      const photo=safeImage(product.image_url);
      checkoutProduct.innerHTML=`${photo?`<img src="${escapeHTML(photo)}" alt="${escapeHTML(product.name)}">`:'<div class="product-placeholder">FIGURE</div>'}<h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.category)}</p><strong class="checkout-price">${rupiah(product.price)}</strong><p>Stok: ${Number(product.stock)}</p>`;
      quantityEl.max=Math.min(20,Number(product.stock));
      checkoutReady=Number(product.stock)>0;
      if(!checkoutReady)showToast('Produk sedang habis.','error');
    }
  }
  methodEl.innerHTML='<option value="">Pilih metode pembayaran...</option>'+methods.map(m=>`<option value="${m.id}">${escapeHTML(m.name)} (${m.kind==='qris'?'QRIS':'Bank'})</option>`).join('');
  if(!methods.length)showToast('Admin belum mengaktifkan metode pembayaran.','error');
  document.querySelector('#shipping_address').value=context.profile.address||'';
  submit.disabled=!checkoutReady||!methods.length;
  updateTotals();
}
quantityEl?.addEventListener('input',updateTotals);
methodEl?.addEventListener('change',showMethod);
form?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!context||!checkoutReady)return;
  const methodId=Number(methodEl.value);
  if(!methods.some(m=>m.id===methodId))return showToast('Pilih metode pembayaran.','error');
  const address=form.elements.namedItem('shipping_address').value.trim();
  if(address.length<10)return showToast('Lengkapi alamat pengiriman.','error');
  const qty=Number(quantityEl.value);
  if(!isCart&&(!Number.isSafeInteger(qty)||qty<1||qty>Math.min(20,Number(product.stock))))return showToast('Jumlah melebihi stok.','error');
  submit.disabled=true;
  try{
    const {data,error}=isCart
      ? await supabase.rpc('place_cart_order',{p_payment_method_id:methodId,p_shipping_address:address})
      : await supabase.rpc('place_order',{p_product_id:product.id,p_quantity:qty,p_payment_method_id:methodId,p_shipping_address:address});
    if(error)throw error;
    if(isCart)cartChanged();
    location.href=`orders.html?order=${encodeURIComponent(data)}`;
  }catch(error){showToast('Checkout gagal: '+error.message,'error');submit.disabled=false;}
});
