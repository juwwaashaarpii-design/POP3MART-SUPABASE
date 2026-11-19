import { supabase } from './supabase.js';
import { requireRole, showToast } from './common.js';
const context=await requireRole('admin');
const form=document.querySelector('#settings-form');
const fields=['store_name','support_email','whatsapp','announcement','instagram_url','facebook_url','tiktok_url','x_url','shipping_fee'];
if(context && form){
  const {data,error}=await supabase.from('store_settings').select('*').eq('id',1).single();
  if(error)showToast('Gagal memuat pengaturan: '+error.message,'error');
  if(data)for(const key of fields){const el=form.elements.namedItem(key);if(el)el.value=data[key]??(key==='shipping_fee'?0:'');}
}
const trustedHosts={
 instagram_url:['instagram.com'], facebook_url:['facebook.com','fb.com'],
 tiktok_url:['tiktok.com'], x_url:['x.com','twitter.com']
};
function validateSocial(key,value){
 if(!value)return '';
 let url;try{url=new URL(value);}catch{throw new Error('URL media sosial tidak valid.');}
 if(url.protocol!=='https:' || !trustedHosts[key].some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))
   throw new Error(`Alamat ${key.replace('_url','')} wajib HTTPS dan berasal dari platform resminya.`);
 return url.href;
}
form?.addEventListener('submit',async event=>{
 event.preventDefault();if(!context)return;
 const button=form.querySelector('button[type="submit"]');button.disabled=true;
 try{
   const get=key=>form.elements.namedItem(key)?.value.trim()||'';
   const fee=Number(get('shipping_fee'));
   if(!Number.isFinite(fee)||fee<0)throw new Error('Ongkir harus angka tidak negatif.');
   const whatsapp=get('whatsapp').replace(/\D/g,'');
   if(whatsapp && !/^\d{8,17}$/.test(whatsapp))throw new Error('Nomor WhatsApp perlu 8-17 digit (contoh 62812...).');
   const payload={store_name:get('store_name'),support_email:get('support_email'),whatsapp,
     announcement:get('announcement'),shipping_fee:fee,updated_at:new Date().toISOString()};
   for(const key of Object.keys(trustedHosts)) payload[key]=validateSocial(key,get(key));
   const {error}=await supabase.from('store_settings').update(payload).eq('id',1);
   if(error)throw error;
   showToast('Informasi toko, kontak, sosial media, dan ongkir berhasil disimpan!');
 }catch(error){showToast('Gagal menyimpan: '+error.message,'error');}
 finally{button.disabled=false;}
});
