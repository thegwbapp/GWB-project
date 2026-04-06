import { useState, useEffect, useCallback } from "react";
import { supabase, uploadImage } from "./api";
import { AESTHETICS, QUESTIONS, QUOTES } from "./data";
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric":}); } catch(e) { return d; };
const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];
const EMOJIS = ["f", "h", "s", "m", "p"];
"short
const T = {
bg: "#1a1612", card: "#22201a", border: "#2e2a22", accent: "#3d3528",
text: "#f0e8d8", muted: "#8a7d68", dim: "#4a4030", gold: "#c9a84c",
};
const CSS = `
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}
.fu{animation:fadeUp .5s ease both}
.fu2{animation:fadeUp .5s .08s ease both}
.fu3{animation:fadeUp .5s .16s ease both}
.fu4{animation:fadeUp .5s .24s ease both}
.fu5{animation:fadeUp .5s .32s ease both}
.fu6{animation:fadeUp .5s .4s ease both}
.fi{animation:fadeIn .35s ease both}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1a1612}
button{cursor:pointer;font-family:${SERIF};transition:all .2s}
button:active{opacity:.8;transform:scale(.98)}
input,textarea{font-family:${SERIF}}
input::placeholder,textarea::placeholder{color:#4a4030}
textarea{resize:none}
`;
function CircleProgress({ pct, color }) {
const r = 38, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
return (
<svg width="96" height="96" viewBox="0 0 96 96">
<circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="
<circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="3"
strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
strokeLinecap="round" style={{ transition: "stroke-dasharray 0.7s ease" }} />
<text x="48" y="53" textAnchor="middle" fill={color}
style={{ fontSize: "17px", fontFamily: SERIF, fontWeight: 600 }}>{pct}%</text>
</svg>
);
}
export default function App() {
const [screen, setScreen] = useState("splash");
const [emailInput, setEmailInput] = useState("");
const [displayNameInput, setDisplayNameInput] = useState("");
const [authError, setAuthError] = useState("");
const [authLoading, setAuthLoading] = useState(false);
const [isNewUser, setIsNewUser] = useState(true);
const [user, setUser] = useState(null);
const [aesthetic, setAesthetic] = useState(null);
const [quizStep, setQuizStep] = useState(0);
const [quizScores, setQuizScores] = useState({ clean:0,soft:0,corporate:0,wellness:0,luxury
const [quizSelected, setQuizSelected] = useState(null);
const [quizKey, setQuizKey] = useState(0);
const [view, setView] = useState("today");
const [goals, setGoals] = useState([]);
const [checkins, setCheckins] = useState([]);
const [streak, setStreak] = useState(0);
const [newGoal, setNewGoal] = useState("");
const [dataLoading, setDataLoading] = useState(false);
const [celebrating, setCelebrating] = useState(false);
const [aiMsg, setAiMsg] = useState("");
const [loadingAI, setLoadingAI] = useState(false);
const [quote] = useState(randomQuote());
const [posts, setPosts] = useState([]);
const [postContent, setPostContent] = useState("");
const [postImage, setPostImage] = useState(null);
const [postImagePreview, setPostImagePreview] = useState(null);
const [uploadingImage, setUploadingImage] = useState(false);
const [expandedPost, setExpandedPost] = useState(null);
const [replyText, setReplyText] = useState("");
const [replies, setReplies] = useState({});
const [reactions, setReactions] = useState({});
const aesObj = aesthetic ? AESTHETICS[aesthetic] : null;
const gold = aesObj?.color || T.gold;
// ── INIT ──
useEffect(() => {
const t = setTimeout(async () => {
try {
const saved = localStorage.getItem("gwb_user_id");
if (saved) {
const { data, error } = await supabase.from("users").select("*").eq("id", saved).si
if (!error && data) {
setUser(data);
if (data.quiz_done && data.aesthetic) {
setAesthetic(data.aesthetic);
setScreen("app");
loadUserData(data);
return;
}
setScreen("quiz");
return;
}
}
} catch {}
setScreen("setup");
}, 1800);
return () => clearTimeout(t);
}, []);
const loadUserData = useCallback(async (u) => {
setDataLoading(true);
const [{ data: g }, { data: c }] = await Promise.all([
supabase.from("goals").select("*").eq("user_id", u.id),
supabase.from("checkins").select("*").eq("user_id", u.id),
]);
setGoals(g || []);
const clist = c || [];
setCheckins(clist);
calcStreak(clist);
setDataLoading(false);
loadWall();
}, []);
const calcStreak = (data) => {
let count = 0; const d = new Date();
for (let i = 0; i < 365; i++) {
const key = d.toISOString().split("T")[0];
if (data.some(r => r.date === key)) { count++; d.setDate(d.getDate() - 1); } else break
}
setStreak(count);
};
const loadWall = async () => {
const { data: p } = await supabase.from("posts").select("*").order("created_at", { setPosts(p || []);
const { data: r } = await supabase.from("reactions").select("*");
const rMap = {};
ascend
(r || []).forEach(rec => {
if (!rMap[rec.post_id]) rMap[rec.post_id] = [];
rMap[rec.post_id].push(rec);
});
setReactions(rMap);
};
const loadReplies = async (postId) => {
const { data } = await supabase.from("replies").select("*").eq("post_id", postId).order("
setReplies(prev => ({ ...prev, [postId]: data || [] }));
};
// ── AUTH ──
const handleAuth = async () => {
const email = emailInput.trim().toLowerCase();
const dname = displayNameInput.trim();
if (!email || !email.includes("@")) { setAuthError("Please enter a valid email."); setAuthLoading(true); setAuthError("");
return
if (isNewUser) {
if (!dname || dname.length < 2) { setAuthError("Pick a display name (2+ characters).");
// Check email taken
const { data: existing } = await supabase.from("users").select("id").eq("email", email)
if (existing) { setAuthError("That email already has an account. Sign in instead."); se
// Check display name taken
const { data: nameCheck } = await supabase.from("users").select("id").eq("display_name"
if (nameCheck) { setAuthError("That display name is taken. Try another."); setAuthLoadi
// Create user
const { data: newUser, error } = await supabase.from("users").insert({ email, display_n
if (error || !newUser) { setAuthError("Could not create account: " + (error?.message ||
try { localStorage.setItem("gwb_user_id", newUser.id); } catch {}
setUser(newUser);
setAuthLoading(false);
setScreen("quiz");
} else {
// Sign in
if (!dname || dname.length < 2) { setAuthError("Enter your display name to sign in.");
const { data: found, error } = await supabase.from("users").select("*").eq("email", ema
if (error || !found) { setAuthError("No account found with that email and display name.
try { localStorage.setItem("gwb_user_id", found.id); } catch {}
setUser(found);
setAuthLoading(false);
if (found.quiz_done && found.aesthetic) {
setAesthetic(found.aesthetic);
setScreen("app");
loadUserData(found);
} else {
setScreen("quiz");
}
}
};
// ── QUIZ ──
const handleQuizAnswer = async (option) => {
setQuizSelected(option);
setTimeout(async () => {
const ns = { ...quizScores };
Object.entries(option.scores).forEach(([k, v]) => { ns[k] = (ns[k] || 0) + v; });
setQuizScores(ns);
setQuizSelected(null);
setQuizKey(k => k + 1);
if (quizStep < QUESTIONS.length - 1) {
setQuizStep(s => s + 1);
} else {
const winner = Object.entries(ns).sort((a, b) => b[1] - a[1])[0][0];
setAesthetic(winner);
if (user) await supabase.from("users").update({ aesthetic: winner, quiz_done: true })
setUser(prev => ({ ...prev, aesthetic: winner, quiz_done: true }));
setScreen("result");
}
}, 380);
};
// ── ENTER APP ──
const enterApp = async () => {
const suggested = AESTHETICS[aesthetic]?.goals || [];
const inserts = suggested.map(text => ({ user_id: user.id, goal_text: text }));
const { data: saved } = await supabase.from("goals").insert(inserts).select();
setGoals(saved || []);
setScreen("app");
setView("today");
loadWall();
};
// ── GOALS ──
const addGoal = async () => {
if (!newGoal.trim()) return;
const text = newGoal.trim(); setNewGoal("");
const { data } = await supabase.from("goals").insert({ user_id: user.id, goal_text: text
if (data) setGoals(prev => [...prev, data]);
};
const removeGoal = async (id) => {
setGoals(prev => prev.filter(g => g.id !== id));
await supabase.from("goals").delete().eq("id", id);
};
// ── CHECK-INS ──
const todayCheckins = checkins.filter(c => c.date === today());
const checkedIds = new Set(todayCheckins.map(c => c.goal_id));
const completedCount = goals.filter(g => checkedIds.has(g.id)).length;
const pct = goals.length ? Math.round((completedCount / goals.length) * 100) : 0;
const toggleCheckin = async (goal) => {
const done = checkedIds.has(goal.id);
if (done) {
const rec = todayCheckins.find(c => c.goal_id === goal.id);
if (rec) {
setCheckins(prev => prev.filter(c => c.id !== rec.id));
await supabase.from("checkins").delete().eq("id", rec.id);
}
} else {
const { data } = await supabase.from("checkins").insert({
user_id: user.id, goal_id: goal.id, goal_text: goal.goal_text,
date: today(), streak: streak + 1, aesthetic,
}).select().single();
if (data) setCheckins(prev => [...prev, data]);
if (completedCount + 1 === goals.length && goals.length > 0) {
setCelebrating(true); setTimeout(() => setCelebrating(false), 4000);
}
}
};
// ── WALL ──
const handleImageSelect = (e) => {
const file = e.target.files?.[0];
if (!file) return;
setPostImage(file);
setPostImagePreview(URL.createObjectURL(file));
};
const submitPost = async () => {
if (!postContent.trim() && !postImage) return;
const content = postContent.trim();
setPostContent(""); setPostImage(null); setPostImagePreview(null);
setUploadingImage(true);
let image_url = null;
if (postImage) image_url = await uploadImage(postImage);
setUploadingImage(false);
const { data } = await supabase.from("posts").insert({
user_id: user.id, display_name: user.display_name,
content, image_url, aesthetic, streak, date: today(),
}).select().single();
if (data) setPosts(prev => [data, ...prev]);
};
const toggleReaction = async (postId, emoji) => {
const postReactions = reactions[postId] || [];
const existing = postReactions.find(r => r.user_id === user.id && r.emoji === emoji);
if (existing) {
setReactions(prev => ({ ...prev, [postId]: postReactions.filter(r => r.id !== existing.
await supabase.from("reactions").delete().eq("id", existing.id);
} else {
const { data } = await supabase.from("reactions").insert({ post_id: postId, user_id: us
if (data) setReactions(prev => ({ ...prev, [postId]: [...postReactions, data] }));
}
};
const submitReply = async (postId) => {
if (!replyText.trim()) return;
const content = replyText.trim(); setReplyText("");
const { data } = await supabase.from("replies").insert({
post_id: postId, user_id: user.id,
display_name: user.display_name, content, aesthetic,
}).select().single();
if (data) setReplies(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
};
// ── AI NUDGE ──
const getAINudge = async () => {
setLoadingAI(true); setAiMsg("");
const done = goals.filter(g => checkedIds.has(g.id)).map(g => g.goal_text);
const pending = goals.filter(g => !checkedIds.has(g.id)).map(g => g.goal_text);
try {
const res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST", headers: { "Content-Type": "application/json" },
body: JSON.stringify({
model: "claude-sonnet-4-20250514", max_tokens: 1000,
system: `You are the voice of The GWB Project — Grow With Boldness. Speak like The
messages: [{ role: "user", content: `Name: ${user?.display_name}\nAesthetic: }),
});
const data = await res.json();
${aesO
setAiMsg(data.content?.map(b => b.text || "").join("") || "The woman you're becoming is
} catch { setAiMsg("The woman you're becoming is watching. Keep going."); }
setLoadingAI(false);
};
// ── SPLASH ──
if (screen === "splash") return (
<div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column",
<style>{CSS}</style>
<div style={{ textAlign:"center", animation:"shimmer 2s infinite" }}>
<p style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"12px"
<h1 style={{ fontSize:"52px", fontWeight:"300", color:T.text, letterSpacing:"4px", li
<div style={{ width:"30px", height:"1px", background:T.gold, margin:"14px auto" }} />
<p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted }}>PROJECT</p>
</div>
</div>
);
// ── SETUP ──
if (screen === "setup") return (
<div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, display:"flex", align
<style>{CSS}</style>
<div style={{ width:"100%", maxWidth:"400px" }}>
<div className="fu" style={{ textAlign:"center", marginBottom:"40px" }}>
<p style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"10px
<h1 style={{ fontSize:"44px", fontWeight:"300", color:T.text, letterSpacing:"3px",
<div style={{ width:"36px", height:"1px", background:T.gold, margin:"0 auto 12px" }
<p style={{ fontSize:"11px", letterSpacing:"3px", color:T.muted }}>DAILY CHECK-IN</
</div>
<div className="fu2" style={{ borderLeft:`2px solid ${T.gold}`, padding:"12px 16px",
<p style={{ fontStyle:"italic", color:T.muted, fontSize:"15px", lineHeight:1.6 }}>{
</div>
<div className="fu3" style={{ display:"flex", marginBottom:"16px", background:T.card,
{[["Join the Circle", true], ["Sign In", false]].map(([label, val]) => (
<button key={label} onClick={() => { setIsNewUser(val); setAuthError(""); }}
style={{ flex:1, padding:"11px", background: isNewUser===val ? T.gold : "transp
{label}
</button>
))}
</div>
<div className="fu4" style={{ background:T.card, border:`1px solid ${T.border}`, bord
<div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"10p
<input value={emailInput} onChange={e => { setEmailInput(e.target.value); setAuth
onKeyDown={e => e.key==="Enter" && handleAuth()}
placeholder="Your email address"
style={{ padding:"13px 16px", background:T.bg, border:`1px solid ${T.border}`,
<input value={displayNameInput} onChange={e => { setDisplayNameInput(e.target.val
onKeyDown={e => e.key==="Enter" && handleAuth()}
placeholder={isNewUser ? "Choose a display name" : "Your display name"}
style={{ padding:"13px 16px", background:T.bg, border:`1px solid ${T.border}`,
</div>
{authError && <p style={{ color:"#c07a5a", fontSize:"13px", fontStyle:"italic", mar
<button onClick={handleAuth} disabled={authLoading}
style={{ width:"100%", padding:"15px", background:T.gold, border:"none", color:T.
{authLoading ? "· · ·" : isNewUser ? "ENTER THE CIRCLE" : "WELCOME BACK"}
</button>
</div>
</div>
</div>
);
// ── QUIZ ──
if (screen === "quiz") {
const q = QUESTIONS[quizStep];
const progress = (quizStep / QUESTIONS.length) * 100;
return (
<div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, color:T.text, paddi
<style>{CSS}</style>
<div style={{ width:"100%", maxWidth:"460px" }}>
<div style={{ marginBottom:"36px" }}>
<div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px"
<p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted }}>DISCOVER YOU
<p style={{ fontSize:"12px", color:T.dim }}>{quizStep+1} / {QUESTIONS.length}</
</div>
<div style={{ height:"2px", background:T.accent, borderRadius:"1px", overflow:"hi
<div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(
</div>
</div>
<div key={`q${quizKey}`} className="fu" style={{ marginBottom:"28px" }}>
<h2 style={{ fontSize:"25px", fontWeight:"400", color:T.text, lineHeight:1.5, fon
</div>
<div key={`o${quizKey}`} style={{ display:"flex", flexDirection:"column", gap:"10px
{q.options.map((opt, i) => {
const isSel = quizSelected === opt;
return (
<button key={i} onClick={() => handleQuizAnswer(opt)}
className={`fu${Math.min(i+2,6)}`}
style={{ padding:"15px 20px", background: isSel?"rgba(201,168,76,0.1)":T.ca
{opt.text}
</button>
);
})}
</div>
</div>
</div>
);
}
// ── RESULT ──
if (screen === "result" && aesObj) return (
<div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, color:T.text, display
<style>{CSS}</style>
<div style={{ width:"100%", maxWidth:"440px", textAlign:"center" }}>
<p className="fu" style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, margi
<p className="fu2" style={{ fontSize:"56px", color:gold, lineHeight:1, marginBottom:"
<h1 className="fu3" style={{ fontSize:"34px", fontWeight:"400", color:T.text, letterS
<p className="fu4" style={{ fontSize:"11px", letterSpacing:"4px", color:gold, marginB
<div className="fu4" style={{ width:"40px", height:"1px", background:gold, margin:"0
<div className="fu4" style={{ background:T.card, border:`1px solid ${T.border}`, bord
<p style={{ fontSize:"16px", lineHeight:1.85, color:T.muted, fontStyle:"italic" }}>
</div>
<div className="fu5" style={{ background:T.card, border:`1px solid ${T.border}`, bord
<p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"16px
{aesObj.goals.map((g, i) => (
<div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"1
<span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj.icon}</span
<span style={{ fontSize:"15px", color:T.text, fontStyle:"italic" }}>{g}</span>
</div>
))}
</div>
<button className="fu6" onClick={enterApp}
style={{ width:"100%", padding:"16px", background:gold, border:"none", color:T.bg,
BEGIN MY DAILY CHECK-IN
</button>
</div>
</div>
);
// ── MAIN APP ──
return (
<div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, color:T.text, padding
<style>{CSS}</style>
<div style={{ position:"fixed", top:0, left:0, right:0, height:"160px", background:`rad
<div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 18px", position:"relative",
{/* Header */}
<div style={{ padding:"26px 0 14px" }}>
<p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted, marginBottom:"2px"
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }
<h1 style={{ fontSize:"28px", fontWeight:"400", color:T.text, letterSpacing:"1px"
{streak > 0 && (
<div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px
<span style={{ color:gold, fontSize:"10px" }}>{aesObj?.icon||"✦"}</span>
<span style={{ fontSize:"11px", color:gold, letterSpacing:"1px" }}>{streak}d
</div>
)}
</div>
</div>
{/* Quote */}
<div style={{ borderLeft:`2px solid ${gold}`, padding:"11px 14px", background:`${gold
<p style={{ fontStyle:"italic", color:T.muted, fontSize:"14px", lineHeight:1.5 }}>{
</div>
14px",
{/* Aesthetic badge */}
{aesObj && (
<div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px <span style={{ fontSize:"18px", color:gold }}>{aesObj.icon}</span>
<div style={{ flex:1 }}>
<p style={{ fontSize:"11px", color:gold, letterSpacing:"2px" }}>{aesObj.name.to
<p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic" }}>{aesObj.tagline
</div>
<p style={{ fontSize:"11px", color:T.dim, fontStyle:"italic" }}>@{user?.display_n
</div>
)}
{/* Alignment ring */}
{view==="today" && goals.length > 0 && (
<div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px
<CircleProgress pct={pct} color={gold} />
<div>
<p style={{ fontSize:"19px", fontWeight:"400", color:T.text, marginBottom:"4px"
<p style={{ fontSize:"13px", color:T.muted, marginBottom:"5px" }}>{completedCou
<p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic", lineHeight:1.4 }}
{pct===100?"Fully aligned. You showed up.":pct>=50?"You're in motion. Keep go
</p>
</div>
</div>
)}
{/* AI nudge */}
{view==="today" && goals.length > 0 && (
<div style={{ marginBottom:"12px" }}>
<button onClick={getAINudge} disabled={loadingAI}
style={{ width:"100%", padding:"12px", background:"transparent", border:`1px so
{loadingAI ? "· · ·" : `${aesObj?.icon||"✦"} RECEIVE YOUR NUDGE`}
</button>
{aiMsg && (
<div className="fi" style={{ marginTop:"10px", padding:"14px 16px", background:
<p style={{ fontSize:"10px", letterSpacing:"3px", color:gold, marginBottom:"6
<p style={{ fontSize:"15px", lineHeight:1.7, color:T.muted, fontStyle:"italic
</div>
)}
</div>
)}
{dataLoading && <div style={{ textAlign:"center", padding:"50px 0", color:T.dim, lett
{/* ── TODAY ── */}
{!dataLoading && view==="today" && (
<div>
{goals.length===0 ? (
<div style={{ textAlign:"center", padding:"40px 0", color:T.dim }}>
<p style={{ fontSize:"26px", marginBottom:"12px", color:gold, opacity:.4 }}>{
<p style={{ fontSize:"15px", fontStyle:"italic", lineHeight:1.8, color:T.mute
</div>
) : (
<div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"
<p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom
{goals.map((goal, i) => {
const done = checkedIds.has(goal.id);
return (
<button key={goal.id} onClick={() => toggleCheckin(goal)}
style={{ display:"flex", alignItems:"center", gap:"14px", background:"n
<div style={{ width:"22px", height:"22px", flexShrink:0, borderRadius:"
{done && <div style={{ width:"8px", height:"8px", borderRadius:"50%",
</div>
<span style={{ fontSize:"16px", color: done?T.dim:T.text, textDecoratio
</button>
);
})}
</div>
)}
</div>
)}
{/* ── GOALS ── */}
{!dataLoading && view==="goals" && (
<div>
<div style={{ display:"flex", marginBottom:"12px" }}>
<input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e
style={{ flex:1, padding:"13px 16px", background:T.card, border:`1px solid ${
<button onClick={addGoal} style={{ padding:"13px 18px", background:gold, border
</div>
{goals.length===0
? <div style={{ textAlign:"center", padding:"36px 0", color:T.dim, fontSize:"15
: <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius
{goals.map((goal, i) => (
<div key={goal.id} style={{ display:"flex", alignItems:"center", gap:"12p
<span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj?.ic
<span style={{ flex:1, fontSize:"15px", color:T.text, lineHeight:1.4, f
<button onClick={() => removeGoal(goal.id)} style={{ background:"none",
</div>
))}
</div>
}
<button onClick={() => { setQuizStep(0); setQuizScores({clean:0,soft:0,corporate:
style={{ width:"100%", marginTop:"14px", padding:"12px", background:"transparen
RETAKE AESTHETIC QUIZ
</button>
</div>
)}
{/* ── COMMUNITY WALL ── */}
{view==="wall" && (
<div>
{/* Composer */}
<div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14
<p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"
<textarea value={postContent} onChange={e => setPostContent(e.target.value)} pl
style={{ width:"100%", padding:"12px 14px", background:T.bg, border:`1px soli
{postImagePreview && (
<div style={{ position:"relative", marginBottom:"10px" }}>
<img src={postImagePreview} alt="preview" style={{ width:"100%", borderRadi
<button onClick={() => { setPostImage(null); setPostImagePreview(null); }}
style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(26
</div>
)}
<div style={{ display:"flex", gap:"8px" }}>
<label style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px
PHOTO
<input type="file" accept="image/*" onChange={handleImageSelect} style={{ d
</label>
<button onClick={submitPost} disabled={uploadingImage||(!postContent.trim()&&
style={{ flex:1, padding:"10px", background:gold, border:"none", color:T.bg
{uploadingImage?"UPLOADING...":"POST →"}
</button>
</div>
</div>
{/* Posts */}
{posts.length===0
? <div style={{ textAlign:"center", padding:"40px 0", color:T.dim, fontSize:"15
: <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
{posts.map((post) => {
const postAes = post.aesthetic ? AESTHETICS[post.aesthetic] : null;
const postReactions = reactions[post.id] || [];
const isExpanded = expandedPost === post.id;
const postReplies = replies[post.id] || [];
const reactionCounts = {};
postReactions.forEach(r => { reactionCounts[r.emoji] = (reactionCounts[r.
const myReactions = new Set(postReactions.filter(r => r.user_id===user?.i
${T.bo
return (
<div key={post.id} style={{ background:T.card, border:`1px solid <div style={{ padding:"14px 16px 0" }}>
<div style={{ display:"flex", justifyContent:"space-between", align
<div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
{postAes && <span style={{ color:postAes.color, fontSize:"14px"
<span style={{ fontSize:"13px", color:gold, letterSpacing:"1px"
</div>
<span style={{ fontSize:"11px", color:T.dim }}>{fmtDate(post.date
</div>
{post.content && <p style={{ fontSize:"16px", lineHeight:1.65, colo
{post.image_url && <img src={post.image_url} alt="post" style={{ wi
{post.streak > 1 && <p style={{ fontSize:"11px", color:T.dim, margi
</div>
{/* Reactions */}
<div style={{ padding:"0 16px 10px", display:"flex", gap:"6px", flexW
{EMOJIS.map(emoji => {
const count = reactionCounts[emoji]||0;
const mine = myReactions.has(emoji);
return (
<button key={emoji} onClick={() => toggleReaction(post.id, emoj
style={{ padding:"4px 10px", background: mine?`${gold}22`:T.b
{emoji}{count>0&&<span style={{ fontSize:"11px" }}>{count}</s
</button>
);
})}
</div>
{/* Replies */}
<div style={{ borderTop:`1px solid ${T.border}` }}>
<button onClick={() => { if(!isExpanded){setExpandedPost(post.id);l
style={{ width:"100%", padding:"10px 16px", background:"none", bo
{isExpanded?"▲ HIDE REPLIES":`▼ REPLIES${postReplies.length>0?` (
</button>
{isExpanded && (
<div style={{ padding:"0 16px 14px" }}>
{postReplies.map((reply, i) => {
const rAes = reply.aesthetic ? AESTHETICS[reply.aesthetic] :
return (
<div key={reply.id} style={{ padding:"10px 0", borderTop: i
<span style={{ color:rAes?.color||T.muted, fontSize:"13px
<div>
<span style={{ fontSize:"12px", color:gold, letterSpaci
<p style={{ fontSize:"14px", color:T.muted, lineHeight:
</div>
</div>
);
})}
<div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
<input value={replyText} onChange={e => setReplyText(e.target
placeholder="Write a reply..." style={{ flex:1, padding:"10
<button onClick={() => submitReply(post.id)}
style={{ padding:"10px 14px", background:gold, border:"none
</div>
</div>
)}
</div>
</div>
);
})}
</div>
}
</div>
)}
</div>
{/* Bottom Nav */}
<div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.card, borderTop
{[
{ v:"today", icon:aesObj?.icon||"◈", label:"HOME" },
{ v:"goals", icon:"✦", label:"GOALS" },
{ v:"wall", icon:"◎", label:"CIRCLE" },
].map(({ v, icon, label }) => (
<button key={v} onClick={() => { setView(v); if(v==="wall") loadWall(); }}
style={{ background:"none", border:"none", display:"flex", flexDirection:"column"
<span style={{ fontSize:"20px", color: view===v?gold:T.muted }}>{icon}</span>
<span style={{ fontSize:"9px", letterSpacing:"2px", color: view===v?gold:T.muted
</button>
))}
)}
</div>
);
}
</div>
{/* Celebration */}
{celebrating && (
<div className="fi" style={{ position:"fixed", inset:0, background:"rgba(26,22,18,0.9
<p style={{ fontSize:"52px", marginBottom:"16px", color:gold, animation:"shimmer 1.
<p style={{ fontSize:"28px", fontWeight:"300", color:T.text, letterSpacing:"2px", m
<p style={{ fontSize:"12px", letterSpacing:"4px", color:gold }}>THE WOMAN YOU'RE BE
</div>
