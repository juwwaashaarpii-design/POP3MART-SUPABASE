import { supabase, isSupabaseConfigured } from "./supabase.js";
if (!isSupabaseConfigured) {
  location.replace("login.html");
} else {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) location.replace("login.html");
  else {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    location.replace(profile?.role === "admin" ? "admin/dashboard.html" : "buyer/dashboard.html");
  }
}
