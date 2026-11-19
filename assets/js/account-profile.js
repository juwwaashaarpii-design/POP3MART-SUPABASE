import { supabase } from "./supabase.js";
import { requireRole, showToast, paintUserIdentity } from "./common.js";

const role = document.body.classList.contains("admin-page") ? "admin" : "buyer";
const ctx = await requireRole(role);
const form = document.querySelector("#profile-form");
const fileInput = document.getElementById("avatar-file");
const preview = document.getElementById("avatar-preview");
const resetPhoto = document.getElementById("remove-avatar");
const note = document.getElementById("avatar-note");
const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
let originalPath = null;
let removeRequested = false;
let blobUrl = null;
const bucket = "profile-avatars";

function renderPreview(path = null, customUrl = null) {
  if (!preview) return;
  const imageUrl = customUrl || (path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null);
  preview.replaceChildren();
  if (imageUrl) {
    const img = document.createElement("img"); img.src = imageUrl; img.alt = "Foto profil";
    img.onerror = () => { if (preview.contains(img)) preview.textContent = (form?.elements.namedItem("display_name")?.value || form?.elements.namedItem("full_name")?.value || "P")[0].toUpperCase(); };
    preview.appendChild(img);
  } else preview.textContent = (form?.elements.namedItem("display_name")?.value || form?.elements.namedItem("full_name")?.value || "P")[0].toUpperCase();
}
function clearBlob() { if(blobUrl) URL.revokeObjectURL(blobUrl); blobUrl=null; }
function validateAvatar(file) {
  if (!allowed.has(file.type)) throw new Error("Gunakan JPG, PNG, atau WEBP.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Ukuran foto maksimal 2 MB.");
  if (!file.size) throw new Error("File gambar kosong.");
}
if (ctx && form) {
  const { data, error } = await supabase.from("profiles")
    .select("email,full_name,display_name,phone,address,bio,avatar_path")
    .eq("id", ctx.user.id).single();
  if (error) showToast("Gagal mengambil data profil: " + error.message, "error");
  else if (data) {
    for (const key of ["full_name","display_name","phone","address","bio","email"]) {
      const input = form.elements.namedItem(key); if (input) input.value = data[key] || (key === "email" ? ctx.user.email : "");
    }
    originalPath = data.avatar_path || null; renderPreview(originalPath);
  }
}
fileInput?.addEventListener("change", () => {
  clearBlob();
  const file = fileInput.files?.[0]; if (!file) {renderPreview(removeRequested?null:originalPath);return;}
  try {validateAvatar(file);} catch(error){showToast(error.message,"error");fileInput.value="";renderPreview(originalPath);return;}
  removeRequested=false;blobUrl=URL.createObjectURL(file);renderPreview(null,blobUrl);
  if(note) note.textContent=`Foto baru: ${file.name} (${Math.round(file.size/1024)} KB). Simpan untuk mengunggah.`;
});
resetPhoto?.addEventListener("click",()=>{
  removeRequested=true;fileInput.value="";clearBlob();renderPreview(null);
  if(note) note.textContent="Foto akan dihapus dari profil setelah klik Simpan.";
});
window.addEventListener("beforeunload",clearBlob);

form?.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!ctx) return;
  const button = form.querySelector('button[type="submit"]');
  const initialText = button?.innerHTML;
  if(button){button.disabled=true;button.textContent="Menyimpan...";}
  let newPath = null;
  try {
    const get = name => (form.elements.namedItem(name)?.value || "").trim();
    const fullName=get("full_name"), displayName=get("display_name"), bio=get("bio");
    if(!fullName || fullName.length > 100) throw new Error("Nama lengkap wajib diisi (maksimal 100 karakter).");
    if(displayName.length > 60) throw new Error("Display name maksimal 60 karakter.");
    if(bio.length > 240) throw new Error("Bio maksimal 240 karakter.");
    const payload={full_name:fullName,display_name:displayName,phone:get("phone"),bio,updated_at:new Date().toISOString()};
    if(role==='buyer') payload.address=get("address");
    const file=fileInput?.files?.[0];
    if(file){
      validateAvatar(file);
      const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type];
      newPath=`${ctx.user.id}/${crypto.randomUUID()}.${ext}`;
      const {error}=await supabase.storage.from(bucket).upload(newPath,file,{contentType:file.type,upsert:false});
      if(error)throw new Error("Upload foto gagal: "+error.message);
      payload.avatar_path=newPath;
    } else if(removeRequested) payload.avatar_path=null;

    const {data,error}=await supabase.from("profiles")
      .update(payload).eq("id",ctx.user.id)
      .select("email,full_name,display_name,phone,address,bio,avatar_path,role").single();
    if(error)throw new Error("Update profil gagal: "+error.message);
    const formerPath=originalPath;
    originalPath=data.avatar_path || null;
    if((newPath || removeRequested) && formerPath && formerPath !== originalPath && formerPath.startsWith(ctx.user.id+'/')) {
      const result=await supabase.storage.from(bucket).remove([formerPath]);
      if(result.error) console.warn('Foto lama gagal dibersihkan:',result.error.message);
    }
    removeRequested=false;fileInput.value="";clearBlob();
    renderPreview(originalPath);
    if(note)note.textContent=originalPath?'Foto profil tersimpan di Supabase.':'Foto profil menggunakan inisial akun.';
    paintUserIdentity(data,ctx.user);
    showToast('Profil berhasil diperbarui!');
  } catch(error){
    if(newPath) await supabase.storage.from(bucket).remove([newPath]).catch(()=>{});
    showToast(error.message || 'Gagal menyimpan profil.','error');
  } finally {if(button){button.disabled=false;button.innerHTML=initialText;}}
});
