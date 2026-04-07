import { useState, useEffect, useCallback } from "react";
import { dbGet, dbInsert, dbUpdate, dbDelete, uploadImage } from "./api";
import { AESTHETICS, QUESTIONS, QUOTES } from "./data";

const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; } };
const randomQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];
const EMOJIS = ["\uD83D\uDD25", "\uD83D\uDC9B", "\u2728", "\uD83D\uDCAA", "\uD83D\uDE4F"];
const SERIF = "Georgia,'Times New Roman',serif";

const T = {
  bg: "#f5f0e8", card: "#ede8df", border: "#d4c8b5", accent: "#c4b8a5",
  text: "#2a2218", muted: "#7a6a55", dim: "#a89880", gold: "#b8862a",
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
  body{background:#f5f0e8}
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
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
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
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState({});
  const [reactions, setReactions] = useState({});
  const [cycleStartDate, setCycleStartDate] = useState(null);
  const [cycleInput, setCycleInput] = useState("");
  const [cycleSaved, setCycleSaved] = useState(false);
  const [visionPosts, setVisionPosts] = useState([]);
  const [visionImage, setVisionImage] = useState(null);
  const [visionImagePreview, setVisionImagePreview] = useState(null);
  const [visionCaption, setVisionCaption] = useState("");
  const [uploadingVision, setUploadingVision] = useState(false);

  const aesObj = aesthetic ? AESTHETICS[aesthetic] : null;
  const gold = aesObj?.color || T.gold;

  // -- INIT --
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const saved = localStorage.getItem("gwb_user_id");
        if (saved) {
          const recs = await dbGet("users", "id=eq." + saved + "&limit=1"); const data = recs && recs[0] ? recs[0] : null; const error = !data;
          if (data) {
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
    const [g, c] = await Promise.all([
      dbGet("goals", "user_id=eq." + u.id),
      dbGet("checkins", "user_id=eq." + u.id),
    ]);
    setGoals(g || []);
    const clist = c || [];
    setCheckins(clist);
    calcStreak(clist);
    if (u.cycle_start) { setCycleStartDate(u.cycle_start); setCycleSaved(true); }
    setDataLoading(false);
    loadWall();
    loadVisionBoard();
  }, []);

  const calcStreak = (data) => {
    let count = 0; const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
      if (data.some(r => r.date === key)) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    setStreak(count);
  };

  const getCyclePhase = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const day = (diff % 28) + 1;
    if (day <= 5) return { phase:"Menstrual", days:"Days 1-5", day:day, icon:"New Moon", color:"#8a6a8a", body:"Your body is shedding and renewing. Estrogen and progesterone are at their lowest. You may feel introspective, tired, and sensitive. This is intentional rest, not weakness.", energy:"Low to Moderate", workout:"Gentle yoga, walking, stretching. Honor the rest.", foods:"Iron-rich foods: leafy greens, lentils, dark chocolate. Warm nourishing meals.", affirmation:"Rest is productive. My body is doing sacred work." };
    if (day <= 13) return { phase:"Follicular", days:"Days 6-13", day:day, icon:"Waxing Moon", color:"#8a9e88", body:"Estrogen is rising. Your brain is sharp, your mood is lifting, and your energy is building. This is your fresh start energy. New ideas, new commitments, new momentum.", energy:"Rising", workout:"Strength training, cardio, trying something new. You have the energy for it.", foods:"Fermented foods, lean proteins, fresh vegetables. Your metabolism is ready.", affirmation:"I am rising. My potential is expanding with every day." };
    if (day <= 16) return { phase:"Ovulatory", days:"Days 14-16", day:day, icon:"Full Moon", color:"#c9a84c", body:"Peak estrogen and testosterone. You are magnetic right now. Communication is easiest, confidence is highest, and your body is at its strongest. Use this window.", energy:"Peak", workout:"High intensity, group classes, personal records. Your body can handle it all.", foods:"Light, energizing foods. Raw vegetables, smoothies, fiber-rich meals.", affirmation:"I am at my most powerful. I move through the world with ease and confidence." };
    return { phase:"Luteal", days:"Days 17-28", day:day, icon:"Waning Moon", color:"#9ab0c4", body:"Progesterone rises then drops. You may crave comfort, feel more emotional, or want to slow down. This is not a flaw. This is your body asking for intentional care before the reset.", energy:"Declining", workout:"Moderate cardio, pilates, walks. Reduce intensity as you near day 28.", foods:"Magnesium-rich foods: dark chocolate, nuts, seeds. Complex carbs for mood stability.", affirmation:"I honor my need to slow down. Softness is my strength right now." };
  };

  const saveCycleDate = async () => {
    if (!cycleInput) return;
    setCycleStartDate(cycleInput);
    setCycleSaved(true);
    if (user) {
      try {
        const res = await fetch("https://jppebmgmciiemxfhbdxf.supabase.co/rest/v1/users?id=eq." + user.id, {
          method: "PATCH",
          headers: {"apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc", "Content-Type": "application/json"},
          body: JSON.stringify({ cycle_start: cycleInput })
        });
        const d = await res.json();
        console.log("cycle save result:", d);
      } catch(e) { console.error("cycle save error:", e); }
    }
  };

  const loadVisionBoard = async () => {
    if (!user) return;
    const data = await dbGet("vision_board", "user_id=eq." + user.id + "&order=created_at.desc");
    setVisionPosts(data || []);
  };

  const handleVisionImageSelect = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    setVisionImage(file);
    setVisionImagePreview(URL.createObjectURL(file));
  };

  const submitVisionPost = async () => {
    if (!visionImage) return;
    setUploadingVision(true);
    const fd = new FormData();
    fd.append("file", visionImage);
    fd.append("upload_preset", "tsuduljg");
    try {
      const r = await fetch("https://api.cloudinary.com/v1_1/dwhjqqkjg/image/upload", {method:"POST", body:fd});
      const d = await r.json();
      const image_url = d.secure_url || null;
      if (image_url) {
        const rec = await dbInsert("vision_board", { user_id: user.id, image_url: image_url, caption: visionCaption.trim() });
        if (rec && !rec.code) setVisionPosts(prev => [rec, ...prev]);
      }
    } catch(e) { console.error("vision upload error", e); }
    setUploadingVision(false);
    setVisionImage(null);
    setVisionImagePreview(null);
    setVisionCaption("");
  };

  const deleteVisionPost = async (id) => {
    setVisionPosts(prev => prev.filter(p => p.id !== id));
    await dbDelete("vision_board", id);
  };

  const loadWall = async () => {
    const p = await dbGet("posts", "order=created_at.desc&limit=30");
    setPosts(p || []);
    const r = await dbGet("reactions", "limit=500");
    const rMap = {};
    (r || []).forEach(rec => {
      if (!rMap[rec.post_id]) rMap[rec.post_id] = [];
      rMap[rec.post_id].push(rec);
    });
    setReactions(rMap);
  };

  const loadReplies = async (postId) => {
    const data = await dbGet("replies", "post_id=eq." + postId + "&order=created_at.asc");
    setReplies(prev => ({ ...prev, [postId]: data || [] }));
  };

  // -- AUTH --
  const handleAuth = async () => {
    const email = emailInput.trim().toLowerCase();
    const dname = displayNameInput.trim();
    if (!email || !email.includes("@")) { setAuthError("Please enter a valid email."); return; }
    setAuthLoading(true); setAuthError("");

    if (isNewUser) {
      if (!dname || dname.length < 2) { setAuthError("Pick a display name (2+ characters)."); setAuthLoading(false); return; }

      // Check email taken
      const existingArr = await dbGet("users", "email=eq." + encodeURIComponent(email) + "&limit=1"); const existing = existingArr && existingArr[0] ? existingArr[0] : null;
      if (existing && existing.id) { setAuthError("That email already has an account. Sign in instead."); setAuthLoading(false); return; }

      // Check display name taken
      const nameCheckArr = await dbGet("users", "display_name=eq." + encodeURIComponent(dname) + "&limit=1"); const nameCheck = nameCheckArr && nameCheckArr[0] ? nameCheckArr[0] : null;
      if (nameCheck && nameCheck.id) { setAuthError("That display name is taken. Try another."); setAuthLoading(false); return; }

      // Create user
      const newUser = await dbInsert("users", { email: email, display_name: dname });
      if (!newUser || newUser.code) { setAuthError("Could not create account. Try again."); setAuthLoading(false); return; }

      try { localStorage.setItem("gwb_user_id", newUser.id); } catch {}
      setUser(newUser);
      setAuthLoading(false);
      setScreen("quiz");
    } else {
      // Sign in
      if (!dname || dname.length < 2) { setAuthError("Enter your display name to sign in."); setAuthLoading(false); return; }
      const foundArr = await dbGet("users", "email=eq." + encodeURIComponent(email) + "&display_name=eq." + encodeURIComponent(dname) + "&limit=1"); const found = foundArr && foundArr[0] ? foundArr[0] : null;
      if (!found || !found.id) { setAuthError("No account found. Check your email and display name."); setAuthLoading(false); return; }

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

  // -- QUIZ --
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
        if (user) await dbUpdate("users", user.id, { aesthetic: winner, quiz_done: true });
        setUser(prev => ({ ...prev, aesthetic: winner, quiz_done: true }));
        setScreen("result");
      }
    }, 380);
  };

  // -- ENTER APP --
  const enterApp = async () => {
    const suggested = AESTHETICS[aesthetic]?.goals || [];
    
    const saved = []; for (let i = 0; i < suggested.length; i++) { const rec = await dbInsert("goals", { user_id: user.id, goal_text: suggested[i] }); if (rec && !rec.code) saved.push(rec); }
    setGoals(saved);
    setScreen("app");
    setView("today");
    loadWall();
  };

  // -- GOALS --
  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const text = newGoal.trim(); setNewGoal("");
    const data = await dbInsert("goals", { user_id: user.id, goal_text: text });
    if (data && !data.code) setGoals(prev => [...prev, data]);
  };

  const removeGoal = async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await dbDelete("goals", id);
  };

  // -- CHECK-INS --
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
        await dbDelete("checkins", rec.id);
      }
    } else {
      const data = await dbInsert("checkins", { user_id: user.id, goal_id: goal.id, goal_text: goal.goal_text, date: today(), streak: streak + 1, aesthetic: aesthetic });
      if (data && !data.code) setCheckins(prev => [...prev, data]);
      if (completedCount + 1 === goals.length && goals.length > 0) {
        setCelebrating(true); setTimeout(() => setCelebrating(false), 4000);
      }
    }
  };

  // -- WALL --
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");

  const deletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    await dbDelete("posts", postId);
  };

  const startEditPost = (post) => {
    setEditingPost(post.id);
    setEditContent(post.content || "");
  };

  const saveEditPost = async (postId) => {
    const updated = editContent.trim();
    if (!updated) return;
    setPosts(prev => prev.map(p => p.id === postId ? {...p, content: updated} : p));
    setEditingPost(null);
    await dbUpdate("posts", postId, { content: updated });
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
    let image_url = null;
    if (postImage) image_url = await uploadImage(postImage);
    setUploadingImage(false);
    const data = await dbInsert("posts", { user_id: user.id, display_name: user.display_name, content: content, image_url: image_url, aesthetic: aesthetic, streak: streak, date: today() });
    if (data && !data.code) setPosts(prev => [data, ...prev]);
  };

  const toggleReaction = async (postId, emoji) => {
    const postReactions = reactions[postId] || [];
    const existing = postReactions.find(r => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      setReactions(prev => ({ ...prev, [postId]: postReactions.filter(r => r.id !== existing.id) }));
      await dbDelete("reactions", existing.id);
    } else {
      const data = await dbInsert("reactions", { post_id: postId, user_id: user.id, emoji: emoji });
      if (data && !data.code) setReactions(prev => ({ ...prev, [postId]: [...postReactions, data] }));
    }
  };

  const submitReply = async (postId) => {
    if (!replyText.trim()) return;
    const content = replyText.trim(); setReplyText("");
    const data = await dbInsert("replies", { post_id: postId, user_id: user.id, display_name: user.display_name, content: content, aesthetic: aesthetic });
    if (data && !data.code) setReplies(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
  };

  // -- AI NUDGE --
  const getAINudge = async () => {
    setLoadingAI(true); setAiMsg("");
    const done = goals.filter(g => checkedIds.has(g.id)).map(g => g.goal_text);
    const pending = goals.filter(g => !checkedIds.has(g.id)).map(g => g.goal_text);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are the voice of The GWB Project ? Grow With Boldness. Speak like The Grown Woman Blueprint: refined, warm, direct. No fluff. No emojis. 2-3 sentences. The user's aesthetic is ${aesObj?.name} ? "${aesObj?.tagline}". Address them by display name.`,
          messages: [{ role: "user", content: `Name: ${user?.display_name}\nAesthetic: ${aesObj?.name}\nStreak: ${streak} days\nCompleted: ${done.join(", ") || "none yet"}\nPending: ${pending.join(", ") || "all done!"}\nGive a personal nudge.` }],
        }),
      });
      const data = await res.json();
      setAiMsg(data.content?.map(b => b.text || "").join("") || "The woman you're becoming is watching. Keep going.");
    } catch { setAiMsg("The woman you're becoming is watching. Keep going."); }
    setLoadingAI(false);
  };

  // -- SPLASH --
  if (screen === "splash") return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:SERIF }}>
      <style>{CSS}</style>
      <div style={{ textAlign:"center", animation:"shimmer 2s infinite" }}>
        <p style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"12px" }}>THE</p>
        <h1 style={{ fontSize:"52px", fontWeight:"300", color:T.text, letterSpacing:"4px", lineHeight:1 }}>GWB</h1>
        <div style={{ width:"30px", height:"1px", background:T.gold, margin:"14px auto" }} />
        <p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted }}>PROJECT</p>
      </div>
    </div>
  );

  // -- SETUP --
  if (screen === "setup") return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <style>{CSS}</style>
      <div style={{ width:"100%", maxWidth:"400px" }}>
        <div className="fu" style={{ textAlign:"center", marginBottom:"40px" }}>
          <p style={{ fontSize:"10px", letterSpacing:"6px", color:T.muted, marginBottom:"10px" }}>THE</p>
          <h1 style={{ fontSize:"44px", fontWeight:"300", color:T.text, letterSpacing:"3px", lineHeight:1, marginBottom:"10px" }}>GWB Project</h1>
          <div style={{ width:"36px", height:"1px", background:T.gold, margin:"0 auto 12px" }} />
          <p style={{ fontSize:"11px", letterSpacing:"3px", color:T.muted }}>DAILY CHECK-IN</p>
        </div>

        <div className="fu2" style={{ borderLeft:`2px solid ${T.gold}`, padding:"12px 16px", background:"rgba(201,168,76,0.04)", borderRadius:"0 8px 8px 0", marginBottom:"28px" }}>
          <p style={{ fontStyle:"italic", color:T.muted, fontSize:"15px", lineHeight:1.6 }}>{quote}</p>
        </div>

        <div className="fu3" style={{ display:"flex", marginBottom:"16px", background:T.card, border:`1px solid ${T.border}`, borderRadius:"10px", padding:"4px" }}>
          {[["Join the Circle", true], ["Sign In", false]].map(([label, val]) => (
            <button key={label} onClick={() => { setIsNewUser(val); setAuthError(""); }}
              style={{ flex:1, padding:"11px", background: isNewUser===val ? T.gold : "transparent", border:"none", color: isNewUser===val ? T.bg : T.muted, fontSize:"12px", letterSpacing:"2px", borderRadius:"8px", fontWeight: isNewUser===val ? "600" : "400" }}>
              {label}
            </button>
          ))}
        </div>

        <div className="fu4" style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"24px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"10px" }}>
            <input value={emailInput} onChange={e => { setEmailInput(e.target.value); setAuthError(""); }}
              onKeyDown={e => e.key==="Enter" && handleAuth()}
              placeholder="Your email address"
              style={{ padding:"13px 16px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"16px", borderRadius:"8px", outline:"none" }} />
            <input value={displayNameInput} onChange={e => { setDisplayNameInput(e.target.value); setAuthError(""); }}
              onKeyDown={e => e.key==="Enter" && handleAuth()}
              placeholder={isNewUser ? "Choose a display name" : "Your display name"}
              style={{ padding:"13px 16px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"16px", borderRadius:"8px", outline:"none" }} />
          </div>
          {authError && <p style={{ color:"#c07a5a", fontSize:"13px", fontStyle:"italic", marginBottom:"10px", lineHeight:1.5 }}>{authError}</p>}
          <button onClick={handleAuth} disabled={authLoading}
            style={{ width:"100%", padding:"15px", background:T.gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"4px", fontWeight:"600", borderRadius:"8px", opacity: authLoading ? 0.6 : 1 }}>
            {authLoading ? "?  ?  ?" : isNewUser ? "ENTER THE CIRCLE" : "WELCOME BACK"}
          </button>
        </div>
      </div>
    </div>
  );

  // -- QUIZ --
  if (screen === "quiz") {
    const q = QUESTIONS[quizStep];
    const progress = (quizStep / QUESTIONS.length) * 100;
    return (
      <div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, color:T.text, padding:"40px 20px 60px", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <style>{CSS}</style>
        <div style={{ width:"100%", maxWidth:"460px" }}>
          <div style={{ marginBottom:"36px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
              <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted }}>DISCOVER YOUR AESTHETIC</p>
              <p style={{ fontSize:"12px", color:T.dim }}>{quizStep+1} / {QUESTIONS.length}</p>
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
                <button key={i} onClick={() => handleQuizAnswer(opt)}
                  className={`fu${Math.min(i+2,6)}`}
                  style={{ padding:"15px 20px", background: isSel?"rgba(201,168,76,0.1)":T.card, border:`1px solid ${isSel?T.gold:T.border}`, borderRadius:"10px", textAlign:"left", color: isSel?T.gold:T.text, fontSize:"15px", lineHeight:1.5, fontStyle:"italic" }}>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -- RESULT --
  if (screen === "result" && aesObj) return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, color:T.text, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
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
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"11px 0", borderTop: i>0?`1px solid ${T.border}`:"none" }}>
              <span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj.icon}</span>
              <span style={{ fontSize:"15px", color:T.text, fontStyle:"italic" }}>{g}</span>
            </div>
          ))}
        </div>
        <button className="fu6" onClick={enterApp}
          style={{ width:"100%", padding:"16px", background:gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"4px", fontWeight:"600", borderRadius:"10px" }}>
          BEGIN MY DAILY CHECK-IN
        </button>
      </div>
    </div>
  );

  // -- MAIN APP --
  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:SERIF, color:T.text, paddingBottom:"90px" }}>
      <style>{CSS}</style>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"160px", background:`radial-gradient(ellipse at 70% 0%, ${gold}18 0%, transparent 70%)`, pointerEvents:"none", zIndex:0 }} />
      <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 18px", position:"relative", zIndex:1 }}>

        {/* Header */}
        <div style={{ padding:"26px 0 14px" }}>
          <p style={{ fontSize:"10px", letterSpacing:"5px", color:T.muted, marginBottom:"2px" }}>THE GROWN WOMAN</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h1 style={{ fontSize:"28px", fontWeight:"400", color:T.text, letterSpacing:"1px" }}>GWB Project</h1>
            {streak > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", background:`${gold}18`, border:`1px solid ${gold}44`, borderRadius:"20px" }}>
                <span style={{ color:gold, fontSize:"10px" }}>{aesObj?.icon||"?"}</span>
                <span style={{ fontSize:"11px", color:gold, letterSpacing:"1px" }}>{streak}d streak</span>
              </div>
            )}
          </div>
        </div>

        {/* Quote */}
        <div style={{ borderLeft:`2px solid ${gold}`, padding:"11px 14px", background:`${gold}08`, borderRadius:"0 8px 8px 0", marginBottom:"14px" }}>
          <p style={{ fontStyle:"italic", color:T.muted, fontSize:"14px", lineHeight:1.5 }}>{quote}</p>
        </div>

        {/* Aesthetic badge */}
        {aesObj && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", background:T.card, border:`1px solid ${T.border}`, borderRadius:"10px", marginBottom:"14px" }}>
            <span style={{ fontSize:"18px", color:gold }}>{aesObj.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:"11px", color:gold, letterSpacing:"2px" }}>{aesObj.name.toUpperCase()}</p>
              <p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic" }}>{aesObj.tagline}</p>
            </div>
            <p style={{ fontSize:"11px", color:T.dim, fontStyle:"italic" }}>@{user?.display_name}</p>
          </div>
        )}

        {/* Alignment ring */}
        {view==="today" && goals.length > 0 && (
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"18px" }}>
            <CircleProgress pct={pct} color={gold} />
            <div>
              <p style={{ fontSize:"19px", fontWeight:"400", color:T.text, marginBottom:"4px" }}>Today's Alignment</p>
              <p style={{ fontSize:"13px", color:T.muted, marginBottom:"5px" }}>{completedCount} of {goals.length} non-negotiables</p>
              <p style={{ fontSize:"12px", color:T.dim, fontStyle:"italic", lineHeight:1.4 }}>
                {pct===100?"Fully aligned. You showed up.":pct>=50?"You're in motion. Keep going.":"Your day is waiting for you."}
              </p>
            </div>
          </div>
        )}

        {/* AI nudge */}
        {view==="today" && goals.length > 0 && (
          <div style={{ marginBottom:"12px" }}>
            <button onClick={getAINudge} disabled={loadingAI}
              style={{ width:"100%", padding:"12px", background:"transparent", border:`1px solid ${gold}`, color:gold, fontSize:"11px", letterSpacing:"3px", borderRadius:"10px", opacity: loadingAI?0.6:1 }}>
              {loadingAI ? "?  ?  ?" : `${aesObj?.icon||"?"}  RECEIVE YOUR NUDGE`}
            </button>
            {aiMsg && (
              <div className="fi" style={{ marginTop:"10px", padding:"14px 16px", background:T.card, border:`1px solid ${T.border}`, borderLeft:`3px solid ${gold}`, borderRadius:"0 10px 10px 0" }}>
                <p style={{ fontSize:"10px", letterSpacing:"3px", color:gold, marginBottom:"6px" }}>GWB SAYS</p>
                <p style={{ fontSize:"15px", lineHeight:1.7, color:T.muted, fontStyle:"italic" }}>{aiMsg}</p>
              </div>
            )}
          </div>
        )}

        {dataLoading && <div style={{ textAlign:"center", padding:"50px 0", color:T.dim, letterSpacing:"4px", fontSize:"11px", animation:"shimmer 1.5s infinite" }}>LOADING</div>}

        {/* -- TODAY -- */}
        {!dataLoading && view==="today" && (
          <div>
            {goals.length===0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.dim }}>
                <p style={{ fontSize:"26px", marginBottom:"12px", color:gold, opacity:.4 }}>{aesObj?.icon||"?"}</p>
                <p style={{ fontSize:"15px", fontStyle:"italic", lineHeight:1.8, color:T.muted }}>No non-negotiables yet.<br/>Head to Goals to add some.</p>
              </div>
            ) : (
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"18px", marginBottom:"12px" }}>
                <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"16px" }}>NON-NEGOTIABLES</p>
                {goals.map((goal, i) => {
                  const done = checkedIds.has(goal.id);
                  return (
                    <button key={goal.id} onClick={() => toggleCheckin(goal)}
                      style={{ display:"flex", alignItems:"center", gap:"14px", background:"none", border:"none", borderTop: i>0?`1px solid ${T.border}`:"none", padding:"13px 0", textAlign:"left", width:"100%" }}>
                      <div style={{ width:"22px", height:"22px", flexShrink:0, borderRadius:"50%", border:`2px solid ${done?gold:T.accent}`, background: done?`${gold}22`:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                        {done && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:gold }} />}
                      </div>
                      <span style={{ fontSize:"16px", color: done?T.dim:T.text, textDecoration: done?"line-through":"none", fontStyle:"italic", lineHeight:1.4, transition:"all 0.3s" }}>{goal.goal_text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -- GOALS -- */}
        {!dataLoading && view==="goals" && (
          <div>
            <div style={{ display:"flex", marginBottom:"12px" }}>
              <input value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key==="Enter" && addGoal()} placeholder="Add a non-negotiable..."
                style={{ flex:1, padding:"13px 16px", background:T.card, border:`1px solid ${T.border}`, borderRight:"none", color:T.text, fontSize:"15px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic" }} />
              <button onClick={addGoal} style={{ padding:"13px 18px", background:gold, border:"none", color:T.bg, fontSize:"20px", borderRadius:"0 8px 8px 0" }}>+</button>
            </div>
            {goals.length===0
              ? <div style={{ textAlign:"center", padding:"36px 0", color:T.dim, fontSize:"15px", fontStyle:"italic" }}>Add the non-negotiables you commit to daily.</div>
              : <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", overflow:"hidden" }}>
                  {goals.map((goal, i) => (
                    <div key={goal.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", borderTop: i>0?`1px solid ${T.border}`:"none" }}>
                      <span style={{ color:gold, fontSize:"13px", flexShrink:0 }}>{aesObj?.icon||"?"}</span>
                      <span style={{ flex:1, fontSize:"15px", color:T.text, lineHeight:1.4, fontStyle:"italic" }}>{goal.goal_text}</span>
                      <button onClick={() => removeGoal(goal.id)} style={{ background:"none", border:"none", color:T.dim, fontSize:"18px", padding:"0 4px" }}>x</button>
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

        {/* -- COMMUNITY WALL -- */}
        {view==="wall" && (
          <div>
            {/* Composer */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"16px", marginBottom:"16px" }}>
              <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"12px" }}>SHARE WITH THE CIRCLE</p>
              <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="A win, reflection, or encouragement..." rows={3}
                style={{ width:"100%", padding:"12px 14px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"15px", borderRadius:"8px", outline:"none", fontStyle:"italic", lineHeight:1.6, marginBottom:"10px" }} />
              {postImagePreview && (
                <div style={{ position:"relative", marginBottom:"10px" }}>
                  <img src={postImagePreview} alt="preview" style={{ width:"100%", borderRadius:"8px", maxHeight:"200px", objectFit:"cover" }} />
                  <button onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                    style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(26,22,18,0.8)", border:"none", color:T.text, width:"28px", height:"28px", borderRadius:"50%", fontSize:"16px" }}>?</button>
                </div>
              )}
              <div style={{ display:"flex", gap:"8px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:"6px", padding:"10px 14px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:"8px", cursor:"pointer", fontSize:"12px", color:T.muted }}>
                  PHOTO
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display:"none" }} />
                </label>
                <button onClick={submitPost} disabled={uploadingImage||(!postContent.trim()&&!postImage)}
                  style={{ flex:1, padding:"10px", background:gold, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"3px", fontWeight:"600", borderRadius:"8px", opacity:(!postContent.trim()&&!postImage)?0.5:1 }}>
                  {uploadingImage?"UPLOADING...":"POST"}
                </button>
              </div>
            </div>

            {/* Posts */}
            {posts.length===0
              ? <div style={{ textAlign:"center", padding:"40px 0", color:T.dim, fontSize:"15px", fontStyle:"italic" }}>Be the first to share with the circle.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {posts.map((post) => {
                    const postAes = post.aesthetic ? AESTHETICS[post.aesthetic] : null;
                    const postReactions = reactions[post.id] || [];
                    const isExpanded = expandedPost === post.id;
                    const postReplies = replies[post.id] || [];
                    const reactionCounts = {};
                    postReactions.forEach(r => { reactionCounts[r.emoji] = (reactionCounts[r.emoji]||0)+1; });
                    const myReactions = new Set(postReactions.filter(r => r.user_id===user?.id).map(r => r.emoji));

                    return (
                      <div key={post.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:"14px", overflow:"hidden" }}>
                        <div style={{ padding:"14px 16px 0" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                              {postAes && <span style={{ color:postAes.color, fontSize:"14px" }}>{postAes.icon}</span>}
                              <span style={{ fontSize:"13px", color:gold, letterSpacing:"1px" }}>@{post.display_name}</span>
                            </div>
                            <span style={{ fontSize:"11px", color:T.dim }}>{fmtDate(post.date||post.created_at)}</span>
                          </div>
                          {post.content && <p style={{ fontSize:"16px", lineHeight:1.65, color:T.text, fontStyle:"italic", marginBottom:"10px" }}>"{post.content}"</p>}
                          {post.image_url && <img src={post.image_url} alt="post" style={{ width:"100%", borderRadius:"8px", maxHeight:"280px", objectFit:"cover", marginBottom:"10px" }} />}
                          {post.streak > 1 && <p style={{ fontSize:"11px", color:T.dim, marginBottom:"10px" }}>{postAes?.icon||"?"} {post.streak} day streak</p>}
                        </div>

                        {/* Reactions */}
                        <div style={{ padding:"0 16px 10px", display:"flex", gap:"6px", flexWrap:"wrap" }}>
                          {EMOJIS.map(emoji => {
                            const count = reactionCounts[emoji]||0;
                            const mine = myReactions.has(emoji);
                            return (
                              <button key={emoji} onClick={() => toggleReaction(post.id, emoji)}
                                style={{ padding:"4px 10px", background: mine?`${gold}22`:T.bg, border:`1px solid ${mine?gold:T.border}`, borderRadius:"20px", fontSize:"13px", color: mine?gold:T.muted, display:"flex", alignItems:"center", gap:"4px" }}>
                                {emoji}{count>0&&<span style={{ fontSize:"11px" }}>{count}</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Replies */}
                        <div style={{ borderTop:`1px solid ${T.border}` }}>
                          <button onClick={() => { if(!isExpanded){setExpandedPost(post.id);loadReplies(post.id);}else setExpandedPost(null); }}
                            style={{ width:"100%", padding:"10px 16px", background:"none", border:"none", color:T.dim, fontSize:"12px", letterSpacing:"2px", textAlign:"left" }}>
                            {isExpanded ? "- HIDE REPLIES" : "REPLIES" + (postReplies.length > 0 ? " (" + postReplies.length + ")" : "")}
                          </button>
                          {isExpanded && (
                            <div style={{ padding:"0 16px 14px" }}>
                              {postReplies.map((reply, i) => {
                                const rAes = reply.aesthetic ? AESTHETICS[reply.aesthetic] : null;
                                return (
                                  <div key={reply.id} style={{ padding:"10px 0", borderTop: i>0?`1px solid ${T.border}`:"none", display:"flex", gap:"10px" }}>
                                    <span style={{ color:rAes?.color||T.muted, fontSize:"13px", flexShrink:0, marginTop:"2px" }}>{rAes?.icon||"?"}</span>
                                    <div>
                                      <span style={{ fontSize:"12px", color:gold, letterSpacing:"1px", marginRight:"8px" }}>@{reply.display_name}</span>
                                      <p style={{ fontSize:"14px", color:T.muted, lineHeight:1.5, fontStyle:"italic", marginTop:"2px" }}>{reply.content}</p>
                                    </div>
                                  </div>
                                );
                              })}
                              <div style={{ display:"flex", gap:"8px", marginTop:"12px" }}>
                                <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key==="Enter"&&submitReply(post.id)}
                                  placeholder="Write a reply..." style={{ flex:1, padding:"10px 12px", background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:"14px", borderRadius:"8px 0 0 8px", outline:"none", fontStyle:"italic" }} />
                                <button onClick={() => submitReply(post.id)}
                                  style={{ padding:"10px 14px", background:gold, border:"none", color:T.bg, fontSize:"15px", borderRadius:"0 8px 8px 0" }}>?</button>
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

      {!dataLoading && view==="today" && goals.length > 0 && (
        <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:"14px", padding:"18px", marginBottom:"12px" }}>
          <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"16px" }}>THIS WEEK</p>
          {(() => {
            const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            const now = new Date();
            const weekDays = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(now.getDate() - i);
              const key = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
              const dayCheckins = checkins.filter(function(c){ return c.date === key; });
              const done = dayCheckins.length;
              const total = goals.length;
              const pct = total ? Math.round(done / total * 100) : 0;
              const todayKey = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0"); weekDays.push({ label: dayNames[d.getDay()], key, done, total, pct, isToday: key === todayKey });
            }
            const totalPossible = goals.length * 7;
            const totalDone = weekDays.reduce(function(sum, d){ return sum + d.done; }, 0);
            const weekScore = totalPossible ? Math.round(totalDone / totalPossible * 100) : 0;
            const g = aesObj ? aesObj.color : "#c9a84c";
            return (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"14px", gap:"4px" }}>
                  {weekDays.map(function(day) {
                    return (
                      <div key={day.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", flex:1 }}>
                        <div style={{ width:"100%", height:"60px", background:T.bg, border:"1px solid "+T.border, borderRadius:"4px", overflow:"hidden", display:"flex", alignItems:"flex-end" }}>
                          <div style={{ width:"100%", height:day.pct+"%", background: day.isToday ? g : (day.pct===100 ? g : T.accent), borderRadius:"4px", transition:"height 0.5s ease", minHeight: day.done > 0 ? "4px" : "0" }}></div>
                        </div>
                        <p style={{ fontSize:"9px", letterSpacing:"1px", color: day.isToday ? g : T.muted, fontFamily:"Georgia,serif" }}>{day.label}</p>
                        <p style={{ fontSize:"9px", color: day.pct===100 ? g : T.dim, fontFamily:"Georgia,serif" }}>{day.done}/{day.total}</p>
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop:"1px solid "+T.border, paddingTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <p style={{ fontSize:"10px", letterSpacing:"3px", color:T.muted, marginBottom:"2px" }}>WEEKLY SCORE</p>
                    <p style={{ fontSize:"11px", color:T.dim, fontStyle:"italic", fontFamily:"Georgia,serif" }}>{totalDone} of {totalPossible} possible</p>
                  </div>
                  <p style={{ fontSize:"36px", fontWeight:"300", color: weekScore >= 70 ? g : weekScore >= 40 ? "#9ab0c4" : T.muted, letterSpacing:"-1px" }}>{weekScore}%</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {!dataLoading && view==="cycle" && (
        <div>
          {!cycleSaved ? (
            <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:"14px", padding:"24px", marginBottom:"14px" }}>
              <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"8px" }}>YOUR CYCLE</p>
              <p style={{ fontSize:"15px", color:T.muted, fontStyle:"italic", lineHeight:1.6, marginBottom:"20px" }}>Enter the first day of your last period and we will tell you exactly what your body needs right now.</p>
              <input type="date" value={cycleInput} onChange={function(e){setCycleInput(e.target.value);}}
                style={{ width:"100%", padding:"13px 16px", background:T.bg, border:"1px solid "+T.border, color:T.text, fontSize:"16px", borderRadius:"8px", outline:"none", marginBottom:"12px", fontFamily:"Georgia,serif" }}/>
              <button onClick={saveCycleDate}
                style={{ width:"100%", padding:"14px", background:"#c9a84c", border:"none", color:T.bg, fontSize:"11px", letterSpacing:"4px", fontWeight:"600", borderRadius:"8px", fontFamily:"Georgia,serif" }}>
                REVEAL MY PHASE
              </button>
            </div>
          ) : (
            <div>
              {(() => {
                const phase = getCyclePhase(cycleStartDate);
                return (
                  <div>
                    <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:"14px", padding:"24px", marginBottom:"14px", textAlign:"center" }}>
                      <p style={{ fontSize:"13px", letterSpacing:"3px", color:phase.color, marginBottom:"6px" }}>{phase.icon}</p>
                      <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"6px" }}>{phase.days} - Day {phase.day}</p>
                      <h2 style={{ fontSize:"28px", fontWeight:"400", color:phase.color, marginBottom:"6px", letterSpacing:"1px" }}>{phase.phase} Phase</h2>
                      <div style={{ width:"36px", height:"1px", background:phase.color, margin:"12px auto" }}></div>
                      {(() => {
                        const start = new Date(cycleStartDate);
                        const now = new Date();
                        const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                        const dayInCycle = (diff % 28) + 1;
                        const daysUntilNext = 28 - dayInCycle + 1;
                        return (
                          <div style={{ background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:"10px", padding:"14px 18px", marginBottom:"16px" }}>
                            <p style={{ fontSize:"10px", letterSpacing:"3px", color:"#c9a84c", marginBottom:"4px" }}>NEXT PERIOD IN</p>
                            <p style={{ fontSize:"32px", fontWeight:"300", color:"#c9a84c", letterSpacing:"2px", lineHeight:1 }}>{daysUntilNext} {daysUntilNext === 1 ? "day" : "days"}</p>
                          </div>
                        );
                      })()}
                      <p style={{ fontSize:"15px", lineHeight:1.8, color:T.muted, fontStyle:"italic" }}>{phase.body}</p>
                    </div>
                    <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:"14px", padding:"20px", marginBottom:"14px" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
                        <div>
                          <p style={{ fontSize:"10px", letterSpacing:"3px", color:phase.color, marginBottom:"6px" }}>ENERGY</p>
                          <p style={{ fontSize:"15px", color:T.text, fontStyle:"italic" }}>{phase.energy}</p>
                        </div>
                        <div style={{ borderTop:"1px solid "+T.border, paddingTop:"16px" }}>
                          <p style={{ fontSize:"10px", letterSpacing:"3px", color:phase.color, marginBottom:"6px" }}>MOVEMENT</p>
                          <p style={{ fontSize:"15px", color:T.text, fontStyle:"italic" }}>{phase.workout}</p>
                        </div>
                        <div style={{ borderTop:"1px solid "+T.border, paddingTop:"16px" }}>
                          <p style={{ fontSize:"10px", letterSpacing:"3px", color:phase.color, marginBottom:"6px" }}>NOURISHMENT</p>
                          <p style={{ fontSize:"15px", color:T.text, fontStyle:"italic" }}>{phase.foods}</p>
                        </div>
                        <div style={{ borderTop:"1px solid "+T.border, paddingTop:"16px" }}>
                          <p style={{ fontSize:"10px", letterSpacing:"3px", color:phase.color, marginBottom:"8px" }}>GWB SAYS</p>
                          <p style={{ fontSize:"16px", color:T.text, fontStyle:"italic", lineHeight:1.7 }}>"{phase.affirmation}"</p>
                        </div>
                      </div>
                    </div>
                    <button onClick={function(){setCycleSaved(false);setCycleInput("");}}
                      style={{ width:"100%", padding:"12px", background:"transparent", border:"1px solid "+T.border, color:T.muted, fontSize:"11px", letterSpacing:"3px", borderRadius:"10px", fontFamily:"Georgia,serif" }}>
                      UPDATE CYCLE DATE
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {!dataLoading && view==="vision" && (
        <div>
          <p style={{ fontSize:"10px", letterSpacing:"4px", color:T.muted, marginBottom:"6px" }}>YOUR VISION BOARD</p>
          <p style={{ fontSize:"13px", color:T.dim, fontStyle:"italic", marginBottom:"16px", lineHeight:1.5 }}>Your private space. Add images of what you are building toward.</p>

          {/* Upload section */}
          <div style={{ background:T.card, border:"1px solid "+T.border, borderRadius:"14px", padding:"16px", marginBottom:"16px" }}>
            {visionImagePreview ? (
              <div style={{ position:"relative", marginBottom:"12px" }}>
                <img src={visionImagePreview} style={{ width:"100%", borderRadius:"10px", maxHeight:"240px", objectFit:"cover" }}/>
                <button onClick={function(){setVisionImage(null);setVisionImagePreview(null);}}
                  style={{ position:"absolute", top:"8px", right:"8px", background:"rgba(26,22,18,0.8)", border:"none", color:T.text, width:"28px", height:"28px", borderRadius:"50%", fontSize:"16px", fontFamily:"Georgia,serif" }}>x</button>
              </div>
            ) : (
              <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px", background:T.bg, border:"2px dashed "+T.border, borderRadius:"10px", cursor:"pointer", marginBottom:"12px" }}>
                <p style={{ fontSize:"24px", color:T.dim, marginBottom:"8px" }}>{"◉"}</p>
                <p style={{ fontSize:"12px", letterSpacing:"2px", color:T.muted, fontFamily:"Georgia,serif" }}>TAP TO ADD IMAGE</p>
                <input type="file" accept="image/*" onChange={handleVisionImageSelect} style={{ display:"none" }}/>
              </label>
            )}
            <input value={visionCaption} onChange={function(e){setVisionCaption(e.target.value);}}
              placeholder="Add a caption... (optional)"
              style={{ width:"100%", padding:"11px 14px", background:T.bg, border:"1px solid "+T.border, color:T.text, fontSize:"14px", borderRadius:"8px", outline:"none", fontStyle:"italic", fontFamily:"Georgia,serif", marginBottom:"10px" }}/>
            <button onClick={submitVisionPost} disabled={!visionImage || uploadingVision}
              style={{ width:"100%", padding:"13px", background: visionImage ? (aesObj ? aesObj.color : T.gold) : T.accent, border:"none", color:T.bg, fontSize:"11px", letterSpacing:"4px", fontWeight:"600", borderRadius:"8px", fontFamily:"Georgia,serif", opacity: !visionImage ? 0.5 : 1 }}>
              {uploadingVision ? "ADDING TO YOUR BOARD..." : "ADD TO VISION BOARD"}
            </button>
          </div>

          {/* Vision grid */}
          {visionPosts.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:T.dim }}>
              <p style={{ fontSize:"32px", marginBottom:"12px", color:aesObj ? aesObj.color : T.gold, opacity:0.4 }}>{"◉"}</p>
              <p style={{ fontSize:"15px", fontStyle:"italic", lineHeight:1.8, color:T.muted }}>Your vision board is empty.<br/>Start adding images of what you are building.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {visionPosts.map(function(post) {
                return (
                  <div key={post.id} style={{ position:"relative", borderRadius:"10px", overflow:"hidden" }}>
                    <img src={post.image_url} style={{ width:"100%", height:"160px", objectFit:"cover", display:"block" }}/>
                    {post.caption && (
                      <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent, rgba(26,22,18,0.9))", padding:"20px 10px 8px" }}>
                        <p style={{ fontSize:"12px", color:T.text, fontStyle:"italic", fontFamily:"Georgia,serif" }}>{post.caption}</p>
                      </div>
                    )}
                    <button onClick={function(){deleteVisionPost(post.id);}}
                      style={{ position:"absolute", top:"6px", right:"6px", background:"rgba(26,22,18,0.7)", border:"none", color:T.text, width:"24px", height:"24px", borderRadius:"50%", fontSize:"12px", fontFamily:"Georgia,serif", cursor:"pointer" }}>x</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:T.card, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-around", padding:"10px 0 20px", zIndex:50 }}>
        {[
          { v:"today", icon:"◈", label:"HOME" },
          { v:"goals", icon:"✶", label:"GOALS" },
          { v:"wall", icon:"◎", label:"CIRCLE" },
          { v:"cycle", icon:"☽", label:"CYCLE" },
          { v:"vision", icon:"◉", label:"VISION" },
        ].map(({ v, icon, label }) => (
          <button key={v} onClick={() => { setView(v); if(v==="wall") loadWall(); if(v==="vision") loadVisionBoard(); }}
            style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", opacity: view===v?1:0.35 }}>
            <span style={{ fontSize:"20px", color: view===v?gold:T.muted }}>{icon}</span>
            <span style={{ fontSize:"9px", letterSpacing:"2px", color: view===v?gold:T.muted }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Celebration */}
      {celebrating && (
        <div className="fi" style={{ position:"fixed", inset:0, background:"rgba(26,22,18,0.97)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <p style={{ fontSize:"52px", marginBottom:"16px", color:gold, animation:"shimmer 1.5s infinite" }}>{aesObj?.icon||"?"}</p>
          <p style={{ fontSize:"28px", fontWeight:"300", color:T.text, letterSpacing:"2px", marginBottom:"10px" }}>Fully Aligned.</p>
          <p style={{ fontSize:"12px", letterSpacing:"4px", color:gold }}>THE WOMAN YOU'RE BECOMING IS PROUD.</p>
        </div>
      )}
    </div>
  );
}
