import { useState, useEffect, useCallback } from "react";
import { AESTHETICS, QUESTIONS, QUOTES } from "./data";
import { atGet, atPost, atPatch, atDelete, uploadImage } from "./api";

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; } };
const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];
const EMOJIS = ["\uD83D\uDD25", "\uD83D\uDC9B", "\u2728", "\uD83D\uDCAA", "\uD83D\uDE4F"];


function CircleProgress({ pct, color }) {
  const r = 38, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 0.7s ease" }} />
      <text x="48" y="53" textAnchor="middle" fill={color}
        style={{ fontSize: "17px", fontFamily: "Georgia, serif", fontWeight: 600 }}>{pct}%</text>
    </svg>
  );
}

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
  button{cursor:pointer;font-family:Georgia,serif;transition:all .2s}
  button:active{opacity:.8;transform:scale(.98)}
  input,textarea{font-family:Georgia,serif}
  input::placeholder,textarea::placeholder{color:#4a4030}
  textarea{resize:none}
`;

const T = {
  bg:"#1a1612", card:"#22201a", border:"#2e2a22", accent:"#3d3528",
  text:"#f0e8d8", muted:"#8a7d68", dim:"#4a4030",
  gold:"#c9a84c", serif:"Georgia,'Times New Roman',serif",
};

export default function App() {
  const [screen, setScreen] = useState("splash");
  const [emailInput, setEmailInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isNewUser, setIsNewUser] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [aesthetic, setAesthetic] = useState(null);
  const [quizStep, setQuizStep] = useState(0);
  const [quizScores, setQuizScores] = useState({ clean:0,soft:0,corporate:0,wellness:0,luxury:0 });
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
  const [wallLoading, setWallLoading] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState({});
  const [reactions, setReactions] = useState({});
  const [postingReply, setPostingReply] = useState(false);

  const aesObj = aesthetic ? AESTHETICS[aesthetic] : null;
  const gold = aesObj?.color || T.gold;

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const saved = localStorage.getItem("gwb_email");
        if (saved) {
          const recs = await atGet("Table 1", `{Username}="${saved}"`);
          if (recs[0]) {
            const u = { id: recs[0].id, ...recs[0].fields, Displayname: saved };
            setUser(u);
            if (localStorage.getItem("gwb_quizdone") === "yes" && localStorage.getItem("gwb_aesthetic")) {
              setAesthetic(localStorage.getItem("gwb_aesthetic"));
              setScreen("app");
              loadUserData(u);
            } else {
              setScreen("quiz");
            }
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
    const [g, c] = await Promise.all([
      atGet("Table 2", `{Username}="${u.Displayname}"`),
      atGet("Table 3", `{Username}="${u.Displayname}"`),
    ]);
    setGoals(g.map(r => ({ id: r.id, ...r.fields })));
    const clist = c.map(r => ({ id: r.id, ...r.fields }));
    setCheckins(clist);
    calcStreak(clist);
    setDataLoading(false);
    loadWall();
  }, []);

  const loadWall = async () => {
    setWallLoading(true);
    const p = await atGet("Post");
    const postList = p.map(r => ({ id: r.id, ...r.fields })).slice(0, 30);
    setPosts(postList);
    setWallLoading(false);
    const allReactions = await atGet("Reactions");
    const rMap = {};
    allReactions.forEach(r => {
      const f = r.fields;
      if (!rMap[f.PostId]) rMap[f.PostId] = [];
      rMap[f.PostId].push({ id: r.id, ...f });
    });
    setReactions(rMap);
  };

  const loadReplies = async (postId) => {
    const r = await atGet("Replies", `{PostId}="${postId}"`);
    setReplies(prev => ({ ...prev, [postId]: r.map(rec => ({ id: rec.id, ...rec.fields })) }));
  };

  const calcStreak = (data) => {
    let count = 0; const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().split("T")[0];
      if (data.some(r => r.Date === key)) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    setStreak(count);
  };

  const handleAuth = async () => {
    const email = emailInput.trim().toLowerCase();
    const dname = displayNameInput.trim();
    if (!email || !email.includes("@")) { setAuthError("Please enter a valid email."); return; }
    if (!dname || dname.length < 2) { setAuthError("Pick a display name (2+ characters)."); return; }
    setAuthLoading(true); setAuthError("");
    const existing = await atGet("Table 1", `{Username}="${dname}"`);
    if (isNewUser) {
      if (existing.length > 0) { setAuthError("That name is taken. Try another."); setAuthLoading(false); return; }
      const rec = await atPost("Table 1", { Username: dname });
      if (!rec) { setAuthError("Could not connect. Try again."); setAuthLoading(false); return; }
      const u = { id: rec.id, ...rec.fields, Displayname: dname, Email: email };
      setUser(u);
      try { localStorage.setItem("gwb_email", dname); } catch {}
      setAuthLoading(false);
      setScreen("quiz");
    } else {
      if (existing.length === 0) { setAuthError("Name not found. Check spelling or join fresh."); setAuthLoading(false); return; }
      const u = { id: existing[0].id, ...existing[0].fields, Displayname: dname, Email: email };
      setUser(u);
      try { localStorage.setItem("gwb_email", dname); } catch {}
      setAuthLoading(false);
      if (localStorage.getItem("gwb_quizdone") === "yes" && localStorage.getItem("gwb_aesthetic")) {
        setAesthetic(localStorage.getItem("gwb_aesthetic"));
        setScreen("app");
        loadUserData(u);
      } else {
        setScreen("quiz");
      }
    }
  };

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
        try { localStorage.setItem("gwb_aesthetic", winner); localStorage.setItem("gwb_quizdone", "yes"); } catch {}
        setScreen("result");
      }
    }, 380);
  };

  const enterApp = async () => {
    const suggested = AESTHETICS[aesthetic]?.goals || [];
    const saved = [];
    for (const text of suggested) {
      const rec = await atPost("Table 2", { Username: user.Displayname, GoalText: text, CreatedAt: today() });
      saved.push({ id: rec?.id || "tmp_" + Date.now(), Username: user.Displayname, GoalText: text });
    }
    setGoals(saved);
    setScreen("app");
    setView("today");
    loadWall();
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const text = newGoal.trim(); setNewGoal("");
    const tempId = "tmp_" + Date.now();
    setGoals(prev => [...prev, { id: tempId, Username: user.Displayname, GoalText: text }]);
    const rec = await atPost("Table 2", { Username: user.Displayname, GoalText: text, CreatedAt: today() });
    if (rec) setGoals(prev => prev.map(g => g.id === tempId ? { id: rec.id, Username: user.Displayname, GoalText: text } : g));
  };

  const removeGoal = async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (!id.startsWith("tmp_")) await atDelete("Table 2", id);
  };

  const todayCheckins = checkins.filter(c => c.Date === today());
  const checkedIds = new Set(todayCheckins.map(c => c.GoalId));
  const completedCount = goals.filter(g => checkedIds.has(g.id)).length;
  const pct = goals.length ? Math.round((completedCount / goals.length) * 100) : 0;

  const toggleCheckin = async (goal) => {
    const done = checkedIds.has(goal.id);
    if (done) {
      const rec = todayCheckins.find(c => c.GoalId === goal.id);
      if (rec) { setCheckins(prev => prev.filter(c => c.id !== rec.id)); if (!rec.id?.startsWith("tmp_")) await atDelete("Table 3", rec.id); }
    } else {
      const tempId = "tmp_" + Date.now();
      setCheckins(prev => [...prev, { id: tempId, Username: user.Displayname, GoalText: goal.GoalText, Date: today(), GoalId: goal.id }]);
      if (completedCount + 1 === goals.length && goals.length > 0) { setCelebrating(true); setTimeout(() => setCelebrating(false), 4000); }
      const rec = await atPost("Table 3", { Username: user.Displayname, GoalText: goal.GoalText, Date: today(), GoalId: goal.id, Streak: streak + 1 });
      if (rec) setCheckins(prev => prev.map(c => c.id === tempId ? { ...c, id: rec.id } : c));
    }
  };

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
    let imageUrl = null;
    if (postImage) imageUrl = await uploadImage(postImage);
    setUploadingImage(false);
    const tempId = "tmp_" + Date.now();
    const newPost = { id: tempId, Userid: user.id, Displayname: user.Displayname, Content: content, ImageUrl: imageUrl, Aesthetic: aesthetic, Streak: streak, Date: today() };
    setPosts(prev => [newPost, ...prev]);
    const rec = await atPost("Post", { Userid: user.id, Displayname: user.Displayname, Content: content, ImageUrl: imageUrl || "", Aesthetic: aesthetic, Streak: streak, Date: today() });
    if (rec) setPosts(prev => prev.map(p => p.id === tempId ? { ...p, id: rec.id } : p));
  };

  const toggleReaction = async (postId, emoji) => {
    const postReactions = reactions[postId] || [];
    const existing = postReactions.find(r => r.UserId === user.id && r.Emoji === emoji);
    if (existing) {
      setReactions(prev => ({ ...prev, [postId]: postReactions.filter(r => r.id !== existing.id) }));
      await atDelete("Reactions", existing.id);
    } else {
      const tempId = "tmp_" + Date.now();
      setReactions(prev => ({ ...prev, [postId]: [...postReactions, { id: tempId, PostId: postId, UserId: user.id, Emoji: emoji }] }));
      const rec = await atPost("Reactions", { PostId: postId, UserId: user.id, Emoji: emoji });
      if (rec) setReactions(prev => ({ ...prev, [postId]: (prev[postId] || []).map(r => r.id === tempId ? { ...r, id: rec.id } : r) }));
    }
  };

  const submitReply = async (postId) => {
    if (!replyText.trim()) return;
    const content = replyText.trim(); setReplyText(""); setPostingReply(true);
    const tempId = "tmp_" + Date.now();
    setReplies(prev => ({ ...prev, [postId]: [...(prev[postId] || []), { id: tempId, PostId: postId, UserId: user.id, DisplayName: user.Displayname, Content: content, Aesthetic: aesthetic }] }));
    const rec = await atPost("Replies", { PostId: postId, UserId: user.id, DisplayName: user.Displayname, Content: content, Aesthetic: aesthetic, Date: today() });
    if (rec) setReplies(prev => ({ ...prev, [postId]: (prev[postId] || []).map(r => r.id === tempId ? { ...r, id: rec.id } : r) }));
    setPostingReply(false);
  };

  const getAINudge = async () => {
    setLoadingAI(true); setAiMsg("");
    const done = goals.filter(g => checkedIds.has(g.id)).map(g => g.GoalText);
    const pending = goals.filter(g => !checkedIds.has(g.id)).map(g => g.GoalText);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are the voice of Be Her Daily — The Grown Woman Blueprint. Speak in the tone of The Grown Woman Blueprint: refined, warm, direct. No fluff. No emojis. 2-3 sentences. The user's aesthetic is ${aesObj?.name} — "${aesObj?.tagline}". Address them by display name.`,
          messages: [{ role: "user", content: `Name: ${user?.Displayname}\nAesthetic: ${aesObj?.name}\nStreak: ${streak} days\nCompleted: ${done.join(", ") || "none yet"}\nPending: ${pending.join(", ") || "all done!"}\nGive a personal nudge.` }],
        }),
      });
      const data = await res.json();
      setAiMsg(data.content?.map(b => b.text || "").join("") || "The woman you're becoming is watching. Keep going.");
    } catch { setAiMsg("The woman you're becoming is watching. Keep going."); }
    setLoadingAI(false);
  };

  if (screen === "splash") return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:T.serif }}>
      <style>{CSS}</style>
      <div style={{ textAlign:"center", animation:"shimmer 2s infinite" }}>
        <p style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"12px" }}>BE HER</p>
        <h1 style={{ fontSize:"52px", fontWeight:"300", color:T.text, letterSpacing:"4px", lineHeight:1 }}>DAILY</h1>
        <div style={{ width:"30px", height:"1px", background:T.gold, margin:"14px auto" }} />
        <p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted }}>THE GROWN WOMAN BLUEPRINT</p>
      </div>
    </div>
  );

  if (screen === "setup") return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.serif, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:"400px" }}>
        <div className="fu" style={{ textAlign:"center", marginBottom:"40px" }}>
          <p style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"10px" }}>BE HER</p>
          <h1 style={{ fontSize:"44px", fontWeight:"300", color:T.text, letterSpacing:"3px", lineHeight:1, marginBottom:"10px" }}>Daily</h1>
          <div style={{ width:"36px", height:"1px", background:T.gold, margin:"0 auto 12px" }} />
          <p style={{ fontSize:"11px", letterSpacing:"3px", color:T.muted }}>THE GROWN WOMAN BLUEPRINT</p>
        </div>
        <div className="fu2" style={{ borderLeft:`2px solid ${T.gold}`, padding:"12px 16px", background:"rgba(201,168,76,0.04)", borderRadius:"0 8px 8px 0", marginBottom:"28px" }}>
          <p style={{ fontStyle:"italic", color:T.muted, fontSize:"15px", lineHeight:1.6 }}>{quote}</p>
        </div>
        <div className="fu3" style={{ display:"flex", marginBottom:"20px", background:T.card, border:`1px solid ${T.border}`, borderRadius:"10px", padding:"4px" }}>
          {[["Join the Circle", true], ["Sign In", false]].map(([label, val]) => (
            <button key={label} onClick={() => { setIsNewUser(val); setAuthError(""); }}
              style={{ flex:1, padding:"11px", background: isNewUser === val ? T.gold : "transparent", border:"none", color: isNewUser === val ? T.bg : T.muted, fontSize:"12px", letterSpacing:"2px", borderRadius:"8px", fontWeight: isNewUser === val ? "600" : "400" }}>
              {label}
            </button>
          ))}
        </div>
        <div className="fu4" style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"24px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"10px" }}>
            <input value={emailInput} onChange={e => { setEmailInput(e.target.value); setAuthError(""); }} placeholder="Your email address" style={{ padding:"13px 16px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"16px", borderRadius:"8px", outline:"none" }} />
            <input value={displayNameInput} onChange={e => { setDisplayNameInput(e.target.value); setAuthError(""); }} placeholder="Your display name" style={{ padding:"13px 16px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"16px", borderRadius:"8px", outline:"none" }} />
          </div>
          {authError && <p style={{ color:"#c07a5a", fontSize:"13px", fontStyle:"italic", marginBottom:"10px", lineHeight:1.5 }}>{authError}</p>}
          <button onClick={handleAuth} disabled={authLoading} style={{ width:"100%", padding:"15px", background:T.gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"4px", fontWeight:"600", borderRadius:"8px", opacity: authLoading ? 0.6 : 1 }}>
            {authLoading ? "·  ·  ·" : isNewUser ? "ENTER THE CIRCLE" : "WELCOME BACK"}
          </button>
        </div>
      </div>
    </div>
  );

  if (screen === "quiz") {
    const q = QUESTIONS[quizStep];
    const progress = (quizStep / QUESTIONS.length) * 100;
    return (
      <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.serif, color:T.text, padding:"40px 20px 60px", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <style>{CSS}</style>
        <div style={{ width:"100%", maxWidth:"460px" }}>
          <div style={{ marginBottom:"36px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
              <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted }}>DISCOVER YOUR AESTHETIC</p>
              <p style={{ fontSize:"12px", color:T.dim }}>{quizStep + 1} / {QUESTIONS.length}</p>
            </div>
            <div style={{ height:"2px", background:T.accent, borderRadius:"1px", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${T.gold},#e8c97a)`, transition:"width 0.4s ease" }} />
            </div>
          </div>
          <div key={`q${quizKey}`} className="fu" style={{ marginBottom:"28px" }}>
            <h2 style={{ fontSize:"25px", fontWeight:"400", color:T.text, lineHeight:1.5, fontStyle:"italic" }}>{q.question}</h2>
          </div>
          <div key={`o${quizKey}`} style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {q.options.map((opt, i) => {
              const isSel = quizSelected === opt;
              return (
                <button key={i} onClick={() => handleQuizAnswer(opt)} className={`fu${Math.min(i+2,6)}`}
                  style={{ padding:"15px 20px", background: isSel ? "rgba(201,168,76,0.1)" : T.card, border:`1px solid ${isSel ? T.gold : T.border}`, borderRadius:"10px", textAlign:"left", color: isSel ? T.gold : T.text, fontSize:"15px", lineHeight:1.5, fontStyle:"italic" }}>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "result" && aesObj) return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.serif, color:T.text, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:"440px", textAlign:"center" }}>
        <p className="fu" style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"16px" }}>YOU ARE</p>
        <p className="fu2" style={{ fontSize:"56px", color:gold, lineHeight:1, marginBottom:"8px" }}>{aesObj.icon}</p>
        <h1 className="fu3" style={{ fontSize:"34px", fontWeight:"400", color:T.text, letterSpacing:"1px", lineHeight:1.2, marginBottom:"6px" }}>{aesObj.name}</h1>
        <p className="fu4" style={{ fontSize:"11px", letterSpacing:"4px", color:gold, marginBottom:"22px" }}>{aesObj.tagline.toUpperCase()}</p>
        <div className="fu4" style={{ width:"40px", height:"1px", background:gold, margin:"0 auto 22px" }} />
        <div className="fu4" style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"22px", marginBottom:"14px", textAlign:"left" }}>
          <p style={{ fontSize:"16px", lineHeight:1.85, color:T.muted, fontStyle:"italic" }}>{aesObj.description}</p>
        </div>
        <div className="fu5" style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"12px", padding:"20px", marginBottom:"22px", textAlign:"left" }}>
          <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"16px" }}>YOUR NON-NEGOTIABLES</p>
          {aesObj.goals.map((g, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 0", borderTop: i>0 ? `1px solid ${T.border}` : "none" }}>
              <span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj.icon}</span>
              <span style={{ fontSize:"15px", color:T.text, fontStyle:"italic" }}>{g}</span>
            </div>
          ))}
        </div>
        <button className="fu6" onClick={enterApp} style={{ width:"100%", padding:"16px", background:gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"4px", fontWeight:"600", borderRadius:"10px" }}>
          BEGIN MY DAILY CHECK-IN
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:T.serif, color:T.text, paddingBottom:"90px" }}>
      <style>{CSS}</style>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"160px", background:`radial-gradient(ellipse at 70% 0%, ${gold}18 0%, transparent 70%)`, pointerEvents:"none", zIndex:0 }} />
      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 18px", position:"relative", zIndex:1 }}>
        <div style={{ padding:"26px 0 14px" }}>
          <p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted, marginBottom:"2px" }}>THE GROWN WOMAN BLUEPRINT</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h1 style={{ fontSize:"28px", fontWeight:"400", color:T.text, letterSpacing:"1px" }}>Be Her Daily</h1>
            {streak > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", background:`${gold}18`, border:`1px solid ${gold}44`, borderRadius:"20px" }}>
                <span style={{ color:gold, fontSize:"10px" }}>{aesObj?.icon||"✦"}</span>
                <span style={{ fontSize:"11px", color:gold, letterSpacing:"1px" }}>{streak}d streak</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ borderLeft:`2px solid ${gold}`, padding:"11px 14px", background:`${gold}08`, borderRadius:"0 8px 8px 0", marginBottom:"14px" }}>
          <p style={{ fontStyle:"italic", color:T.muted, fontSize:"14px", lineHeight:1.5 }}>{quote}</p>
        </div>
        {aesObj && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", background:T.card, border:`1px solid ${T.border}`, borderRadius:"10px", marginBottom:"14px" }}>
            <span style={{ fontSize:"18px", color:gold }}>{aesObj.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:"11px", color:gold, letterSpacing:"2px" }}>{aesObj.name.toUpperCase()}</p>
              <p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic" }}>{aesObj.tagline}</p>
            </div>
            <p style={{ fontSize:"11px", color:T.dim, fontStyle:"italic" }}>@{user?.Displayname}</p>
          </div>
        )}
        {view === "today" && goals.length > 0 && (
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"18px" }}>
            <CircleProgress pct={pct} color={gold} />
            <div>
              <p style={{ fontSize:"19px", fontWeight:"400", color:T.text, marginBottom:"4px" }}>Today's Alignment</p>
              <p style={{ fontSize:"13px", color:T.muted, marginBottom:"5px" }}>{completedCount} of {goals.length} non-negotiables</p>
              <p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic", lineHeight:1.4 }}>
                {pct===100 ? "Fully aligned. You showed up." : pct>=50 ? "You're in motion. Keep going." : "Your day is waiting for you."}
              </p>
            </div>
          </div>
        )}
        {view === "today" && goals.length > 0 && (
          <div style={{ marginBottom:"12px" }}>
            <button onClick={getAINudge} disabled={loadingAI} style={{ width:"100%", padding:"12px", background:"transparent", border:`1px solid ${gold}`, color:gold, fontSize:"11px", letterSpacing:"3px", borderRadius:"10px", opacity: loadingAI ? 0.6 : 1 }}>
              {loadingAI ? "·  ·  ·" : `${aesObj?.icon||"✦"}  RECEIVE YOUR NUDGE`}
            </button>
            {aiMsg && (
              <div className="fi" style={{ marginTop:"10px", padding:"14px 16px", background:T.card, border:`1px solid ${T.border}`, borderLeft:`3px solid ${gold}`, borderRadius:"0 10px 10px 0" }}>
                <p style={{ fontSize:"10px", letterSpacing:"3px", color:gold, marginBottom:"6px" }}>BHD SAYS</p>
                <p style={{ fontSize:"15px", lineHeight:1.7, color:T.muted, fontStyle:"italic" }}>{aiMsg}</p>
              </div>
            )}
          </div>
        )}
        {dataLoading && <div style={{ textAlign:"center", padding:"50px 0", color:T.dim, letterSpacing:"4px", fontSize:"11px", animation:"shimmer 1.5s infinite" }}>LOADING</div>}
        {!dataLoading && view === "today" && (
          <div>
            {goals.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.dim }}>
                <p style={{ fontSize:"26px", marginBottom:"12px", color:gold, opacity:.4 }}>{aesObj?.icon||"◇"}</p>
                <p style={{ fontSize:"15px", fontStyle:"italic", lineHeight:1.8, color:T.muted }}>No non-negotiables yet.<br/>Head to Goals to add some.</p>
              </div>
            ) : (
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px", marginBottom:"12px" }}>
                <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"16px" }}>NON-NEGOTIABLES</p>
                {goals.map((goal, i) => {
                  const done = checkedIds.has(goal.id);
                  return (
                    <button key={goal.id} onClick={() => toggleCheckin(goal)} style={{ display:"flex", alignItems:"center", gap:"14px", background:"none", border:"none", borderTop: i>0 ? `1px solid ${T.border}` : "none", padding:"13px 0", textAlign:"left", width:"100%" }}>
                      <div style={{ width:"22px", height:"22px", flexShrink:0, borderRadius:"50%", border:`2px solid ${done ? gold : T.accent}`, background: done ? `${gold}22` : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                        {done && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:gold }} />}
                      </div>
                      <span style={{ fontSize:"16px", color: done ? T.dim : T.text, textDecoration: done ? "line-through" : "none", fontStyle:"italic", lineHeight:1.4, transition:"all 0.3s" }}>{goal.GoalText}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px" }}>
              <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"12px" }}>SHARE WITH THE CIRCLE</p>
              <div style={{ display:"flex" }}>
                <input value={postContent} onChange={e => setPostContent(e.target.value)} onKeyDown={e => e.key==="Enter" && submitPost()} placeholder="A win, reflection, or encouragement..." style={{ flex:1, padding:"12px 14px", background:T.bg, border:`1px solid ${T.border}`, borderRight:"none", color:T.text, fontSize:"15px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic" }} />
                <button onClick={submitPost} style={{ padding:"12px 18px", background:gold, border:"none", color:T.bg, fontWeight:"700", fontSize:"18px", borderRadius:"0 8px 8px 0" }}>→</button>
              </div>
            </div>
          </div>
        )}
        {!dataLoading && view === "goals" && (
          <div>
            <div style={{ display:"flex", marginBottom:"12px" }}>
              <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key==="Enter" && addGoal()} placeholder="Add a non-negotiable..." style={{ flex:1, padding:"13px 16px", background:T.card, border:`1px solid ${T.border}`, borderRight:"none", color:T.text, fontSize:"15px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic" }} />
              <button onClick={addGoal} style={{ padding:"13px 18px", background:gold, border:"none", color:T.bg, fontSize:"20px", borderRadius:"0 8px 8px 0" }}>+</button>
            </div>
            {goals.length === 0
              ? <div style={{ textAlign:"center", padding:"36px 0", color:T.dim, fontSize:"15px", fontStyle:"italic" }}>Add the non-negotiables you commit to daily.</div>
              : <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", overflow:"hidden" }}>
                  {goals.map((goal, i) => (
                    <div key={goal.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", borderTop: i>0 ? `1px solid ${T.border}` : "none" }}>
                      <span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj?.icon||"✦"}</span>
                      <span style={{ flex:1, fontSize:"15px", color:T.text, lineHeight:1.4, fontStyle:"italic" }}>{goal.GoalText}</span>
                      <button onClick={() => removeGoal(goal.id)} style={{ background:"none", border:"none", color:T.dim, fontSize:"18px", padding:"0 4px" }}>×</button>
                    </div>
                  ))}
                </div>
            }
            <button onClick={() => { setQuizStep(0); setQuizScores({clean:0,soft:0,corporate:0,wellness:0,luxury:0}); setQuizKey(0); setScreen("quiz"); }}
              style={{ width:"100%", marginTop:"14px", padding:"12px", background:"transparent", border:`1px solid ${T.border}`, color:T.muted, fontSize:"11px", letterSpacing:"3px", borderRadius:"10px" }}>
              RETAKE AESTHETIC QUIZ
            </button>
          </div>
        )}
        {view === "wall" && (
          <div>
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"16px", marginBottom:"16px" }}>
              <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"12px" }}>SHARE WITH THE CIRCLE</p>
              <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="A win, reflection, or encouragement..." rows={3}
                style={{ width:"100%", padding:"12px 14px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"15px", borderRadius:"8px", outline:"none", fontStyle:"italic", lineHeight:1.6, marginBottom:"10px" }} />
              {postImagePreview && (
                <div style={{ position:"relative", marginBottom:"10px" }}>
                  <img src={postImagePreview} alt="preview" style={{ width:"100%", borderRadius:"8px", maxHeight:"200px", objectFit:"cover" }} />
                  <button onClick={() => { setPostImage(null); setPostImagePreview(null); }} style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(26,22,18,0.8)", border:"none", color:T.text, width:"28px", height:"28px", borderRadius:"50%", fontSize:"16px" }}>×</button>
                </div>
              )}
              <div style={{ display:"flex", gap:"8px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 14px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:"8px", cursor:"pointer", fontSize:"12px", color:T.muted, letterSpacing:"1px" }}>
                  📷 <span>PHOTO</span>
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display:"none" }} />
                </label>
                <button onClick={submitPost} disabled={uploadingImage || (!postContent.trim() && !postImage)}
                  style={{ flex:1, padding:"10px", background:gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"3px", fontWeight:"600", borderRadius:"8px", opacity: (!postContent.trim() && !postImage) ? 0.5 : 1 }}>
                  {uploadingImage ? "UPLOADING..." : "POST →"}
                </button>
              </div>
            </div>
            {wallLoading
              ? <div style={{ textAlign:"center", padding:"40px 0", color:T.dim, fontSize:"11px", letterSpacing:"3px", animation:"shimmer 1.5s infinite" }}>LOADING</div>
              : posts.length === 0
                ? <div style={{ textAlign:"center", padding:"40px 0", color:T.dim, fontSize:"15px", fontStyle:"italic" }}>Be the first to share with the circle.</div>
                : <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                    {posts.map((post) => {
                      const postAes = post.Aesthetic ? AESTHETICS[post.Aesthetic] : null;
                      const postReactions = reactions[post.id] || [];
                      const isExpanded = expandedPost === post.id;
                      const postReplies = replies[post.id] || [];
                      const reactionCounts = {};
                      postReactions.forEach(r => { reactionCounts[r.Emoji] = (reactionCounts[r.Emoji]||0) + 1; });
                      const myReactions = new Set(postReactions.filter(r => r.UserId === user?.id).map(r => r.Emoji));
                      return (
                        <div key={post.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", overflow:"hidden" }}>
                          <div style={{ padding:"14px 16px 0" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                                {postAes && <span style={{ color:postAes.color, fontSize:"14px" }}>{postAes.icon}</span>}
                                <span style={{ fontSize:"13px", color:gold, letterSpacing:"1px" }}>@{post.Displayname}</span>
                              </div>
                              <span style={{ fontSize:"11px", color:T.dim }}>{fmtDate(post.Date || post.createdAt)}</span>
                            </div>
                            {post.Content && <p style={{ fontSize:"16px", lineHeight:1.65, color:T.text, fontStyle:"italic", marginBottom:"10px" }}>"{post.Content}"</p>}
                            {post.ImageUrl && <img src={post.ImageUrl} alt="post" style={{ width:"100%", borderRadius:"8px", maxHeight:"280px", objectFit:"cover", marginBottom:"10px" }} />}
                            {post.Streak > 1 && <p style={{ fontSize:"11px", color:T.dim, letterSpacing:"1px", marginBottom:"10px" }}>{postAes?.icon||"✦"} {post.Streak} day streak</p>}
                          </div>
                          <div style={{ padding:"0 16px 10px", display:"flex", gap:"6px", flexWrap:"wrap" }}>
                            {EMOJIS.map(emoji => {
                              const count = reactionCounts[emoji] || 0;
                              const mine = myReactions.has(emoji);
                              return (
                                <button key={emoji} onClick={() => toggleReaction(post.id, emoji)}
                                  style={{ padding:"4px 10px", background: mine ? `${gold}22` : T.bg, border:`1px solid ${mine ? gold : T.border}`, borderRadius:"20px", fontSize:"13px", color: mine ? gold : T.muted, display:"flex", alignItems:"center", gap:"4px" }}>
                                  {emoji}{count > 0 && <span style={{ fontSize:"11px" }}>{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ borderTop:`1px solid ${T.border}` }}>
                            <button onClick={() => { if (!isExpanded) { setExpandedPost(post.id); loadReplies(post.id); } else setExpandedPost(null); }}
                              style={{ width:"100%", padding:"10px 16px", background:"none", border:"none", color:T.dim, fontSize:"12px", letterSpacing:"2px", textAlign:"left" }}>
                              {isExpanded ? "▲ HIDE REPLIES" : `▼ REPLIES${postReplies.length > 0 ? ` (${postReplies.length})` : ""}`}
                            </button>
                            {isExpanded && (
                              <div style={{ padding:"0 16px 14px" }}>
                                {postReplies.map((reply, i) => {
                                  const rAes = reply.Aesthetic ? AESTHETICS[reply.Aesthetic] : null;
                                  return (
                                    <div key={reply.id} style={{ padding:"10px 0", borderTop: i>0 ? `1px solid ${T.border}` : "none", display:"flex", gap:"10px" }}>
                                      <span style={{ color: rAes?.color||T.muted, fontSize:"13px", flexShrink:0, marginTop:"2px" }}>{rAes?.icon||"◎"}</span>
                                      <div>
                                        <span style={{ fontSize:"12px", color:gold, letterSpacing:"1px", marginRight:"8px" }}>@{reply.DisplayName}</span>
                                        <p style={{ fontSize:"14px", color:T.muted, lineHeight:1.5, fontStyle:"italic", marginTop:"2px" }}>{reply.Content}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                                  <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key==="Enter" && submitReply(post.id)}
                                    placeholder="Write a reply..." style={{ flex:1, padding:"10px 12px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"14px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic" }} />
                                  <button onClick={() => submitReply(post.id)} disabled={postingReply}
                                    style={{ padding:"10px 14px", background:gold, border:"none", color:T.bg, fontSize:"15px", borderRadius:"0 8px 8px 0" }}>→</button>
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
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.card, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-around", padding:"10px 0 20px", zIndex:50 }}>
        {[
          { v:"today", icon: aesObj?.icon||"◈", label:"HOME" },
          { v:"goals", icon:"✦", label:"GOALS" },
          { v:"wall", icon:"◎", label:"CIRCLE" },
        ].map(({ v, icon, label }) => (
          <button key={v} onClick={() => { setView(v); if (v==="wall") loadWall(); }}
            style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", opacity: view===v ? 1 : 0.35 }}>
            <span style={{ fontSize:"20px", color: view===v ? gold : T.muted }}>{icon}</span>
            <span style={{ fontSize:"9px", letterSpacing:"2px", color: view===v ? gold : T.muted }}>{label}</span>
          </button>
        ))}
      </div>
      {celebrating && (
        <div className="fi" style={{ position:"fixed", inset:0, background:"rgba(26,22,18,0.97)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <p style={{ fontSize:"52px", marginBottom:"16px", color:gold, animation:"shimmer 1.5s infinite" }}>{aesObj?.icon||"✦"}</p>
          <p style={{ fontSize:"28px", fontWeight:"300", color:T.text, letterSpacing:"2px", marginBottom:"10px", fontFamily:T.serif }}>Fully Aligned.</p>
          <p style={{ fontSize:"12px", letterSpacing:"4px", color:gold }}>THE WOMAN YOU'RE BECOMING IS PROUD.</p>
        </div>
      )}
    </div>
  );
}
