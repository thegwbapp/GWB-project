const SUPABASE_URL = “https://jppebmgmcliemxfhbdxf.supabase.co”;
const SUPABASE_KEY = “eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc”;
const HEADERS = { “apikey”: SUPABASE_KEY, “Authorization”: “Bearer “ + SUPABASE_KEY, “Content-Type”: “application/json”, “Prefer”: “return=representation” };

export async function dbGet(table, filter) {
try {
const url = SUPABASE_URL + “/rest/v1/” + table + (filter ? “?” + filter : “?order=created_at.desc”);
const res = await fetch(url, { headers: HEADERS });
return await res.json();
} catch(e) { console.error(“dbGet error”, e); return []; }
}

export async function dbInsert(table, data) {
try {
const res = await fetch(SUPABASE_URL + “/rest/v1/” + table, {
method: “POST”, headers: HEADERS, body: JSON.stringify(data)
});
const result = await res.json();
return Array.isArray(result) ? result[0] : result;
} catch(e) { console.error(“dbInsert error”, e); return null; }
}

export async function dbUpdate(table, id, data) {
try {
await fetch(SUPABASE_URL + “/rest/v1/” + table + “?id=eq.” + id, {
method: “PATCH”, headers: HEADERS, body: JSON.stringify(data)
});
} catch(e) { console.error(“dbUpdate error”, e); }
}

export async function dbDelete(table, id) {
try {
await fetch(SUPABASE_URL + “/rest/v1/” + table + “?id=eq.” + id, {
method: “DELETE”, headers: HEADERS
});
} catch(e) { console.error(“dbDelete error”, e); }
}

export const CLOUDINARY_CLOUD = “dwhjqqkjg”;
export const CLOUDINARY_PRESET = “tsuduljg”;

export async function uploadImage(file) {
try {
const fd = new FormData();
fd.append(“file”, file);
fd.append(“upload_preset”, CLOUDINARY_PRESET);
const res = await fetch(“https://api.cloudinary.com/v1_1/” + CLOUDINARY_CLOUD + “/image/upload”, { method: “POST”, body: fd });
const data = await res.json();
return data.secure_url || null;
} catch(e) { return null; }
}
