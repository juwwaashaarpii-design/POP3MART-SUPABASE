import { escapeHTML, rupiah } from "./common.js";

function media(p) {
  const name = escapeHTML(p.name || "Figure");
  const image = p.image_url
    ? `<img class="product-image" loading="lazy" src="${escapeHTML(p.image_url)}" alt="${name}">`
    : `<div class="product-image product-placeholder" role="img" aria-label="Gambar belum tersedia"><i class="bi bi-box-seam"></i></div>`;
  return `<a class="product-media" href="shop.html?product=${encodeURIComponent(p.id)}" aria-label="Lihat detail ${name}">${image}<span class="media-cta">VIEW FIGURE <i class="bi bi-arrow-up-right"></i></span></a>`;
}

export function productCard(p, options = {}) {
  const mode=options.mode||'dashboard';
  const id=Number(p.id),stock=Number(p.stock)||0;
  const cartButton=stock>0
    ? `<button type="button" class="comic-btn yellow-btn add-cart-btn" data-add-cart="${id}" title="Tambahkan ke keranjang"><i class="bi bi-cart-plus"></i> ADD TO CART</button>`
    : '';
  let actions='';
  if(mode==='shop') {
    actions=`<div class="card-actions shop-card-actions">
      <a class="comic-btn blue-btn" href="shop.html?product=${encodeURIComponent(p.id)}">DETAILS <i class="bi bi-arrow-right"></i></a>
      ${stock>0?`<a class="comic-btn red-btn" href="checkout.html?product=${encodeURIComponent(p.id)}">BUY</a>`:''}
      <button class="comic-btn yellow-btn heart-button ${options.saved?'saved':''}" data-wishlist="${id}" type="button" title="${options.saved?'Hapus dari wishlist':'Tambah ke wishlist'}" aria-label="${options.saved?'Hapus dari wishlist':'Tambah ke wishlist'}"><i class="bi bi-heart${options.saved?'-fill':''}"></i></button>
      ${cartButton}
    </div>`;
  } else if(mode==='wishlist') {
    actions=`<div class="card-actions wishlist-card-actions">
      <a class="comic-btn blue-btn" href="shop.html?product=${encodeURIComponent(p.id)}">DETAILS</a>
      ${cartButton}
      <button type="button" class="comic-btn yellow-btn heart-button" data-remove="${escapeHTML(options.wishlistId)}" title="Hapus wishlist" aria-label="Hapus dari wishlist"><i class="bi bi-trash"></i></button>
    </div>`;
  } else {
    actions=cartButton?`<div class="card-actions dashboard-card-actions">${cartButton}</div>`:'';
  }
  return `<article class="product-card">${media(p)}<div class="product-card-body"><h3>${escapeHTML(p.name)}</h3><p class="eyebrow">${escapeHTML(p.category || 'Collectible Figure')}</p><div class="product-meta"><strong>${rupiah(p.price)}</strong><span class="stock-pill ${stock>0?'in-stock':'out-stock'}">${stock>0?'AVAILABLE':'OUT OF STOCK'}</span></div>${actions}</div></article>`;
}
