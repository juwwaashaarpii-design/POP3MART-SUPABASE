import { escapeHTML, rupiah } from "./common.js";

function media(p) {
  const name = escapeHTML(p.name || "Figure");
  const image = p.image_url
    ? `<img class="product-image" loading="lazy" src="${escapeHTML(p.image_url)}" alt="${name}">`
    : `<div class="product-image product-placeholder" role="img" aria-label="Gambar belum tersedia"><i class="bi bi-box-seam"></i></div>`;
  return `<a class="product-media" href="shop.html?product=${encodeURIComponent(p.id)}" aria-label="Lihat detail ${name}">${image}<span class="media-cta">VIEW FIGURE <i class="bi bi-arrow-up-right"></i></span></a>`;
}

export function productCard(p, options = {}) {
  const mode = options.mode || "dashboard";
  const wishlistAction = mode === "shop"
    ? `<div class="card-actions"><a class="comic-btn blue-btn" href="shop.html?product=${encodeURIComponent(p.id)}">DETAILS <i class="bi bi-arrow-right"></i></a><button class="comic-btn yellow-btn heart-button ${options.saved ? "saved" : ""}" data-wishlist="${Number(p.id)}" type="button" title="${options.saved ? "Hapus dari wishlist" : "Tambah ke wishlist"}" aria-label="${options.saved ? "Hapus dari wishlist" : "Tambah ke wishlist"}"><i class="bi bi-heart${options.saved ? "-fill" : ""}"></i></button></div>`
    : mode === "wishlist" ? `<div class="card-actions"><a class="comic-btn blue-btn" href="shop.html?product=${encodeURIComponent(p.id)}">DETAILS</a><button type="button" class="comic-btn yellow-btn heart-button" data-remove="${escapeHTML(options.wishlistId)}" title="Hapus wishlist" aria-label="Hapus dari wishlist"><i class="bi bi-trash"></i></button></div>`
    : "";
  return `<article class="product-card">${media(p)}<div class="product-card-body"><h3>${escapeHTML(p.name)}</h3><p class="eyebrow">${escapeHTML(p.category || "Collectible Figure")}</p><div class="product-meta"><strong>${rupiah(p.price)}</strong><span class="stock-pill ${Number(p.stock) > 0 ? "in-stock" : "out-stock"}">${Number(p.stock) > 0 ? "AVAILABLE" : "OUT OF STOCK"}</span></div>${wishlistAction}</div></article>`;
}
