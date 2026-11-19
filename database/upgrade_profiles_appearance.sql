-- POP-3 MART: Update profil untuk Buyer & Admin (NOV 2026)
-- Jalankan SEKALI melalui SQL Editor -> New Query, SETELAH schema.sql/checkout/cart lama.
-- Menambahkan kolom, tidak menghapus data, role, pesanan, maupun produk.

alter table public.profiles
  add column if not exists display_name text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists avatar_path text;

-- Batasi panjang data profil, termasuk dari request REST langsung.
-- Bersihkan hanya constraint kita sendiri agar upgrade dapat dijalankan ulang.
alter table public.profiles drop constraint if exists pop3_profile_display_name_length;
alter table public.profiles add constraint pop3_profile_display_name_length
  check (char_length(display_name) <= 60);
alter table public.profiles drop constraint if exists pop3_profile_bio_length;
alter table public.profiles add constraint pop3_profile_bio_length
  check (char_length(bio) <= 240);

-- Path avatar yang disimpan pada profil harus mengarah ke folder pemilik akun.
alter table public.profiles drop constraint if exists pop3_profile_avatar_owner_path;
alter table public.profiles add constraint pop3_profile_avatar_owner_path
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);

-- Foto profil adalah gambar publik untuk header/profil; jangan unggah data rahasia.
-- Folder tiap pengguna di bawah UUID akun: profile-avatars/<uid>/<file unik>.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',true,2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Hanya pemilik folder yang dapat upload dan menghapus gambar miliknya.
drop policy if exists "POP3 profile owner upload" on storage.objects;
create policy "POP3 profile owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id='profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "POP3 profile owner read" on storage.objects;
create policy "POP3 profile owner read" on storage.objects
  for select to authenticated
  using (bucket_id='profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "POP3 profile owner delete" on storage.objects;
create policy "POP3 profile owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id='profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Kebijakan UPDATE di public.profiles tetap memakai policy milik schema lama.
-- Pastikan policy pembaruan profil belum diubah menjadi akses publik.
-- Jangan pernah menambahkan UPDATE role dari sisi frontend.
