import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://jppebmgmcliemxfhbdxf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export const CLOUDINARY_CLOUD = "dwhjqqkjg";
export const CLOUDINARY_PRESET = "tsuduljg";
export async function uploadImage(file) {
try {
const fd = new FormData();
fd.append("file", file);
fd.append("upload_preset", CLOUDINARY_PRESET);
const res = await fetch(
"https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/image/upload",
{ method: "POST", body: fd }
);
const data = await res.json();
return data.secure_url || null;
} catch (e) { return null; }
}
