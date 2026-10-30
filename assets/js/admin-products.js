import { supabase } from "./supabase.js";
import { requireRole, escapeHTML, rupiah, showToast } from "./common.js";
const context = await requireRole("admin");
const dialog = document.querySelector("#product-dialog");
const form = document.querySelector("#product-form");
const tableBody = document.querySelector("#products-table-body");
let editingId = null;
let products = [];
async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) { showToast("Gagal memuat produk: " + error.message, "error"); return; }
  products = data || [];
  tableBody.innerHTML = products.map(p => `<tr><td>${p.image_url ? `<img class="table-thumb" src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}">` : `<div class="table-thumb table-thumb-empty"><i class="bi bi-image"></i></div>`}</td><td><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.category || "Tanpa kategori")}</small></td><td>${rupiah(p.price)}</td><td>${p.stock}</td><td><span class="status-pill ${p.is_active ? "status-active" : "status-hidden"}">${p.is_active ? "Aktif" : "Disembunyikan"}</span></td><td><div class="table-actions"><button class="small-btn" data-edit="${p.id}">Edit</button><button class="small-btn danger-btn" data-delete="${p.id}">Hapus</button></div></td></tr>`).join("") || `<tr><td colspan="6" class="empty-cell">Belum ada produk. Klik “Tambah Figure” untuk memulai.</td></tr>`;
}
function resetForm() {
  form.reset(); editingId = null; form.is_active.checked = true;
  document.querySelector("#dialog-title").textContent = "Tambah Figure Baru";
  document.querySelector("#current-image-note").textContent = "Belum ada gambar dipilih.";
}
if (context) await loadProducts();
document.querySelector("#add-product")?.addEventListener("click", () => { resetForm(); dialog.showModal(); });
document.querySelector("#cancel-product")?.addEventListener("click", () => dialog.close());
tableBody?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const p = products.find(item => String(item.id) === editButton.dataset.edit); if (!p) return;
    resetForm(); editingId = p.id;
    form.elements.namedItem("name").value = p.name; form.category.value = p.category || ""; form.description.value = p.description || ""; form.price.value = p.price; form.stock.value = p.stock; form.is_active.checked = p.is_active;
    document.querySelector("#dialog-title").textContent = "Edit Figure";
    document.querySelector("#current-image-note").textContent = p.image_url ? "Gambar saat ini sudah tersimpan. Pilih file baru jika ingin menggantinya." : "Belum ada gambar.";
    dialog.showModal();
  }
  if (deleteButton) {
    const p = products.find(item => String(item.id) === deleteButton.dataset.delete);
    if (!p || !confirm(`Hapus figure “${p.name}”?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) showToast("Gagal menghapus: " + error.message, "error"); else { showToast("Produk berhasil dihapus."); await loadProducts(); }
  }
});
form?.addEventListener("submit", async (event) => {
  event.preventDefault(); if (!context) return;
  const button = form.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Menyimpan...";
  try {
    const payload = {
      name: form.elements.namedItem("name").value.trim(), category: form.category.value.trim(), description: form.description.value.trim(),
      price: Number(form.price.value), stock: Number(form.stock.value), is_active: form.is_active.checked
    };
    const imageFile = form.image.files[0];
    if (imageFile) {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(imageFile.type)) throw new Error("Format gambar harus JPG, PNG, atau WEBP.");
      if (imageFile.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
      const cleanName = imageFile.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
      const filePath = `products/${Date.now()}-${crypto.randomUUID()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, imageFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      payload.image_url = supabase.storage.from("product-images").getPublicUrl(filePath).data.publicUrl;
    }
    const result = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId)
      : await supabase.from("products").insert(payload);
    if (result.error) throw result.error;
    showToast(editingId ? "Figure berhasil diperbarui." : "Figure baru berhasil ditambahkan.");
    dialog.close(); resetForm(); await loadProducts();
  } catch (error) { showToast("Tidak dapat menyimpan produk: " + error.message, "error"); }
  finally { button.disabled = false; button.textContent = "Simpan Produk"; }
});
