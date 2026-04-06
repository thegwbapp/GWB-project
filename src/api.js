const SUPABASE_URL = "https://jppebmgmcliemxfhbdxf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc";
const SB_HEADERS = {"apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", "Prefer": "return=representation"};

export async function dbGet(table, filter) {
  try {
    const url = "https://jppebmgmcliemxfhbdxf.supabase.co/rest/v1/" + table + (filter ? "?" + filter : "");
    const r = await fetch(url, {headers: SB_HEADERS});
    return await r.json();
  } catch(e) { return []; }
}

export async function dbInsert(table, data) {
  try {
    const r = await fetch("https://jppebmgmcliemxfhbdxf.supabase.co/rest/v1/" + table, {method: "POST", headers: SB_HEADERS, body: JSON.stringify(data)});
    const result = await r.json();
    return Array.isArray(result) ? result[0] : result;
  } catch(e) { return null; }
}

export async function dbUpdate(table, id, data) {
  try {
    await fetch("https://jppebmgmcliemxfhbdxf.supabase.co/rest/v1/" + table + "?id=eq." + id, {method: "PATCH", headers: SB_HEADERS, body: JSON.stringify(data)});
  } catch(e) {}
}

export async function dbDelete(table, id) {
  try {
    await fetch("https://jppebmgmcliemxfhbdxf.supabase.co/rest/v1/" + table + "?id=eq." + id, {method: "DELETE", headers: SB_HEADERS});
  } catch(e) {}
}

export const CLOUDINARY_CLOUD = "dwhjqqkjg";
export const CLOUDINARY_PRESET = "tsuduljg";

export async function uploadImage(file) {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    const r = await fetch("https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/image/upload", {method: "POST", body: fd});
    const d = await r.json();
    return d.secure_url || null;
  } catch(e) { return null; }
}
