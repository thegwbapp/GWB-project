import { useState, useEffect, useCallback } from “react”;
import { dbGet, dbInsert, dbUpdate, dbDelete, uploadImage } from “./api”;
import { AESTHETICS, QUESTIONS, QUOTES } from “./data”;

const today = () => new Date().toISOString().split(“T”)[0];
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(“en-US”, { month: “short”, day: “numeric” }); } catch(e) { return d; } };
const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];
const EMOJIS = [”\uD83D\uDD25”, “\uD83D\uDC9B”, “\u2728”, “\uD83D\uDCAA”, “\uD83D\uDE4F”];
const SERIF = “Georgia,‘Times New Roman’,serif”;

const T = {
bg: “#1a1612”, card: “#22201a”, border: “#2e2a22”, accent: “#3d3528”,
text: “#f0e8d8”, muted: “#8a7d68”, dim: “#4a4030”, gold: “#c9a84c”,
};

const CSS = `@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}} .fu{animation:fadeUp .5s ease both} .fu2{animation:fadeUp .5s .08s ease both} .fu3{animation:fadeUp .5s .16s ease both} .fu4{animation:fadeUp .5s .24s ease both} .fu5{animation:fadeUp .5s .32s ease both} .fu6{animation:fadeUp .5s .4s ease both} .fi{animation:fadeIn .35s ease both} *{box-sizing:border-box;margin:0;padding:0} body{background:#1a1612} button{cursor:pointer;transition:all .2s} button:active{opacity:.8;transform:scale(.98)} input::placeholder,textarea::placeholder{color:#4a4030} textarea{resize:none}`;

function CircleProgress({ pct, color }) {
const r = 38, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
return (
<svg width="96" height="96" viewBox="0 0 96 96">
<circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
<circle cx=“48” cy=“48” r={r} fill=“none” stroke={color} strokeWidth=“3”
strokeDasharray={dash + “ “ + circ} strokeDashoffset={circ / 4}
strokeLinecap=“round” style={{ transition: “stroke-dasharray 0.7s ease” }} />
<text x=“48” y=“53” textAnchor=“middle” fill={color}
style={{ fontSize: “17px”, fontFamily: SERIF, fontWeight: 600 }}>{pct}%</text>
</svg>
);
}

export default function App() {
const [screen, setScreen] = useState(“splash”);
const [emailInput, setEmailInput] = useState(””);
const [displayNameInput, setDisplayNameInput] = useState(””);
const [authError, setAuthError] = useState(””);
const [authLoading, setAuthLoading] = useState(false);
const [isNewUser, setIsNewUser] = useState(true);
const [user, setUser] = useState(null);
const [aesthetic, setAesthetic] = useState(null);
const [quizStep, setQuizStep] = useState(0);
const [quizScores, setQuizScores] = useState({ clean:0,soft:0,corporate:0,wellness:0,luxury:0 });
const [quizSelected, setQuizSelected] = useState(null);
const [quizKey, setQuizKey] = useState(0);
const [view, setView] = useState(“today”);
const [goals, setGoals] = useState([]);
const [checkins, setCheckins] = useState([]);
const [streak, setStreak] = useState(0);
const [newGoal, setNewGoal] = useState(””);
const [dataLoading, setDataLoading] = useState(false);
const [celebrating, setCelebrating] = useState(false);
const [aiMsg, setAiMsg] = useState(””);
const [loadingAI, setLoadingAI] = useState(false);
const [quote] = useState(randomQuote());
const [posts, setPosts] = useState([]);
const [postContent, setPostContent] = useState(””);
const [postImage, setPostImage] = useState(null);
const [postImagePreview, setPostImagePreview] = useState(null);
const [uploadingImage, setUploadingImage] = useState(false);
const [expandedPost, setExpandedPost] = useState(null);
const [replyText, setReplyText] = useState(””);
const [replies, setReplies] = useState({});
const [reactions, setReactions] = useState({});

const aesObj = aesthetic ? AESTHETICS[aesthetic] : null;
const gold = aesObj ? aesObj.color : T.gold;

useEffect(() => {
const t = setTimeout(async () => {
try {
const saved = localStorage.getItem(“gwb_uid”);
if (saved) {
const recs = await dbGet(“users”, “id=eq.” + saved + “&limit=1”);
if (recs && recs[0]) {
const u = recs[0];
setUser(u);
if (u.quiz_done && u.aesthetic) {
setAesthetic(u.aesthetic);
setScreen(“app”);
loadUserData(u);
return;
}
setScreen(“quiz”);
return;
}
}
} catch(e) { console.error(“init error”, e); }
setScreen(“setup”);
}, 1800);
return () => clearTimeout(t);
}, []);

const loadUserData = useCallback(async (u) => {
setDataLoading(true);
const [g, c] = await Promise.all([
dbGet(“goals”, “user_id=eq.” + u.id),
dbGet(“checkins”, “user_id=eq.” + u.id),
]);
setGoals(g || []);
const clist = c || [];
setCheckins(clist);
calcStreak(clist);
setDataLoading(false);
loadWall();
}, []);

const calcStreak = (data) => {
let count = 0;
const d = new Date();
for (let i = 0; i < 365; i++) {
const key = d.toISOString().split(“T”)[0];
if (data.some(r => r.date === key)) { count++; d.setDate(d.getDate() - 1); } else break;
}
setStreak(count);
};

const loadWall = async () => {
const p = await dbGet(“posts”, “limit=30”);
setPosts(p || []);
const r = await dbGet(“reactions”, “limit=200”);
const rMap = {};
(r || []).forEach(rec => {
if (!rMap[rec.post_id]) rMap[rec.post_id] = [];
rMap[rec.post_id].push(rec);
});
setReactions(rMap);
};

const loadReplies = async (postId) => {
const data = await dbGet(“replies”, “post_id=eq.” + postId + “&order=created_at.asc”);
setReplies(prev => ({ …prev, [postId]: data || [] }));
};

const handleAuth = async () => {
const email = emailInput.trim().toLowerCase();
const dname = displayNameInput.trim();
if (!email || !email.includes(”@”)) { setAuthError(“Please enter a valid email.”); return; }
setAuthLoading(true); setAuthError(””);

```
if (isNewUser) {
  if (!dname || dname.length < 2) { setAuthError("Pick a display name (2+ characters)."); setAuthLoading(false); return; }
  const existing = await dbGet("users", "email=eq." + encodeURIComponent(email) + "&limit=1");
  if (existing && existing[0]) { setAuthError("That email already has an account. Sign in instead."); setAuthLoading(false); return; }
  const nameCheck = await dbGet("users", "display_name=eq." + encodeURIComponent(dname) + "&limit=1");
  if (nameCheck && nameCheck[0]) { setAuthError("That display name is taken. Try another."); setAuthLoading(false); return; }
  const newUser = await dbInsert("users", { email: email, display_name: dname });
  if (!newUser || newUser.error) { setAuthError("Could not create account. Try again."); setAuthLoading(false); return; }
  try { localStorage.setItem("gwb_uid", newUser.id); } catch(e) {}
  setUser(newUser);
  setAuthLoading(false);
  setScreen("quiz");
} else {
  if (!dname || dname.length < 2) { setAuthError("Enter your display name to sign in."); setAuthLoading(false); return; }
  const found = await dbGet("users", "email=eq." + encodeURIComponent(email) + "&display_name=eq." + encodeURIComponent(dname) + "&limit=1");
  if (!found || !found[0]) { setAuthError("No account found. Check your email and display name."); setAuthLoading(false); return; }
  const u = found[0];
  try { localStorage.setItem("gwb_uid", u.id); } catch(e) {}
  setUser(u);
  setAuthLoading(false);
  if (u.quiz_done && u.aesthetic) {
    setAesthetic(u.aesthetic);
    setScreen("app");
    loadUserData(u);
  } else {
    setScreen("quiz");
  }
}
```

};

const handleQuizAnswer = async (option) => {
setQuizSelected(option);
setTimeout(async () => {
const ns = { …quizScores };
Object.entries(option.scores).forEach(([k, v]) => { ns[k] = (ns[k] || 0) + v; });
setQuizScores(ns);
setQuizSelected(null);
setQuizKey(k => k + 1);
if (quizStep < QUESTIONS.length - 1) {
setQuizStep(s => s + 1);
} else {
const winner = Object.entries(ns).sort((a, b) => b[1] - a[1])[0][0];
setAesthetic(winner);
if (user) await dbUpdate(“users”, user.id, { aesthetic: winner, quiz_done: true });
setUser(prev => ({ …prev, aesthetic: winner, quiz_done: true }));
setScreen(“result”);
}
}, 380);
};

const enterApp = async () => {
const suggested = AESTHETICS[aesthetic] ? AESTHETICS[aesthetic].goals : [];
const saved = [];
for (let i = 0; i < suggested.length; i++) {
const rec = await dbInsert(“goals”, { user_id: user.id, goal_text: suggested[i] });
if (rec) saved.push(rec);
}
setGoals(saved);
setScreen(“app”);
setView(“today”);
loadWall();
};

const addGoal = async () => {
if (!newGoal.trim()) return;
const text = newGoal.trim(); setNewGoal(””);
const rec = await dbInsert(“goals”, { user_id: user.id, goal_text: text });
if (rec) setGoals(prev => […prev, rec]);
};

const removeGoal = async (id) => {
setGoals(prev => prev.filter(g => g.id !== id));
await dbDelete(“goals”, id);
};

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
await dbDelete(“checkins”, rec.id);
}
} else {
const rec = await dbInsert(“checkins”, { user_id: user.id, goal_id: goal.id, goal_text: goal.goal_text, date: today(), streak: streak + 1, aesthetic: aesthetic });
if (rec) setCheckins(prev => […prev, rec]);
if (completedCount + 1 === goals.length && goals.length > 0) {
setCelebrating(true); setTimeout(() => setCelebrating(false), 4000);
}
}
};

const handleImageSelect = (e) => {
const file = e.target.files ? e.target.files[0] : null;
if (!file) return;
setPostImage(file);
setPostImagePreview(URL.createObjectURL(file));
};

const submitPost = async () => {
if (!postContent.trim() && !postImage) return;
const content = postContent.trim();
setPostContent(””); setPostImage(null); setPostImagePreview(null);
setUploadingImage(true);
let image_url = null;
if (postImage) image_url = await uploadImage(postImage);
setUploadingImage(false);
const rec = await dbInsert(“posts”, { user_id: user.id, display_name: user.display_name, content: content, image_url: image_url, aesthetic: aesthetic, streak: streak, date: today() });
if (rec) setPosts(prev => [rec, …prev]);
};

const toggleReaction = async (postId, emoji) => {
const postReactions = reactions[postId] || [];
const existing = postReactions.find(r => r.user_id === user.id && r.emoji === emoji);
if (existing) {
setReactions(prev => ({ …prev, [postId]: postReactions.filter(r => r.id !== existing.id) }));
await dbDelete(“reactions”, existing.id);
} else {
const rec = await dbInsert(“reactions”, { post_id: postId, user_id: user.id, emoji: emoji });
if (rec) setReactions(prev => ({ …prev, [postId]: […postReactions, rec] }));
}
};

const submitReply = async (postId) => {
if (!replyText.trim()) return;
const content = replyText.trim(); setReplyText(””);
const rec = await dbInsert(“replies”, { post_id: postId, user_id: user.id, display_name: user.display_name, content: content, aesthetic: aesthetic });
if (rec) setReplies(prev => ({ …prev, [postId]: […(prev[postId] || []), rec] }));
};

const getAINudge = async () => {
setLoadingAI(true); setAiMsg(””);
const done = goals.filter(g => checkedIds.has(g.id)).map(g => g.goal_text);
const pending = goals.filter(g => !checkedIds.has(g.id)).map(g => g.goal_text);
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1000,
system: “You are the voice of The GWB Project. Speak like The Grown Woman Blueprint: refined, warm, direct. No fluff. No emojis. 2-3 sentences. Address them by display name.”,
messages: [{ role: “user”, content: “Name: “ + (user ? user.display_name : “”) + “\nStreak: “ + streak + “ days\nCompleted: “ + (done.join(”, “) || “none yet”) + “\nPending: “ + (pending.join(”, “) || “all done!”) + “\nGive a personal nudge.” }],
}),
});
const data = await res.json();
const msg = data.content ? data.content.map(b => b.text || “”).join(””) : “”;
setAiMsg(msg || “The woman you are becoming is watching. Keep going.”);
} catch(e) { setAiMsg(“The woman you are becoming is watching. Keep going.”); }
setLoadingAI(false);
};

if (screen === “splash”) return (
<div style={{ minHeight:“100vh”, background:T.bg, display:“flex”, flexDirection:“column”, alignItems:“center”, justifyContent:“center”, fontFamily:SERIF }}>
<style>{CSS}</style>
<div style={{ textAlign:“center”, animation:“shimmer 2s infinite” }}>
<p style={{ fontSize:“10px”, letterSpacing:“6px”, color:T.muted, marginBottom:“12px” }}>THE</p>
<h1 style={{ fontSize:“52px”, fontWeight:“300”, color:T.text, letterSpacing:“4px”, lineHeight:1 }}>GWB</h1>
<div style={{ width:“30px”, height:“1px”, background:T.gold, margin:“14px auto” }} />
<p style={{ fontSize:“10px”, letterSpacing:“5px”, color:T.muted }}>PROJECT</p>
</div>
</div>
);

if (screen === “setup”) return (
<div style={{ minHeight:“100vh”, background:T.bg, fontFamily:SERIF, display:“flex”, alignItems:“center”, justifyContent:“center”, padding:“24px” }}>
<style>{CSS}</style>
<div style={{ width:“100%”, maxWidth:“400px” }}>
<div className=“fu” style={{ textAlign:“center”, marginBottom:“40px” }}>
<p style={{ fontSize:“10px”, letterSpacing:“6px”, color:T.muted, marginBottom:“10px” }}>THE</p>
<h1 style={{ fontSize:“44px”, fontWeight:“300”, color:T.text, letterSpacing:“3px”, lineHeight:1, marginBottom:“10px” }}>GWB Project</h1>
<div style={{ width:“36px”, height:“1px”, background:T.gold, margin:“0 auto 12px” }} />
<p style={{ fontSize:“11px”, letterSpacing:“3px”, color:T.muted }}>DAILY CHECK-IN</p>
</div>
<div className=“fu2” style={{ borderLeft:“2px solid “ + T.gold, padding:“12px 16px”, background:“rgba(201,168,76,0.04)”, borderRadius:“0 8px 8px 0”, marginBottom:“28px” }}>
<p style={{ fontStyle:“italic”, color:T.muted, fontSize:“15px”, lineHeight:1.6 }}>{quote}</p>
</div>
<div className=“fu3” style={{ display:“flex”, marginBottom:“16px”, background:T.card, border:“1px solid “ + T.border, borderRadius:“10px”, padding:“4px” }}>
{[[“Join the Circle”, true], [“Sign In”, false]].map(function(item) {
return (
<button key={item[0]} onClick={function() { setIsNewUser(item[1]); setAuthError(””); }}
style={{ flex:1, padding:“11px”, background: isNewUser===item[1] ? T.gold : “transparent”, border:“none”, color: isNewUser===item[1] ? T.bg : T.muted, fontSize:“12px”, letterSpacing:“2px”, borderRadius:“8px”, fontWeight: isNewUser===item[1] ? “600” : “400”, fontFamily:SERIF }}>
{item[0]}
</button>
);
})}
</div>
<div className=“fu4” style={{ background:T.card, border:“1px solid “ + T.border, borderRadius:“14px”, padding:“24px” }}>
<div style={{ display:“flex”, flexDirection:“column”, gap:“10px”, marginBottom:“10px” }}>
<input value={emailInput} onChange={function(e) { setEmailInput(e.target.value); setAuthError(””); }}
onKeyDown={function(e) { if(e.key===“Enter”) handleAuth(); }}
placeholder=“Your email address”
style={{ padding:“13px 16px”, background:T.bg, border:“1px solid “ + T.border, color:T.text, fontSize:“16px”, borderRadius:“8px”, outline:“none”, fontFamily:SERIF }} />
<input value={displayNameInput} onChange={function(e) { setDisplayNameInput(e.target.value); setAuthError(””); }}
onKeyDown={function(e) { if(e.key===“Enter”) handleAuth(); }}
placeholder={isNewUser ? “Choose a display name” : “Your display name”}
style={{ padding:“13px 16px”, background:T.bg, border:“1px solid “ + T.border, color:T.text, fontSize:“16px”, borderRadius:“8px”, outline:“none”, fontFamily:SERIF }} />
</div>
{authError && <p style={{ color:”#c07a5a”, fontSize:“13px”, fontStyle:“italic”, marginBottom:“10px”, lineHeight:1.5 }}>{authError}</p>}
<button onClick={handleAuth} disabled={authLoading}
style={{ width:“100%”, padding:“15px”, background:T.gold, border:“none”, color:T.bg, fontSize:“11px”, letterSpacing:“4px”, fontWeight:“600”, borderRadius:“8px”, opacity: authLoading ? 0.6 : 1, fontFamily:SERIF }}>
{authLoading ? “. . .” : isNewUser ? “ENTER THE CIRCLE” : “WELCOME BACK”}
</button>
</div>
</div>
</div>
);

if (screen === “quiz”) {
const q = QUESTIONS[quizStep];
const progress = (quizStep / QUESTIONS.length) * 100;
return (
<div style={{ minHeight:“100vh”, background:T.bg, fontFamily:SERIF, color:T.text, padding:“40px 20px 60px”, display:“flex”, flexDirection:“column”, alignItems:“center” }}>
<style>{CSS}</style>
<div style={{ width:“100%”, maxWidth:“460px” }}>
<div style={{ marginBottom:“36px” }}>
<div style={{ display:“flex”, justifyContent:“space-between”, marginBottom:“10px” }}>
<p style={{ fontSize:“10px”, letterSpacing:“4px”, color:T.muted }}>DISCOVER YOUR AESTHETIC</p>
<p style={{ fontSize:“12px”, color:T.dim }}>{quizStep+1} / {QUESTIONS.length}</p>
</div>
<div style={{ height:“2px”, background:T.accent, borderRadius:“1px”, overflow:“hidden” }}>
<div style={{ height:“100%”, width:progress + “%”, background:“linear-gradient(90deg,” + T.gold + “,#e8c97a)”, transition:“width 0.4s ease” }} />
</div>
</div>
<div key={“q” + quizKey} className=“fu” style={{ marginBottom:“28px” }}>
<h2 style={{ fontSize:“25px”, fontWeight:“400”, color:T.text, lineHeight:1.5, fontStyle:“italic” }}>{q.question}</h2>
</div>
<div key={“o” + quizKey} style={{ display:“flex”, flexDirection:“column”, gap:“10px” }}>
{q.options.map(function(opt, i) {
const isSel = quizSelected === opt;
return (
<button key={i} onClick={function() { handleQuizAnswer(opt); }}
style={{ padding:“15px 20px”, background: isSel ? “rgba(201,168,76,0.1)” : T.card, border:“1px solid “ + (isSel ? T.gold : T.border), borderRadius:“10px”, textAlign:“left”, color: isSel ? T.gold : T.text, fontSize:“15px”, lineHeight:1.5, fontStyle:“italic”, fontFamily:SERIF }}>
{opt.text}
</button>
);
})}
</div>
</div>
</div>
);
}

if (screen === “result” && aesObj) return (
<div style={{ minHeight:“100vh”, background:T.bg, fontFamily:SERIF, color:T.text, display:“flex”, alignItems:“center”, justifyContent:“center”, padding:“40px 20px” }}>
<style>{CSS}</style>
<div style={{ width:“100%”, maxWidth:“440px”, textAlign:“center” }}>
<p className=“fu” style={{ fontSize:“10px”, letterSpacing:“6px”, color:T.muted, marginBottom:“16px” }}>YOU ARE</p>
<p className=“fu2” style={{ fontSize:“56px”, color:gold, lineHeight:1, marginBottom:“8px” }}>{aesObj.icon}</p>
<h1 className=“fu3” style={{ fontSize:“34px”, fontWeight:“400”, color:T.text, letterSpacing:“1px”, lineHeight:1.2, marginBottom:“6px” }}>{aesObj.name}</h1>
<p className=“fu4” style={{ fontSize:“11px”, letterSpacing:“4px”, color:gold, marginBottom:“22px” }}>{aesObj.tagline.toUpperCase()}</p>
<div className=“fu4” style={{ width:“40px”, height:“1px”, background:gold, margin:“0 auto 22px” }} />
<div className=“fu4” style={{ background:T.card, border:“1px solid “ + T.border, borderRadius:“12px”, padding:“22px”, marginBottom:“14px”, textAlign:“left” }}>
<p style={{ fontSize:“16px”, lineHeight:1.85, color:T.muted, fontStyle:“italic” }}>{aesObj.description}</p>
</div>
<div className=“fu5” style={{ background:T.card, border:“1px solid “ + T.border, borderRadius:“12px”, padding:“20px”, marginBottom:“22px”, textAlign:“left” }}>
<p style={{ fontSize:“10px”, letterSpacing:“4px”, color:T.muted, marginBottom:“16px” }}>YOUR NON-NEGOTIABLES</p>
{aesObj.goals.map(function(g, i) {
return (
<div key={i} style={{ display:“flex”, alignItems:“center”, gap:“12px”, padding:“11px 0”, borderTop: i>0 ? “1px solid “ + T.border : “none” }}>
<span style={{ color:gold, fontSize:“13px”, flexShrink:0 }}>{aesObj.icon}</span>
<span style={{ fontSize:“15px”, color:T.text, fontStyle:“italic” }}>{g}</span>
</div>
);
})}
</div>
<button className=“fu6” onClick={enterApp}
style={{ width:“100%”, padding:“16px”, background:gold, border:“none”, color:T.bg, fontSize:“11px”, letterSpacing:“4px”, fontWeight:“600”, borderRadius:“10px”, fontFamily:SERIF }}>
BEGIN MY DAILY CHECK-IN
</button>
</div>
</div>
);

return (
<div style={{ minHeight:“100vh”, background:T.bg, fontFamily:SERIF, color:T.text, paddingBottom:“90px” }}>
<style>{CSS}</style>
<div style={{ position:“fixed”, top:0, left:0, right:0, height:“160px”, background:“radial-gradient(ellipse at 70% 0%, “ + gold + “18 0%, transparent 70%)”, pointerEvents:“none”, zIndex:0 }} />
<div style={{ maxWidth:“480px”, margin:“0 auto”, padding:“0 18px”, position:“relative”, zIndex:1 }}>

```
    <div style={{ padding:"26px 0 14px" }}>
      <p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted, marginBottom:"2px" }}>THE GROWN WOMAN</p>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ fontSize:"28px", fontWeight:"400", color:T.text, letterSpacing:"1px" }}>GWB Project</h1>
        {streak > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", background:gold + "18", border:"1px solid " + gold + "44", borderRadius:"20px" }}>
            <span style={{ color:gold, fontSize:"10px" }}>{aesObj ? aesObj.icon : ""}</span>
            <span style={{ fontSize:"11px", color:gold, letterSpacing:"1px" }}>{streak}d streak</span>
          </div>
        )}
      </div>
    </div>

    <div style={{ borderLeft:"2px solid " + gold, padding:"11px 14px", background:gold + "08", borderRadius:"0 8px 8px 0", marginBottom:"14px" }}>
      <p style={{ fontStyle:"italic", color:T.muted, fontSize:"14px", lineHeight:1.5 }}>{quote}</p>
    </div>

    {aesObj && (
      <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", background:T.card, border:"1px solid " + T.border, borderRadius:"10px", marginBottom:"14px" }}>
        <span style={{ fontSize:"18px", color:gold }}>{aesObj.icon}</span>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:"11px", color:gold, letterSpacing:"2px" }}>{aesObj.name.toUpperCase()}</p>
          <p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic" }}>{aesObj.tagline}</p>
        </div>
        <p style={{ fontSize:"11px", color:T.dim, fontStyle:"italic" }}>@{user ? user.display_name : ""}</p>
      </div>
    )}

    {view==="today" && goals.length > 0 && (
      <div style={{ background:T.card, border:"1px solid " + T.border, borderRadius:"14px", padding:"18px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"18px" }}>
        <CircleProgress pct={pct} color={gold} />
        <div>
          <p style={{ fontSize:"19px", fontWeight:"400", color:T.text, marginBottom:"4px" }}>Today's Alignment</p>
          <p style={{ fontSize:"13px", color:T.muted, marginBottom:"5px" }}>{completedCount} of {goals.length} non-negotiables</p>
          <p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic", lineHeight:1.4 }}>
            {pct===100 ? "Fully aligned. You showed up." : pct>=50 ? "You are in motion. Keep going." : "Your day is waiting for you."}
          </p>
        </div>
      </div>
    )}

    {view==="today" && goals.length > 0 && (
      <div style={{ marginBottom:"12px" }}>
        <button onClick={getAINudge} disabled={loadingAI}
          style={{ width:"100%", padding:"12px", background:"transparent", border:"1px solid " + gold, color:gold, fontSize:"11px", letterSpacing:"3px", borderRadius:"10px", opacity: loadingAI ? 0.6 : 1, fontFamily:SERIF }}>
          {loadingAI ? ". . ." : (aesObj ? aesObj.icon : "") + "  RECEIVE YOUR NUDGE"}
        </button>
        {aiMsg && (
          <div className="fi" style={{ marginTop:"10px", padding:"14px 16px", background:T.card, border:"1px solid " + T.border, borderLeft:"3px solid " + gold, borderRadius:"0 10px 10px 0" }}>
            <p style={{ fontSize:"10px", letterSpacing:"3px", color:gold, marginBottom:"6px" }}>GWB SAYS</p>
            <p style={{ fontSize:"15px", lineHeight:1.7, color:T.muted, fontStyle:"italic" }}>{aiMsg}</p>
          </div>
        )}
      </div>
    )}

    {dataLoading && <div style={{ textAlign:"center", padding:"50px 0", color:T.dim, letterSpacing:"4px", fontSize:"11px", animation:"shimmer 1.5s infinite" }}>LOADING</div>}

    {!dataLoading && view==="today" && (
      <div>
        {goals.length===0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:T.dim }}>
            <p style={{ fontSize:"26px", marginBottom:"12px", color:gold, opacity:.4 }}>{aesObj ? aesObj.icon : ""}</p>
            <p style={{ fontSize:"15px", fontStyle:"italic", lineHeight:1.8, color:T.muted }}>No non-negotiables yet. Head to Goals to add some.</p>
          </div>
        ) : (
          <div style={{ background:T.card, border:"1px solid " + T.border, borderRadius:"14px", padding:"18px", marginBottom:"12px" }}>
            <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"16px" }}>NON-NEGOTIABLES</p>
            {goals.map(function(goal, i) {
              const done = checkedIds.has(goal.id);
              return (
                <button key={goal.id} onClick={function() { toggleCheckin(goal); }}
                  style={{ display:"flex", alignItems:"center", gap:"14px", background:"none", border:"none", borderTop: i>0 ? "1px solid " + T.border : "none", padding:"13px 0", textAlign:"left", width:"100%", fontFamily:SERIF }}>
                  <div style={{ width:"22px", height:"22px", flexShrink:0, borderRadius:"50%", border:"2px solid " + (done ? gold : T.accent), background: done ? gold + "22" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                    {done && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:gold }} />}
                  </div>
                  <span style={{ fontSize:"16px", color: done ? T.dim : T.text, textDecoration: done ? "line-through" : "none", fontStyle:"italic", lineHeight:1.4, transition:"all 0.3s" }}>{goal.goal_text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    )}

    {!dataLoading && view==="goals" && (
      <div>
        <div style={{ display:"flex", marginBottom:"12px" }}>
          <input value={newGoal} onChange={function(e) { setNewGoal(e.target.value); }} onKeyDown={function(e) { if(e.key==="Enter") addGoal(); }} placeholder="Add a non-negotiable..."
            style={{ flex:1, padding:"13px 16px", background:T.card, border:"1px solid " + T.border, borderRight:"none", color:T.text, fontSize:"15px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic", fontFamily:SERIF }} />
          <button onClick={addGoal} style={{ padding:"13px 18px", background:gold, border:"none", color:T.bg, fontSize:"20px", borderRadius:"0 8px 8px 0", fontFamily:SERIF }}>+</button>
        </div>
        {goals.length===0
          ? <div style={{ textAlign:"center", padding:"36px 0", color:T.dim, fontSize:"15px", fontStyle:"italic" }}>Add the non-negotiables you commit to daily.</div>
          : <div style={{ background:T.card, border:"1px solid " + T.border, borderRadius:"14px", overflow:"hidden" }}>
              {goals.map(function(goal, i) {
                return (
                  <div key={goal.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", borderTop: i>0 ? "1px solid " + T.border : "none" }}>
                    <span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj ? aesObj.icon : ""}</span>
                    <span style={{ flex:1, fontSize:"15px", color:T.text, lineHeight:1.4, fontStyle:"italic" }}>{goal.goal_text}</span>
                    <button onClick={function() { removeGoal(goal.id); }} style={{ background:"none", border:"none", color:T.dim, fontSize:"18px", padding:"0 4px", fontFamily:SERIF }}>x</button>
                  </div>
                );
              })}
            </div>
        }
        <button onClick={function() { setQuizStep(0); setQuizScores({clean:0,soft:0,corporate:0,wellness:0,luxury:0}); setQuizKey(0); setScreen("quiz"); }}
          style={{ width:"100%", marginTop:"14px", padding:"12px", background:"transparent", border:"1px solid " + T.border, color:T.muted, fontSize:"11px", letterSpacing:"3px", borderRadius:"10px", fontFamily:SERIF }}>
          RETAKE AESTHETIC QUIZ
        </button>
      </div>
    )}

    {view==="wall" && (
      <div>
        <div style={{ background:T.card, border:"1px solid " + T.border, borderRadius:"14px", padding:"16px", marginBottom:"16px" }}>
          <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"12px" }}>SHARE WITH THE CIRCLE</p>
          <textarea value={postContent} onChange={function(e) { setPostContent(e.target.value); }} placeholder="A win, reflection, or encouragement..." rows={3}
            style={{ width:"100%", padding:"12px 14px", background:T.bg, border:"1px solid " + T.border, color:T.text, fontSize:"15px", borderRadius:"8px", outline:"none", fontStyle:"italic", lineHeight:1.6, marginBottom:"10px", fontFamily:SERIF }} />
          {postImagePreview && (
            <div style={{ position:"relative", marginBottom:"10px" }}>
              <img src={postImagePreview} alt="preview" style={{ width:"100%", borderRadius:"8px", maxHeight:"200px", objectFit:"cover" }} />
              <button onClick={function() { setPostImage(null); setPostImagePreview(null); }}
                style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(26,22,18,0.8)", border:"none", color:T.text, width:"28px", height:"28px", borderRadius:"50%", fontSize:"16px", fontFamily:SERIF }}>x</button>
            </div>
          )}
          <div style={{ display:"flex", gap:"8px" }}>
            <label style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 14px", background:T.bg, border:"1px solid " + T.border, borderRadius:"8px", cursor:"pointer", fontSize:"12px", color:T.muted, fontFamily:SERIF }}>
              PHOTO
              <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display:"none" }} />
            </label>
            <button onClick={submitPost} disabled={uploadingImage || (!postContent.trim() && !postImage)}
              style={{ flex:1, padding:"10px", background:gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"3px", fontWeight:"600", borderRadius:"8px", opacity:(!postContent.trim()&&!postImage) ? 0.5 : 1, fontFamily:SERIF }}>
              {uploadingImage ? "UPLOADING..." : "POST"}
            </button>
          </div>
        </div>

        {posts.length===0
          ? <div style={{ textAlign:"center", padding:"40px 0", color:T.dim, fontSize:"15px", fontStyle:"italic" }}>Be the first to share with the circle.</div>
          : <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              {posts.map(function(post) {
                const postAes = post.aesthetic ? AESTHETICS[post.aesthetic] : null;
                const postReactions = reactions[post.id] || [];
                const isExpanded = expandedPost === post.id;
                const postReplies = replies[post.id] || [];
                const reactionCounts = {};
                postReactions.forEach(function(r) { reactionCounts[r.emoji] = (reactionCounts[r.emoji]||0)+1; });
                const myReactions = new Set(postReactions.filter(function(r) { return r.user_id === (user ? user.id : ""); }).map(function(r) { return r.emoji; }));
                return (
                  <div key={post.id} style={{ background:T.card, border:"1px solid " + T.border, borderRadius:"14px", overflow:"hidden" }}>
                    <div style={{ padding:"14px 16px 0" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          {postAes && <span style={{ color:postAes.color, fontSize:"14px" }}>{postAes.icon}</span>}
                          <span style={{ fontSize:"13px", color:gold, letterSpacing:"1px" }}>@{post.display_name}</span>
                        </div>
                        <span style={{ fontSize:"11px", color:T.dim }}>{fmtDate(post.date || post.created_at)}</span>
                      </div>
                      {post.content && <p style={{ fontSize:"16px", lineHeight:1.65, color:T.text, fontStyle:"italic", marginBottom:"10px" }}>"{post.content}"</p>}
                      {post.image_url && <img src={post.image_url} alt="post" style={{ width:"100%", borderRadius:"8px", maxHeight:"280px", objectFit:"cover", marginBottom:"10px" }} />}
                      {post.streak > 1 && <p style={{ fontSize:"11px", color:T.dim, marginBottom:"10px" }}>{postAes ? postAes.icon : ""} {post.streak} day streak</p>}
                    </div>
                    <div style={{ padding:"0 16px 10px", display:"flex", gap:"6px", flexWrap:"wrap" }}>
                      {EMOJIS.map(function(emoji) {
                        const count = reactionCounts[emoji]||0;
                        const mine = myReactions.has(emoji);
                        return (
                          <button key={emoji} onClick={function() { toggleReaction(post.id, emoji); }}
                            style={{ padding:"4px 10px", background: mine ? gold + "22" : T.bg, border:"1px solid " + (mine ? gold : T.border), borderRadius:"20px", fontSize:"13px", color: mine ? gold : T.muted, display:"flex", alignItems:"center", gap:"4px", fontFamily:SERIF }}>
                            {emoji}{count>0 && <span style={{ fontSize:"11px" }}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ borderTop:"1px solid " + T.border }}>
                      <button onClick={function() { if(!isExpanded){setExpandedPost(post.id);loadReplies(post.id);}else setExpandedPost(null); }}
                        style={{ width:"100%", padding:"10px 16px", background:"none", border:"none", color:T.dim, fontSize:"12px", letterSpacing:"2px", textAlign:"left", fontFamily:SERIF }}>
                        {isExpanded ? "HIDE REPLIES" : "REPLIES" + (postReplies.length>0 ? " (" + postReplies.length + ")" : "")}
                      </button>
                      {isExpanded && (
                        <div style={{ padding:"0 16px 14px" }}>
                          {postReplies.map(function(reply, i) {
                            const rAes = reply.aesthetic ? AESTHETICS[reply.aesthetic] : null;
                            return (
                              <div key={reply.id} style={{ padding:"10px 0", borderTop: i>0 ? "1px solid " + T.border : "none", display:"flex", gap:"10px" }}>
                                <span style={{ color:rAes ? rAes.color : T.muted, fontSize:"13px", flexShrink:0, marginTop:"2px" }}>{rAes ? rAes.icon : ""}</span>
                                <div>
                                  <span style={{ fontSize:"12px", color:gold, letterSpacing:"1px", marginRight:"8px" }}>@{reply.display_name}</span>
                                  <p style={{ fontSize:"14px", color:T.muted, lineHeight:1.5, fontStyle:"italic", marginTop:"2px" }}>{reply.content}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                            <input value={replyText} onChange={function(e) { setReplyText(e.target.value); }} onKeyDown={function(e) { if(e.key==="Enter") submitReply(post.id); }}
                              placeholder="Write a reply..." style={{ flex:1, padding:"10px 12px", background:T.bg, border:"1px solid " + T.border, color:T.text, fontSize:"14px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic", fontFamily:SERIF }} />
                            <button onClick={function() { submitReply(post.id); }}
                              style={{ padding:"10px 14px", background:gold, border:"none", color:T.bg, fontSize:"15px", borderRadius:"0 8px 8px 0", fontFamily:SERIF }}>-</button>
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

  <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.card, borderTop:"1px solid " + T.border, display:"flex", justifyContent:"space-around", padding:"10px 0 20px", zIndex:50 }}>
    {[["today", aesObj ? aesObj.icon : "HOME", "HOME"], ["goals", "+", "GOALS"], ["wall", "O", "CIRCLE"]].map(function(item) {
      return (
        <button key={item[0]} onClick={function() { setView(item[0]); if(item[0]==="wall") loadWall(); }}
          style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", opacity: view===item[0] ? 1 : 0.35, fontFamily:SERIF }}>
          <span style={{ fontSize:"20px", color: view===item[0] ? gold : T.muted }}>{item[1]}</span>
          <span style={{ fontSize:"9px", letterSpacing:"2px", color: view===item[0] ? gold : T.muted }}>{item[2]}</span>
        </button>
      );
    })}
  </div>

  {celebrating && (
    <div className="fi" style={{ position:"fixed", inset:0, background:"rgba(26,22,18,0.97)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <p style={{ fontSize:"52px", marginBottom:"16px", color:gold, animation:"shimmer 1.5s infinite" }}>{aesObj ? aesObj.icon : ""}</p>
      <p style={{ fontSize:"28px", fontWeight:"300", color:T.text, letterSpacing:"2px", marginBottom:"10px" }}>Fully Aligned.</p>
      <p style={{ fontSize:"12px", letterSpacing:"4px", color:gold }}>THE WOMAN YOU ARE BECOMING IS PROUD.</p>
    </div>
  )}
</div>
```

);
}
