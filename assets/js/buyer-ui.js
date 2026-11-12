import { supabase } from "./supabase.js";
import { requireRole, showToast } from "./common.js";

// Buyer layout UX. All data still comes from Supabase, not from demo localStorage.
const context = await requireRole("buyer");
if (context) {
  const sidebar = document.getElementById("siteSidebar");
  const scrim = document.getElementById("sidebar-scrim");
  const toggle = document.getElementById("menuToggle");
  function menu(open) {
    sidebar?.classList.toggle("menu-open", open);
    if (scrim) scrim.hidden = !open;
    toggle?.setAttribute("aria-expanded", String(open));
    toggle?.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
  }
  toggle?.addEventListener("click", () => menu(!sidebar?.classList.contains("menu-open")));
  scrim?.addEventListener("click", () => menu(false));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      menu(false);
      notice.hidden = true;
      noticeToggle?.setAttribute("aria-expanded", "false");
    }
  });

  const params = new URLSearchParams(location.search);
  const form = document.getElementById("global-search-form");
  const search = document.getElementById("globalSearch");
  if (search && document.body.dataset.page === "shop" && params.get("q")) search.value = params.get("q");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    location.href = `shop.html?q=${encodeURIComponent(search?.value.trim() || "")}`;
  });

  const noticeToggle = document.getElementById("notice-toggle");
  const notice = document.getElementById("notice-popover");
  noticeToggle?.addEventListener("click", () => {
    notice.hidden = !notice.hidden;
    noticeToggle.setAttribute("aria-expanded", String(!notice.hidden));
  });
  document.addEventListener("click", (event) => {
    if (notice && !notice.hidden && !event.target.closest(".notice-wrap")) {
      notice.hidden = true;
      noticeToggle?.setAttribute("aria-expanded", "false");
    }
  });

  const { data, error } = await supabase.from("store_settings").select("announcement").eq("id", 1).maybeSingle();
  const announcement = document.getElementById("store-announcement");
  if (announcement) announcement.textContent = error ? "Pengumuman belum dapat dimuat." : (data?.announcement?.trim() || "Belum ada pengumuman dari toko.");

  document.querySelectorAll("[data-social]").forEach(button => {
    button.addEventListener("click", () => showToast(`Link ${button.dataset.social} belum disetel oleh pengelola toko.`));
  });

  try {
    if (localStorage.getItem("pop3mart_compact") === "1") document.body.classList.add("compact-cards");
    if (localStorage.getItem("pop3mart_reduce_motion") === "1") document.body.classList.add("reduce-animations");
  } catch (_) { /* Preferences are optional when storage is blocked. */ }
}
