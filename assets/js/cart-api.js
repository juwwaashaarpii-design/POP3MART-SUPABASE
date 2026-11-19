import {supabase} from './supabase.js';

export function cartChanged() {
  window.dispatchEvent(new CustomEvent('pop3mart:cart-changed'));
}

export async function getCart(userId) {
  const {data,error}=await supabase.from('cart_items')
    .select('user_id,product_id,quantity,products(id,name,category,price,stock,image_url,is_active)')
    .eq('user_id',userId).order('created_at',{ascending:true});
  if(error)throw error;
  return data||[];
}

export async function addToCart(userId,productId,amount=1) {
  const id=Number(productId),qty=Number(amount);
  if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(qty)||qty<1)throw new Error('Produk atau jumlah tidak valid.');
  const [stockResult,existingResult]=await Promise.all([
    supabase.from('products').select('name,stock,is_active').eq('id',id).maybeSingle(),
    supabase.from('cart_items').select('quantity').eq('user_id',userId).eq('product_id',id).maybeSingle()
  ]);
  if(stockResult.error)throw stockResult.error;
  if(existingResult.error)throw existingResult.error;
  const p=stockResult.data;
  if(!p?.is_active||Number(p.stock)<=0)throw new Error('Produk ini sedang tidak tersedia.');
  const updated=Number(existingResult.data?.quantity||0)+qty;
  if(updated>Math.min(20,Number(p.stock)))throw new Error(`Jumlah keranjang melebihi stok ${p.name} (tersedia ${p.stock}).`);
  const {error}=await supabase.from('cart_items').upsert({user_id:userId,product_id:id,quantity:updated,updated_at:new Date().toISOString()},{onConflict:'user_id,product_id'});
  if(error)throw error;
  cartChanged();
  return updated;
}

export async function setCartQuantity(userId,productId,quantity) {
  const qty=Number(quantity),id=Number(productId);
  if(!Number.isSafeInteger(qty)||qty<1||qty>20)throw new Error('Jumlah harus 1-20.');
  const {data:p,error:readError}=await supabase.from('products').select('stock,is_active').eq('id',id).maybeSingle();
  if(readError)throw readError;
  if(!p?.is_active||qty>Number(p.stock))throw new Error(`Stok tidak cukup. Maksimal ${p?.stock||0}.`);
  const {error}=await supabase.from('cart_items').update({quantity:qty,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('product_id',id);
  if(error)throw error;
  cartChanged();
}

export async function removeFromCart(userId,productId) {
  const {error}=await supabase.from('cart_items').delete().eq('user_id',userId).eq('product_id',Number(productId));
  if(error)throw error;
  cartChanged();
}
