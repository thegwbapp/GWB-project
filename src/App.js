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

const POST_TYPES = [
  { id:"win", label:"\uD83C\uDFC6 Sharing a Win", color:"#8a9e88" },
  { id:"reflection", label:"\uD83D\uDCAD Reflection", color:"#9ab0c4" },
  { id:"question", label:"\u2753 Asking the Circle", color:"#c4a882" },
  { id:"encouragement", label:"\uD83D\uDCE3 Encouragement", color:"#b8862a" },
];

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
  button{cursor:pointer;font-family:Georgia,'Times New Roman',serif;transition:all .2s}
  button:active{opacity:.8;transform:scale(.98)}
  input,textarea{font-family:Georgia,'Times New Roman',serif}
  input::placeholder,textarea::placeholder{color:#a89880}
  textarea{resize:none}
  input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{
    -webkit-box-shadow:0 0 0 30px #ede8df inset !important;
    -webkit-text-fill-color:#2a2218 !important;
  }
`;

const NUDGE_ANGLES = [
  "Give her a bold direct challenge — push her to act right now.",
  "Give her something soft and affirming — remind her of her worth.",
  "Give her a perspective shift — reframe how she sees today.",
  "Give her a reality check — speak to what she might be avoiding.",
  "Give her something poetic and inspiring — speak to her soul.",
  "Give her a practical spark — one specific thing she can do right now.",
  "Give her a reminder of the bigger picture — why this daily work matters.",
  "Celebrate where she is right now — even if it is not perfect.",
];

function Avatar({ icon, color, size=40 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`${color}22`, border:`2px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontSize:size*0.42, color }}>{icon}</span>
    </div>
  );
}

function CircleProgress({ pct, color }) {
  const r = 38, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke={`${color}33`} strokeWidth="3" />
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
  const [wallTab, setWallTab] = useState("feed");
  const [activityFeed, setActivityFeed] = useState([]);
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState(null);
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [replyTexts, setReplyTexts] = useState({});
  const [replies, setReplies] = useState({});
  const [reactions, setReactions] = useState({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeResponse, setChallengeResponse] = useState("");
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);
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

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const saved = localStorage.getItem("gwb_user_id");
        if (saved) {
          const recs = await dbGet("users", "id=eq." + saved + "&limit=1");
          const data = recs && recs[0] ? recs[0] : null;
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
    loadVisionBoard(u);
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
    if (day <= 5) return { phase:"Menstrual", days:"Days 1-5", day, icon:"New Moon", color:"#8a6a8a", body:"Your body is shedding and renewing. Estrogen and progesterone are at their lowest. You may feel introspective, tired, and sensitive. This is intentional rest, not weakness.", energy:"Low to Moderate", workout:"Gentle yoga, walking, stretching. Honor the rest.", foods:"Iron-rich foods: leafy greens, lentils, dark chocolate. Warm nourishing meals.", affirmation:"Rest is productive. My body is doing sacred work." };
    if (day <= 13) return { phase:"Follicular", days:"Days 6-13", day, icon:"Waxing Moon", color:"#8a9e88", body:"Estrogen is rising. Your brain is sharp, your mood is lifting, and your energy is building. This is your fresh start energy. New ideas, new commitments, new momentum.", energy:"Rising", workout:"Strength training, cardio, trying something new. You have the energy for it.", foods:"Fermented foods, lean proteins, fresh vegetables. Your metabolism is ready.", affirmation:"I am rising. My potential is expanding with every day." };
    if (day <= 16) return { phase:"Ovulatory", days:"Days 14-16", day, icon:"Full Moon", color:"#c9a84c", body:"Peak estrogen and testosterone. You are magnetic right now. Communication is easiest, confidence is highest, and your body is at its strongest. Use this window.", energy:"Peak", workout:"High intensity, group classes, personal records. Your body can handle it all.", foods:"Light, energizing foods. Raw vegetables, smoothies, fiber-rich meals.", affirmation:"I am at my most powerful. I move through the world with ease and confidence." };
    return { phase:"Luteal", days:"Days 17-28", day, icon:"Waning Moon", color:"#9ab0c4", body:"Progesterone rises then drops. You may crave comfort, feel more emotional, or want to slow down. This is not a flaw. This is your body asking for intentional care before the reset.", energy:"Declining", workout:"Moderate cardio, pilates, walks. Reduce intensity as you near day 28.", foods:"Magnesium-rich foods: dark chocolate, nuts, seeds. Complex carbs for mood stability.", affirmation:"I honor my need to slow down. Softness is my strength right now." };
  };

  const saveCycleDate = async () => {
    if (!cycleInput) return;
    setCycleStartDate(cycleInput); setCycleSaved(true);
    if (user) {
      try {
        await fetch("https://jppebmgmciiemxfhbdxf.supabase.co/rest/v1/users?id=eq." + user.id, {
          method:"PATCH",
          headers:{"apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGVibWdtY2lpZW14ZmhiZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTE5MDksImV4cCI6MjA5MDk4NzkwOX0.AC3NUHkZtd2SDT7YOliQd-m1tuGa8_xOORvyMKo36jc","Content-Type":"application/json"},
          body:JSON.stringify({cycle_start:cycleInput})
        });
      } catch(e) { console.error(e); }
    }
  };

  const loadVisionBoard = async (u) => {
    const uid = (u || user)?.id; if (!uid) return;
    const data = await dbGet("vision_board", "user_id=eq." + uid + "&order=created_at.desc");
    setVisionPosts(data || []);
  };

  const handleVisionImageSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setVisionImage(file); setVisionImagePreview(URL.createObjectURL(file));
  };

  const submitVisionPost = async () => {
    if (!visionImage) return;
    setUploadingVision(true);
    const fd = new FormData(); fd.append("file", visionImage); fd.append("upload_preset", "tsuduljg");
    try {
      const r = await fetch("https://api.cloudinary.com/v1_1/dwhjqqkjg/image/upload", {method:"POST",body:fd});
      const d = await r.json();
      if (d.secure_url) {
        const rec = await dbInsert("vision_board", {user_id:user.id, image_url:d.secure_url, caption:visionCaption.trim()});
        if (rec && !rec.code) setVisionPosts(prev => [rec, ...prev]);
      }
    } catch(e) { console.error(e); }
    setUploadingVision(false); setVisionImage(null); setVisionImagePreview(null); setVisionCaption("");
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
    (r || []).forEach(rec => { if (!rMap[rec.post_id]) rMap[rec.post_id] = []; rMap[rec.post_id].push(rec); });
    setReactions(rMap);
    loadActivityFeed();
    loadDailyChallenge();
  };

  const loadActivityFeed = async () => {
    const todayStr = today();
    const [recentCheckins, recentUsers, recentPosts] = await Promise.all([
      dbGet("checkins", "date=eq." + todayStr + "&order=created_at.desc&limit=15"),
      dbGet("users", "order=created_at.desc&limit=10"),
      dbGet("posts", "date=eq." + todayStr + "&order=created_at.desc&limit=10"),
    ]);
    const feed = [];
    (recentCheckins || []).forEach(c => { feed.push({type:"checkin", display_name:c.display_name||"Someone", goal_text:c.goal_text, streak:c.streak, aesthetic:c.aesthetic, created_at:c.created_at}); });
    (recentUsers || []).forEach(u => { if (u.created_at?.split("T")[0] === todayStr) feed.push({type:"joined", display_name:u.display_name, aesthetic:u.aesthetic, created_at:u.created_at}); });
    (recentPosts || []).forEach(p => { if (p.content) feed.push({type:"post", display_name:p.display_name, content:p.content, aesthetic:p.aesthetic, created_at:p.created_at}); });
    feed.sort((a,b) => (b.created_at||"").localeCompare(a.created_at||""));
    setActivityFeed(feed.slice(0,20));
  };

  const loadDailyChallenge = async () => {
    const todayStr = today();
    const cached = localStorage.getItem("gwb_challenge_" + todayStr);
    if (cached) {
      setDailyChallenge(JSON.parse(cached));
      if (localStorage.getItem("gwb_challenge_responded_" + todayStr)) setChallengeSubmitted(true);
      return;
    }
    setChallengeLoading(true);
    try {
      const dayOfWeek = new Date().toLocaleDateString("en-US", {weekday:"long"});
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:200,
          system:"You are the voice of Be Her Daily — The Grown Woman Blueprint. Create a single daily community challenge prompt for women focused on intentional living and growth. Make it thoughtful, specific, and inspiring. Return ONLY the question itself — under 20 words, no quotes.",
          messages:[{role:"user",content:`Today is ${dayOfWeek}. Generate today's community challenge prompt.`}]
        })
      });
      const data = await res.json();
      const prompt = data.content?.map(b=>b.text||"").join("").trim() || "What is one thing you are choosing to prioritize for yourself today?";
      const challenge = {prompt, date:todayStr};
      setDailyChallenge(challenge);
      localStorage.setItem("gwb_challenge_" + todayStr, JSON.stringify(challenge));
    } catch {
      setDailyChallenge({prompt:"What is one thing you are choosing to prioritize for yourself today?", date:todayStr});
    }
    setChallengeLoading(false);
  };

  const submitChallengeResponse = async () => {
    if (!challengeResponse.trim()) return;
    const content = challengeResponse.trim();
    setChallengeResponse(""); setChallengeSubmitted(true);
    localStorage.setItem("gwb_challenge_responded_" + today(), "yes");
    const data = await dbInsert("posts", {user_id:user.id, display_name:user.display_name, content, image_url:null, aesthetic, streak, date:today(), is_challenge:true, post_type:"reflection"});
    if (data && !data.code) setPosts(prev => [data, ...prev]);
  };

  const loadReplies = async (postId) => {
    const data = await dbGet("replies", "post_id=eq." + postId + "&order=created_at.asc");
    setReplies(prev => ({...prev, [postId]: data || []}));
  };

  const handleAuth = async () => {
    const email = emailInput.trim().toLowerCase();
    const dname = displayNameInput.trim();
    if (!email || !email.includes("@")) { setAuthError("Please enter a valid email."); return; }
    setAuthLoading(true); setAuthError("");
    if (isNewUser) {
      if (!dname || dname.length < 2) { setAuthError("Pick a display name (2+ characters)."); setAuthLoading(false); return; }
      const existingArr = await dbGet("users", "email=eq." + encodeURIComponent(email) + "&limit=1");
      if (existingArr?.[0]?.id) { setAuthError("That email already has an account. Sign in instead."); setAuthLoading(false); return; }
      const nameCheckArr = await dbGet("users", "display_name=eq." + encodeURIComponent(dname) + "&limit=1");
      if (nameCheckArr?.[0]?.id) { setAuthError("That display name is taken. Try another."); setAuthLoading(false); return; }
      const newUser = await dbInsert("users", {email, display_name:dname});
      if (!newUser || newUser.code) { setAuthError("Could not create account. Try again."); setAuthLoading(false); return; }
      try { localStorage.setItem("gwb_user_id", newUser.id); } catch {}
      setUser(newUser); setAuthLoading(false); setScreen("quiz");
    } else {
      if (!dname || dname.length < 2) { setAuthError("Enter your display name to sign in."); setAuthLoading(false); return; }
      const foundArr = await dbGet("users", "email=eq." + encodeURIComponent(email) + "&display_name=eq." + encodeURIComponent(dname) + "&limit=1");
      const found = foundArr?.[0];
      if (!found?.id) { setAuthError("No account found. Check your email and display name."); setAuthLoading(false); return; }
      try { localStorage.setItem("gwb_user_id", found.id); } catch {}
      setUser(found); setAuthLoading(false);
      if (found.quiz_done && found.aesthetic) { setAesthetic(found.aesthetic); setScreen("app"); loadUserData(found); }
      else setScreen("quiz");
    }
  };

  const handleQuizAnswer = async (option) => {
    setQuizSelected(option);
    setTimeout(async () => {
      const ns = {...quizScores};
      Object.entries(option.scores).forEach(([k,v]) => { ns[k] = (ns[k]||0) + v; });
      setQuizScores(ns); setQuizSelected(null); setQuizKey(k => k+1);
      if (quizStep < QUESTIONS.length - 1) { setQuizStep(s => s+1); }
      else {
        const winner = Object.entries(ns).sort((a,b) => b[1]-a[1])[0][0];
        setAesthetic(winner);
        if (user) await dbUpdate("users", user.id, {aesthetic:winner, quiz_done:true});
        setUser(prev => ({...prev, aesthetic:winner, quiz_done:true}));
        setScreen("result");
      }
    }, 380);
  };

  const enterApp = async () => {
    const suggested = AESTHETICS[aesthetic]?.goals || [];
    const saved = [];
    for (let i = 0; i < suggested.length; i++) {
      const rec = await dbInsert("goals", {user_id:user.id, goal_text:suggested[i]});
      if (rec && !rec.code) saved.push(rec);
    }
    setGoals(saved); setScreen("app"); setView("today"); loadWall();
  };

  const addGoal = async () => {
    if (!newGoal.trim()) return;
    const text = newGoal.trim(); setNewGoal("");
    const data = await dbInsert("goals", {user_id:user.id, goal_text:text});
    if (data && !data.code) setGoals(prev => [...prev, data]);
  };

  const removeGoal = async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    await dbDelete("goals", id);
  };

  const todayCheckins = checkins.filter(c => c.date === today());
  const checkedIds = new Set(todayCheckins.map(c => c.goal_id));
  const completedCount = goals.filter(g => checkedIds.has(g.id)).length;
  const pct = goals.length ? Math.round((completedCount / goals.length) * 100) : 0;

  const toggleCheckin = async (goal) => {
    const done = checkedIds.has(goal.id);
    if (done) {
      const rec = todayCheckins.find(c => c.goal_id === goal.id);
      if (rec) { setCheckins(prev => prev.filter(c => c.id !== rec.id)); await dbDelete("checkins", rec.id); }
    } else {
      const data = await dbInsert("checkins", {user_id:user.id, goal_id:goal.id, goal_text:goal.goal_text, date:today(), streak:streak+1, aesthetic, display_name:user.display_name});
      if (data && !data.code) setCheckins(prev => [...prev, data]);
      if (completedCount+1 === goals.length && goals.length > 0) { setCelebrating(true); setTimeout(() => setCelebrating(false), 4000); }
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPostImage(file); setPostImagePreview(URL.createObjectURL(file));
  };

  const submitPost = async () => {
    if (!postContent.trim() && !postImage) return;
    const content = postContent.trim();
    setPostContent(""); setPostImage(null); setPostImagePreview(null); setPostType(null); setComposerOpen(false);
    setUploadingImage(true);
    let image_url = null;
    if (postImage) image_url = await uploadImage(postImage);
    setUploadingImage(false);
    const data = await dbInsert("posts", {user_id:user.id, display_name:user.display_name, content, image_url, aesthetic, streak, date:today(), post_type:postType, is_challenge:false});
    if (data && !data.code) setPosts(prev => [data, ...prev]);
  };

  const toggleReaction = async (postId, emoji) => {
    const postReactions = reactions[postId] || [];
    const existing = postReactions.find(r => r.user_id===user.id && r.emoji===emoji);
    if (existing) {
      setReactions(prev => ({...prev, [postId]:postReactions.filter(r => r.id!==existing.id)}));
      await dbDelete("reactions", existing.id);
    } else {
      const data = await dbInsert("reactions", {post_id:postId, user_id:user.id, emoji});
      if (data && !data.code) setReactions(prev => ({...prev, [postId]:[...postReactions, data]}));
    }
  };

  const submitReply = async (postId) => {
    const content = (replyTexts[postId]||"").trim();
    if (!content) return;
    setReplyTexts(prev => ({...prev, [postId]:""}));
    const data = await dbInsert("replies", {post_id:postId, user_id:user.id, display_name:user.display_name, content, aesthetic});
    if (data && !data.code) setReplies(prev => ({...prev, [postId]:[...(prev[postId]||[]), data]}));
  };

  const getAINudge = async () => {
    setLoadingAI(true); setAiMsg("");
    const done = goals.filter(g => checkedIds.has(g.id)).map(g => g.goal_text);
    const pending = goals.filter(g => !checkedIds.has(g.id)).map(g => g.goal_text);
    const angle = NUDGE_ANGLES[Math.floor(Math.random() * NUDGE_ANGLES.length)];
    const seed = Math.random().toString(36).substring(7);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:`You are the voice of Be Her Daily — The Grown Woman Blueprint. Speak like The Grown Woman Blueprint: refined, warm, direct. No fluff. No emojis. 2-3 sentences max. The user's aesthetic is ${aesObj?.name} - "${aesObj?.tagline}". Address them by display name. Every nudge must feel completely fresh. Seed: ${seed}.`,
          messages:[{role:"user",content:`Name: ${user?.display_name}\nAesthetic: ${aesObj?.name}\nStreak: ${streak} days\nCompleted: ${done.join(", ")||"none yet"}\nPending: ${pending.join(", ")||"all done!"}\nAngle: ${angle}\nGive a nudge from this specific angle.`}]
        })
      });
      const data = await res.json();
      setAiMsg(data.content?.map(b=>b.text||"").join("")||"The woman you are becoming is watching. Keep going.");
    } catch { setAiMsg("The woman you are becoming is watching. Keep going."); }
    setLoadingAI(false);
  };

  if (screen==="splash") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:SERIF}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center"}}>
        <p style={{fontSize:"10px",letterSpacing:"6px",color:T.muted,marginBottom:"12px"}}>BE HER</p>
        <h1 style={{fontSize:"52px",fontWeight:"300",color:T.text,letterSpacing:"4px",lineHeight:1}}>DAILY</h1>
        <div style={{width:"30px",height:"1px",background:T.gold,margin:"14px auto"}}/>
        <p style={{fontSize:"10px",letterSpacing:"5px",color:T.muted}}>THE GROWN WOMAN BLUEPRINT</p>
      </div>
    </div>
  );

  if (screen==="setup") return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:SERIF,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:"400px"}}>
        <div className="fu" style={{textAlign:"center",marginBottom:"40px"}}>
          <p style={{fontSize:"10px",letterSpacing:"6px",color:T.muted,marginBottom:"10px"}}>BE HER</p>
          <h1 style={{fontSize:"44px",fontWeight:"300",color:T.text,letterSpacing:"3px",lineHeight:1,marginBottom:"10px"}}>Daily</h1>
          <div style={{width:"36px",height:"1px",background:T.gold,margin:"0 auto 12px"}}/>
          <p style={{fontSize:"11px",letterSpacing:"3px",color:T.muted}}>THE GROWN WOMAN BLUEPRINT</p>
        </div>
        <div className="fu2" style={{borderLeft:`2px solid ${T.gold}`,padding:"12px 16px",background:`${T.gold}11`,borderRadius:"0 8px 8px 0",marginBottom:"28px"}}>
          <p style={{fontStyle:"italic",color:T.muted,fontSize:"15px",lineHeight:1.6}}>{quote}</p>
        </div>
        <div className="fu3" style={{display:"flex",marginBottom:"16px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"10px",padding:"4px"}}>
          {[["Join the Circle",true],["Sign In",false]].map(([label,val]) => (
            <button key={label} onClick={()=>{setIsNewUser(val);setAuthError("");}}
              style={{flex:1,padding:"11px",background:isNewUser===val?T.gold:"transparent",border:"none",color:isNewUser===val?"#fff":T.muted,fontSize:"12px",letterSpacing:"2px",borderRadius:"8px",fontWeight:isNewUser===val?"600":"400"}}>
              {label}
            </button>
          ))}
        </div>
        <div className="fu4" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"24px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:"10px",marginBottom:"10px"}}>
            <input value={emailInput} onChange={e=>{setEmailInput(e.target.value);setAuthError("");}} onKeyDown={e=>e.key==="Enter"&&handleAuth()} placeholder="Your email address" style={{padding:"13px 16px",background:T.bg,border:`1px solid ${T.border}`,color:T.text,fontSize:"16px",borderRadius:"8px",outline:"none"}}/>
            <input value={displayNameInput} onChange={e=>{setDisplayNameInput(e.target.value);setAuthError("");}} onKeyDown={e=>e.key==="Enter"&&handleAuth()} placeholder={isNewUser?"Choose a display name":"Your display name"} style={{padding:"13px 16px",background:T.bg,border:`1px solid ${T.border}`,color:T.text,fontSize:"16px",borderRadius:"8px",outline:"none"}}/>
          </div>
          {authError&&<p style={{color:"#c07a5a",fontSize:"13px",fontStyle:"italic",marginBottom:"10px",lineHeight:1.5}}>{authError}</p>}
          <button onClick={handleAuth} disabled={authLoading} style={{width:"100%",padding:"15px",background:T.gold,border:"none",color:"#fff",fontSize:"11px",letterSpacing:"4px",fontWeight:"600",borderRadius:"8px",opacity:authLoading?0.6:1}}>
            {authLoading?"· · ·":isNewUser?"ENTER THE CIRCLE":"WELCOME BACK"}
          </button>
        </div>
      </div>
    </div>
  );

  if (screen==="quiz") {
    const q = QUESTIONS[quizStep];
    const progress = (quizStep/QUESTIONS.length)*100;
    return (
      <div style={{minHeight:"100vh",background:T.bg,fontFamily:SERIF,color:T.text,padding:"40px 20px 60px",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <style>{CSS}</style>
        <div style={{width:"100%",maxWidth:"460px"}}>
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"10px"}}>
              <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted}}>DISCOVER YOUR AESTHETIC</p>
              <p style={{fontSize:"12px",color:T.dim}}>{quizStep+1} / {QUESTIONS.length}</p>
            </div>
            <div style={{height:"2px",background:T.border,borderRadius:"1px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,background:T.gold,transition:"width 0.4s ease"}}/>
            </div>
          </div>
          <div key={`q${quizKey}`} className="fu" style={{marginBottom:"28px"}}>
            <h2 style={{fontSize:"25px",fontWeight:"400",color:T.text,lineHeight:1.5,fontStyle:"italic"}}>{q.question}</h2>
          </div>
          <div key={`o${quizKey}`} style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {q.options.map((opt,i) => {
              const isSel = quizSelected===opt;
              return (
                <button key={i} onClick={()=>handleQuizAnswer(opt)} className={`fu${Math.min(i+2,6)}`}
                  style={{padding:"15px 20px",background:isSel?`${T.gold}18`:T.card,border:`1px solid ${isSel?T.gold:T.border}`,borderRadius:"10px",textAlign:"left",color:isSel?T.gold:T.text,fontSize:"15px",lineHeight:1.5,fontStyle:"italic"}}>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen==="result"&&aesObj) return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:SERIF,color:T.text,display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 20px"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:"440px",textAlign:"center"}}>
        <p className="fu" style={{fontSize:"10px",letterSpacing:"6px",color:T.muted,marginBottom:"16px"}}>YOU ARE</p>
        <p className="fu2" style={{fontSize:"56px",color:gold,lineHeight:1,marginBottom:"8px"}}>{aesObj.icon}</p>
        <h1 className="fu3" style={{fontSize:"34px",fontWeight:"400",color:T.text,letterSpacing:"1px",lineHeight:1.2,marginBottom:"6px"}}>{aesObj.name}</h1>
        <p className="fu4" style={{fontSize:"11px",letterSpacing:"4px",color:gold,marginBottom:"22px"}}>{aesObj.tagline.toUpperCase()}</p>
        <div className="fu4" style={{width:"40px",height:"1px",background:gold,margin:"0 auto 22px"}}/>
        <div className="fu4" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"12px",padding:"22px",marginBottom:"14px",textAlign:"left"}}>
          <p style={{fontSize:"16px",lineHeight:1.85,color:T.muted,fontStyle:"italic"}}>{aesObj.description}</p>
        </div>
        <div className="fu5" style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"12px",padding:"20px",marginBottom:"22px",textAlign:"left"}}>
          <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted,marginBottom:"16px"}}>YOUR NON-NEGOTIABLES</p>
          {aesObj.goals.map((g,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:"12px",padding:"11px 0",borderTop:i>0?`1px solid ${T.border}`:"none"}}>
              <span style={{color:gold,fontSize:"13px",flexShrink:0}}>{aesObj.icon}</span>
              <span style={{fontSize:"15px",color:T.text,fontStyle:"italic"}}>{g}</span>
            </div>
          ))}
        </div>
        <button className="fu6" onClick={enterApp} style={{width:"100%",padding:"16px",background:gold,border:"none",color:"#fff",fontSize:"11px",letterSpacing:"4px",fontWeight:"600",borderRadius:"10px"}}>
          BEGIN MY DAILY CHECK-IN
        </button>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:SERIF,color:T.text,paddingBottom:"90px"}}>
      <style>{CSS}</style>
      <div style={{maxWidth:"480px",margin:"0 auto",padding:"0 18px",position:"relative"}}>
        <div style={{padding:"26px 0 14px"}}>
          <p style={{fontSize:"10px",letterSpacing:"5px",color:T.muted,marginBottom:"2px"}}>THE GROWN WOMAN BLUEPRINT</p>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h1 style={{fontSize:"28px",fontWeight:"400",color:T.text,letterSpacing:"1px"}}>Be Her Daily</h1>
            {streak>0&&<div style={{display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",background:`${gold}18`,border:`1px solid ${gold}44`,borderRadius:"20px"}}>
              <span style={{color:gold,fontSize:"10px"}}>{aesObj?.icon||"o"}</span>
              <span style={{fontSize:"11px",color:gold,letterSpacing:"1px"}}>{streak}d streak</span>
            </div>}
          </div>
        </div>

        <div style={{borderLeft:`2px solid ${gold}`,padding:"11px 14px",background:`${gold}11`,borderRadius:"0 8px 8px 0",marginBottom:"14px"}}>
          <p style={{fontStyle:"italic",color:T.muted,fontSize:"14px",lineHeight:1.5}}>{quote}</p>
        </div>

        {aesObj&&<div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"10px",marginBottom:"14px"}}>
          <span style={{fontSize:"18px",color:gold}}>{aesObj.icon}</span>
          <div style={{flex:1}}>
            <p style={{fontSize:"11px",color:gold,letterSpacing:"2px"}}>{aesObj.name.toUpperCase()}</p>
            <p style={{fontSize:"12px",color:T.dim,fontStyle:"italic"}}>{aesObj.tagline}</p>
          </div>
          <p style={{fontSize:"11px",color:T.dim,fontStyle:"italic"}}>@{user?.display_name}</p>
        </div>}

        {view==="today"&&goals.length>0&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"18px",marginBottom:"12px",display:"flex",alignItems:"center",gap:"18px"}}>
          <CircleProgress pct={pct} color={gold}/>
          <div>
            <p style={{fontSize:"19px",fontWeight:"400",color:T.text,marginBottom:"4px"}}>Today's Alignment</p>
            <p style={{fontSize:"13px",color:T.muted,marginBottom:"5px"}}>{completedCount} of {goals.length} non-negotiables</p>
            <p style={{fontSize:"12px",color:T.dim,fontStyle:"italic",lineHeight:1.4}}>{pct===100?"Fully aligned. You showed up.":pct>=50?"You are in motion. Keep going.":"Your day is waiting for you."}</p>
          </div>
        </div>}

        {view==="today"&&goals.length>0&&<div style={{marginBottom:"12px"}}>
          <button onClick={getAINudge} disabled={loadingAI} style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${gold}`,color:gold,fontSize:"11px",letterSpacing:"3px",borderRadius:"10px",opacity:loadingAI?0.6:1}}>
            {loadingAI?"· · ·":`${aesObj?.icon||"o"}  RECEIVE YOUR NUDGE`}
          </button>
          {aiMsg&&<div className="fi" style={{marginTop:"10px",padding:"14px 16px",background:T.card,border:`1px solid ${T.border}`,borderLeft:`3px solid ${gold}`,borderRadius:"0 10px 10px 0"}}>
            <p style={{fontSize:"10px",letterSpacing:"3px",color:gold,marginBottom:"6px"}}>BHD SAYS</p>
            <p style={{fontSize:"15px",lineHeight:1.7,color:T.muted,fontStyle:"italic"}}>{aiMsg}</p>
          </div>}
        </div>}

        {dataLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.dim,letterSpacing:"4px",fontSize:"11px"}}>LOADING</div>}

        {!dataLoading&&view==="today"&&<div>
          {goals.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:T.dim}}>
              <p style={{fontSize:"26px",marginBottom:"12px",color:gold,opacity:.4}}>{aesObj?.icon||"o"}</p>
              <p style={{fontSize:"15px",fontStyle:"italic",lineHeight:1.8,color:T.muted}}>No non-negotiables yet.<br/>Head to Goals to add some.</p>
            </div>
          ):(
            <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"18px",marginBottom:"12px"}}>
              <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted,marginBottom:"16px"}}>NON-NEGOTIABLES</p>
              {goals.map((goal,i) => {
                const done = checkedIds.has(goal.id);
                return (
                  <button key={goal.id} onClick={()=>toggleCheckin(goal)}
                    style={{display:"flex",alignItems:"center",gap:"14px",background:"none",border:"none",borderTop:i>0?`1px solid ${T.border}`:"none",padding:"13px 0",textAlign:"left",width:"100%"}}>
                    <div style={{width:"22px",height:"22px",flexShrink:0,borderRadius:"50%",border:`2px solid ${done?gold:T.accent}`,background:done?`${gold}22`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s"}}>
                      {done&&<div style={{width:"8px",height:"8px",borderRadius:"50%",background:gold}}/>}
                    </div>
                    <span style={{fontSize:"16px",color:done?T.dim:T.text,textDecoration:done?"line-through":"none",fontStyle:"italic",lineHeight:1.4,transition:"all 0.3s"}}>{goal.goal_text}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>}

        {!dataLoading&&view==="today"&&goals.length>0&&(
          <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:"14px",padding:"18px",marginBottom:"12px"}}>
            <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted,marginBottom:"16px"}}>THIS WEEK</p>
            {(()=>{
              const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
              const now=new Date();
              const startOfWeek=new Date(now); startOfWeek.setDate(now.getDate()-now.getDay());
              const todayKey=today();
              const weekDays=Array.from({length:7},(_,i)=>{
                const d=new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i);
                const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
                const dayCheckins=checkins.filter(c=>c.date===key);
                const done=dayCheckins.length; const total=goals.length;
                const dayPct=total?Math.round(done/total*100):0;
                return {label:dayNames[i],key,done,total,pct:dayPct,isToday:key===todayKey,isFuture:d>now};
              });
              const totalPossible=goals.length*7;
              const totalDone=weekDays.reduce((s,d)=>s+d.done,0);
              const weekScore=totalPossible?Math.round(totalDone/totalPossible*100):0;
              const g=aesObj?aesObj.color:T.gold;
              return (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"14px",gap:"4px"}}>
                    {weekDays.map(day=>(
                      <div key={day.key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",flex:1}}>
                        <div style={{width:"100%",height:"60px",background:T.bg,border:"1px solid "+T.border,borderRadius:"4px",overflow:"hidden",display:"flex",alignItems:"flex-end"}}>
                          <div style={{width:"100%",height:day.pct+"%",background:day.isFuture?"transparent":day.isToday?g:day.pct===100?g:T.accent,borderRadius:"4px",transition:"height 0.5s ease",minHeight:day.done>0?"4px":"0"}}/>
                        </div>
                        <p style={{fontSize:"9px",letterSpacing:"1px",color:day.isToday?g:T.muted}}>{day.label}</p>
                        <p style={{fontSize:"9px",color:day.pct===100?g:T.dim}}>{day.done}/{day.total}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{borderTop:"1px solid "+T.border,paddingTop:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <p style={{fontSize:"10px",letterSpacing:"3px",color:T.muted,marginBottom:"2px"}}>WEEKLY SCORE</p>
                      <p style={{fontSize:"11px",color:T.dim,fontStyle:"italic"}}>{totalDone} of {totalPossible} possible</p>
                    </div>
                    <p style={{fontSize:"36px",fontWeight:"300",color:weekScore>=70?g:weekScore>=40?"#9ab0c4":T.muted,letterSpacing:"-1px"}}>{weekScore}%</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {!dataLoading&&view==="goals"&&<div>
          <div style={{display:"flex",marginBottom:"12px"}}>
            <input value={newGoal} onChange={e=>setNewGoal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGoal()} placeholder="Add a non-negotiable..."
              style={{flex:1,padding:"13px 16px",background:T.card,border:`1px solid ${T.border}`,borderRight:"none",color:T.text,fontSize:"15px",borderRadius:"8px 0 0 8px",outline:"none",fontStyle:"italic"}}/>
            <button onClick={addGoal} style={{padding:"13px 18px",background:gold,border:"none",color:"#fff",fontSize:"20px",borderRadius:"0 8px 8px 0"}}>+</button>
          </div>
          {goals.length===0
            ?<div style={{textAlign:"center",padding:"36px 0",color:T.dim,fontSize:"15px",fontStyle:"italic"}}>Add the non-negotiables you commit to daily.</div>
            :<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",overflow:"hidden"}}>
              {goals.map((goal,i) => (
                <div key={goal.id} style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px",borderTop:i>0?`1px solid ${T.border}`:"none"}}>
                  <span style={{color:gold,fontSize:"13px",flexShrink:0}}>{aesObj?.icon||"o"}</span>
                  <span style={{flex:1,fontSize:"15px",color:T.text,lineHeight:1.4,fontStyle:"italic"}}>{goal.goal_text}</span>
                  <button onClick={()=>removeGoal(goal.id)} style={{background:"none",border:"none",color:T.dim,fontSize:"18px",padding:"0 4px"}}>×</button>
                </div>
              ))}
            </div>
          }
          <button onClick={()=>{setQuizStep(0);setQuizScores({clean:0,soft:0,corporate:0,wellness:0,luxury:0});setQuizKey(0);setScreen("quiz");}}
            style={{width:"100%",marginTop:"14px",padding:"12px",background:"transparent",border:`1px solid ${T.border}`,color:T.muted,fontSize:"11px",letterSpacing:"3px",borderRadius:"10px"}}>
            RETAKE AESTHETIC QUIZ
          </button>
        </div>}

        {view==="wall"&&<div>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"14px 16px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted}}>BE HER DAILY</p>
              <p style={{fontSize:"20px",fontWeight:"400",color:T.text}}>The Circle</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 12px",background:`${gold}18`,border:`1px solid ${gold}44`,borderRadius:"20px"}}>
              <span style={{color:gold,fontSize:"11px"}}>✦</span>
              <span style={{fontSize:"11px",color:gold}}>Community</span>
            </div>
          </div>

          <div style={{background:T.card,border:`2px solid ${gold}`,borderRadius:"14px",padding:"18px",marginBottom:"14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
              <span style={{fontSize:"14px",color:gold}}>✦</span>
              <p style={{fontSize:"10px",letterSpacing:"4px",color:gold}}>TODAY'S CIRCLE CHALLENGE</p>
            </div>
            {challengeLoading?(
              <p style={{fontSize:"14px",color:T.dim,fontStyle:"italic"}}>Generating today's challenge...</p>
            ):dailyChallenge?(
              <div>
                <p style={{fontSize:"17px",color:T.text,fontStyle:"italic",lineHeight:1.6,marginBottom:"14px"}}>"{dailyChallenge.prompt}"</p>
                {!challengeSubmitted?(
                  <div style={{display:"flex",gap:"8px"}}>
                    <input value={challengeResponse} onChange={e=>setChallengeResponse(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submitChallengeResponse()}
                      placeholder="Share your response with the circle..."
                      style={{flex:1,padding:"11px 14px",background:T.bg,border:`1px solid ${T.border}`,color:T.text,fontSize:"14px",borderRadius:"8px 0 0 8px",outline:"none",fontStyle:"italic"}}/>
                    <button onClick={submitChallengeResponse} style={{padding:"11px 16px",background:gold,border:"none",color:"#fff",fontSize:"14px",borderRadius:"0 8px 8px 0",fontWeight:"600"}}>→</button>
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 14px",background:`${gold}18`,borderRadius:"8px"}}>
                    <span style={{color:gold}}>✦</span>
                    <p style={{fontSize:"13px",color:gold,fontStyle:"italic"}}>You responded to today's challenge.</p>
                  </div>
                )}
              </div>
            ):null}
          </div>

          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"14px",padding:"16px",marginBottom:"14px"}}>
            <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
              <Avatar icon={aesObj?.icon||"o"} color={gold} size={40}/>
              {!composerOpen?(
                <button onClick={()=>setComposerOpen(true)}
                  style={{flex:1,padding:"12px 18px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:"24px",textAlign:"left",color:T.dim,fontSize:"15px",fontStyle:"italic"}}>
                  What is on your mind, sis?
                </button>
              ):<p style={{fontSize:"13px",color:gold,letterSpacing:"1px"}}>NEW POST</p>}
            </div>
            {composerOpen&&<div className="fi" style={{marginTop:"14px"}}>
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
                {POST_TYPES.map(pt=>(
                  <button key={pt.id} onClick={()=>setPostType(postType===pt.id?null:pt.id)}
                    style={{padding:"6px 12px",background:postType===pt.id?`${pt.color}22`:T.bg,border:`1px solid ${postType===pt.id?pt.color:T.border}`,borderRadius:"20px",fontSize:"12px",color:postType===pt.id?pt.color:T.muted}}>
                    {pt.label}
                  </button>
                ))}
              </div>
              <textarea value={postContent} onChange={e=>setPostContent(e.target.value)} placeholder="Share your thoughts..." rows={3}
                style={{width:"100%",padding:"12px 14px",background:T.bg,border:`1px solid ${T.border}`,color:T.text,fontSize:"15px",borderRadius:"10px",outline:"none",fontStyle:"italic",lineHeight:1.6,marginBottom:"10px"}}/>
              {postImagePreview&&<div style={{position:"relative",marginBottom:"10px"}}>
                <img src={postImagePreview} alt="preview" style={{width:"100%",borderRadius:"8px",maxHeight:"200px",objectFit:"cover"}}/>
                <button onClick={()=>{setPostImage(null);setPostImagePreview(null);}} style={{position:"absolute",top:"8px",right:"8px",background:"rgba(240,232,216,0.9)",border:"none",color:T.text,width:"28px",height:"28px",borderRadius:"50%",fontSize:"16px"}}>×</button>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 12px",background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"12px",color:T.muted,cursor:"pointer"}}>
                  📷 Photo <input type="file" accept="image/*" onChange={handleImageSelect} style={{display:"none"}}/>
                </label>
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={()=>{setComposerOpen(false);setPostType(null);setPostContent("");setPostImage(null);setPostImagePreview(null);}}
                    style={{padding:"9px 16px",background:"none",border:`1px solid ${T.border}`,borderRadius:"8px",fontSize:"12px",color:T.muted}}>Cancel</button>
                  <button onClick={submitPost} disabled={uploadingImage||(!postContent.trim()&&!postImage)}
                    style={{padding:"9px 20px",background:gold,border:"none",borderRadius:"8px",fontSize:"12px",color:"#fff",fontWeight:"600",opacity:(!postContent.trim()&&!postImage)?0.5:1}}>
                    {uploadingImage?"POSTING...":"POST"}
                  </button>
                </div>
              </div>
            </div>}
            {!composerOpen&&<div style={{display:"flex",gap:"6px",justifyContent:"space-around",paddingTop:"12px",borderTop:`1px solid ${T.border}`,marginTop:"12px"}}>
              {POST_TYPES.map(pt=>(
                <button key={pt.id} onClick={()=>setComposerOpen(true)}
                  style={{flex:1,padding:"6px 2px",background:"none",border:"none",color:T.muted,fontSize:"13px",textAlign:"center"}}>{pt.label.split(" ")[0]}</button>
              ))}
            </div>}
          </div>

          <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,marginBottom:"14px"}}>
            {[["feed","ALL POSTS"],["activity","LIVE ACTIVITY"]].map(([tab,label])=>(
              <button key={tab} onClick={()=>setWallTab(tab)}
                style={{flex:1,padding:"10px",background:"none",border:"none",borderBottom:wallTab===tab?`2px solid ${gold}`:"2px solid transparent",color:wallTab===tab?gold:T.muted,fontSize:"11px",letterSpacing:"2px",marginBottom:"-1px"}}>
                {label}
              </button>
            ))}
          </div>

          {wallTab==="activity"&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {activityFeed.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:T.dim,fontSize:"15px",fontStyle:"italic"}}>No activity yet today. Be the first to check in!</div>
            ):activityFeed.map((item,i)=>{
              const itemAes=item.aesthetic?AESTHETICS[item.aesthetic]:null;
              return (
                <div key={i} className="fi" style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",background:T.card,border:`1px solid ${T.border}`,borderRadius:"10px"}}>
                  <Avatar icon={itemAes?.icon||"✦"} color={itemAes?.color||gold} size={36}/>
                  <p style={{fontSize:"14px",color:T.text,lineHeight:1.4,flex:1}}>
                    <span style={{color:gold,fontWeight:"500"}}>@{item.display_name}</span>
                    {item.type==="checkin"&&<span style={{color:T.muted,fontStyle:"italic"}}> checked off "{item.goal_text}"{item.streak>1&&<span style={{color:T.dim}}> · {item.streak}d</span>}</span>}
                    {item.type==="joined"&&<span style={{color:T.muted,fontStyle:"italic"}}> just joined the circle ✦</span>}
                    {item.type==="post"&&<span style={{color:T.muted,fontStyle:"italic"}}> posted: "{(item.content||"").substring(0,50)}{(item.content||"").length>50?"...":""}"</span>}
                  </p>
                </div>
              );
            })}
          </div>}

          {wallTab==="feed"&&<div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            {posts.length===0?(
              <div style={{textAlign:"center",padding:"40px 0",color:T.dim,fontSize:"15px",fontStyle:"italic"}}>Be the first to share with the circle.</div>
            ):posts.map(post=>{
              const postAes=post.aesthetic?AESTHETICS[post.aesthetic]:null;
              const ptObj=POST_TYPES.find(pt=>pt.id===post.post_type);
              const postReactions=reactions[post.id]||[];
              const totalR=postReactions.length;
              const reactionCounts={};
              postReactions.forEach(r=>{reactionCounts[r.emoji]=(reactionCounts[r.emoji]||0)+1;});
              const myReacted=new Set(postReactions.filter(r=>r.user_id===user?.id).map(r=>r.emoji));
              const commentsOpen=expandedComments[post.id];
              const postReplies=replies[post.id]||[];
              return (
                <div key={post.id} className="fi" style={{background:T.card,border:`1px solid ${post.is_challenge?gold:T.border}`,borderRadius:"16px",overflow:"hidden"}}>
                  {post.is_challenge&&<div style={{padding:"7px 16px",background:`${gold}18`,borderBottom:`1px solid ${gold}33`}}>
                    <p style={{fontSize:"10px",letterSpacing:"3px",color:gold}}>✦ CHALLENGE RESPONSE</p>
                  </div>}
                  <div style={{padding:"16px 16px 0"}}>
                    <div style={{display:"flex",gap:"12px",alignItems:"flex-start",marginBottom:"12px"}}>
                      <Avatar icon={postAes?.icon||"✦"} color={postAes?.color||gold} size={46}/>
                      <div style={{flex:1}}>
                        <p style={{fontSize:"16px",fontWeight:"500",color:T.text,marginBottom:"3px"}}>@{post.display_name}</p>
                        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                          {ptObj&&<span style={{fontSize:"11px",padding:"3px 9px",background:`${ptObj.color}18`,border:`1px solid ${ptObj.color}44`,borderRadius:"12px",color:ptObj.color}}>{ptObj.label}</span>}
                          <span style={{fontSize:"11px",color:T.dim}}>{fmtDate(post.date||post.created_at)}</span>
                          {post.streak>1&&<span style={{fontSize:"11px",color:T.dim}}>{post.streak}d streak</span>}
                        </div>
                      </div>
                    </div>
                    {post.content&&<p style={{fontSize:"16px",lineHeight:1.75,color:T.text,marginBottom:"14px"}}>{post.content}</p>}
                    {post.image_url&&<img src={post.image_url} alt="post" style={{width:"100%",borderRadius:"8px",maxHeight:"280px",objectFit:"cover",marginBottom:"14px"}}/>}
                    {totalR>0&&<div style={{display:"flex",justifyContent:"space-between",paddingBottom:"10px",borderBottom:`1px solid ${T.border}`,marginBottom:"8px"}}>
                      <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
                        {[...new Set(postReactions.map(r=>r.emoji))].slice(0,4).map(e=><span key={e} style={{fontSize:"14px"}}>{e}</span>)}
                        <span style={{fontSize:"12px",color:T.muted,marginLeft:"4px"}}>{totalR}</span>
                      </div>
                      <button onClick={()=>{if(!commentsOpen){setExpandedComments(p=>({...p,[post.id]:true}));loadReplies(post.id);}}} style={{background:"none",border:"none",fontSize:"12px",color:T.muted,cursor:"pointer"}}>
                        {postReplies.length} comment{postReplies.length!==1?"s":""}
                      </button>
                    </div>}
                    <div style={{display:"flex",gap:"6px",paddingBottom:"12px"}}>
                      {EMOJIS.map(emoji=>{
                        const count=reactionCounts[emoji]||0;
                        const mine=myReacted.has(emoji);
                        return (
                          <button key={emoji} onClick={()=>toggleReaction(post.id,emoji)}
                            style={{flex:1,padding:"8px 4px",background:mine?`${gold}18`:"transparent",border:`1px solid ${mine?gold:T.border}`,borderRadius:"10px",fontSize:"16px",display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
                            {emoji}
                            {count>0&&<span style={{fontSize:"10px",color:mine?gold:T.dim}}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{borderTop:`1px solid ${T.border}`}}>
                    <button onClick={()=>{
                      const opening=!commentsOpen;
                      setExpandedComments(p=>({...p,[post.id]:opening}));
                      if(opening&&!replies[post.id]) loadReplies(post.id);
                    }} style={{width:"100%",padding:"10px 16px",background:"none",border:"none",color:T.muted,fontSize:"12px",letterSpacing:"1px",textAlign:"left"}}>
                      {commentsOpen?"▲ Hide comments":`▼ ${postReplies.length||"View"} comment${postReplies.length!==1?"s":""}`}
                    </button>
                    {commentsOpen&&<div style={{padding:"4px 16px 16px"}}>
                      {postReplies.map((c,i)=>{
                        const cAes=c.aesthetic?AESTHETICS[c.aesthetic]:null;
                        return (
                          <div key={c.id||i} style={{display:"flex",gap:"10px",marginBottom:"10px"}}>
                            <Avatar icon={cAes?.icon||"o"} color={cAes?.color||T.muted} size={32}/>
                            <div style={{flex:1,background:T.bg,borderRadius:"12px",padding:"10px 14px"}}>
                              <p style={{fontSize:"12px",color:gold,marginBottom:"3px",fontWeight:"500"}}>@{c.display_name}</p>
                              <p style={{fontSize:"14px",color:T.text,lineHeight:1.5}}>{c.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{display:"flex",gap:"10px",alignItems:"center",marginTop:"6px"}}>
                        <Avatar icon={aesObj?.icon||"o"} color={gold} size={32}/>
                        <div style={{flex:1,display:"flex"}}>
                          <input value={replyTexts[post.id]||""} onChange={e=>setReplyTexts(p=>({...p,[post.id]:e.target.value}))}
                            onKeyDown={e=>e.key==="Enter"&&submitReply(post.id)}
                            placeholder="Add a comment..."
                            style={{flex:1,padding:"10px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRight:"none",color:T.text,fontSize:"14px",borderRadius:"24px 0 0 24px",outline:"none",fontStyle:"italic"}}/>
                          <button onClick={()=>submitReply(post.id)} style={{padding:"10px 14px",background:gold,border:"none",color:"#fff",fontSize:"14px",borderRadius:"0 24px 24px 0"}}>→</button>
                        </div>
                      </div>
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>}

        {!dataLoading&&view==="cycle"&&<div>
          {!cycleSaved?(
            <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:"14px",padding:"24px",marginBottom:"14px"}}>
              <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted,marginBottom:"8px"}}>YOUR CYCLE</p>
              <p style={{fontSize:"15px",color:T.muted,fontStyle:"italic",lineHeight:1.6,marginBottom:"20px"}}>Enter the first day of your last period and we will tell you exactly what your body needs right now.</p>
              <input type="date" value={cycleInput} onChange={e=>setCycleInput(e.target.value)}
                style={{width:"100%",padding:"13px 16px",background:T.bg,border:"1px solid "+T.border,color:T.text,fontSize:"16px",borderRadius:"8px",outline:"none",marginBottom:"12px"}}/>
              <button onClick={saveCycleDate} style={{width:"100%",padding:"14px",background:T.gold,border:"none",color:"#fff",fontSize:"11px",letterSpacing:"4px",fontWeight:"600",borderRadius:"8px"}}>
                REVEAL MY PHASE
              </button>
            </div>
          ):(()=>{
            const phase=getCyclePhase(cycleStartDate);
            const start=new Date(cycleStartDate), now=new Date();
            const diff=Math.floor((now-start)/(1000*60*60*24));
            const dayInCycle=(diff%28)+1, daysUntilNext=28-dayInCycle+1;
            return (
              <div>
                <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:"14px",padding:"24px",marginBottom:"14px",textAlign:"center"}}>
                  <p style={{fontSize:"13px",letterSpacing:"3px",color:phase.color,marginBottom:"6px"}}>{phase.icon}</p>
                  <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted,marginBottom:"6px"}}>{phase.days} - Day {phase.day}</p>
                  <h2 style={{fontSize:"28px",fontWeight:"400",color:phase.color,marginBottom:"6px",letterSpacing:"1px"}}>{phase.phase} Phase</h2>
                  <div style={{width:"36px",height:"1px",background:phase.color,margin:"12px auto"}}/>
                  <div style={{background:`${T.gold}11`,border:`1px solid ${T.gold}33`,borderRadius:"10px",padding:"14px 18px",marginBottom:"16px"}}>
                    <p style={{fontSize:"10px",letterSpacing:"3px",color:T.gold,marginBottom:"4px"}}>NEXT PERIOD IN</p>
                    <p style={{fontSize:"32px",fontWeight:"300",color:T.gold,letterSpacing:"2px",lineHeight:1}}>{daysUntilNext} {daysUntilNext===1?"day":"days"}</p>
                  </div>
                  <p style={{fontSize:"15px",lineHeight:1.8,color:T.muted,fontStyle:"italic"}}>{phase.body}</p>
                </div>
                <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:"14px",padding:"20px",marginBottom:"14px"}}>
                  {[["ENERGY",phase.energy],["MOVEMENT",phase.workout],["NOURISHMENT",phase.foods],["BHD SAYS",`"${phase.affirmation}"`]].map(([label,val],i)=>(
                    <div key={label} style={{borderTop:i>0?"1px solid "+T.border:"none",paddingTop:i>0?"16px":"0",marginTop:i>0?"16px":"0"}}>
                      <p style={{fontSize:"10px",letterSpacing:"3px",color:phase.color,marginBottom:"6px"}}>{label}</p>
                      <p style={{fontSize:"15px",color:T.text,fontStyle:"italic",lineHeight:1.5}}>{val}</p>
                    </div>
                  ))}
                </div>
                <button onClick={()=>{setCycleSaved(false);setCycleInput("");}}
                  style={{width:"100%",padding:"12px",background:"transparent",border:"1px solid "+T.border,color:T.muted,fontSize:"11px",letterSpacing:"3px",borderRadius:"10px"}}>
                  UPDATE CYCLE DATE
                </button>
              </div>
            );
          })()}
        </div>}

        {!dataLoading&&view==="vision"&&<div>
          <p style={{fontSize:"10px",letterSpacing:"4px",color:T.muted,marginBottom:"6px"}}>YOUR VISION BOARD</p>
          <p style={{fontSize:"13px",color:T.dim,fontStyle:"italic",marginBottom:"16px",lineHeight:1.5}}>Your private space. Add images of what you are building toward.</p>
          <div style={{background:T.card,border:"1px solid "+T.border,borderRadius:"14px",padding:"16px",marginBottom:"16px"}}>
            {visionImagePreview?(
              <div style={{position:"relative",marginBottom:"12px"}}>
                <img src={visionImagePreview} style={{width:"100%",borderRadius:"10px",maxHeight:"240px",objectFit:"cover"}}/>
                <button onClick={()=>{setVisionImage(null);setVisionImagePreview(null);}}
                  style={{position:"absolute",top:"8px",right:"8px",background:"rgba(240,232,216,0.9)",border:"none",color:T.text,width:"28px",height:"28px",borderRadius:"50%",fontSize:"16px"}}>×</button>
              </div>
            ):(
              <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px",background:T.bg,border:"2px dashed "+T.border,borderRadius:"10px",cursor:"pointer",marginBottom:"12px"}}>
                <p style={{fontSize:"24px",color:T.dim,marginBottom:"8px"}}>◉</p>
                <p style={{fontSize:"12px",letterSpacing:"2px",color:T.muted}}>TAP TO ADD IMAGE</p>
                <input type="file" accept="image/*" onChange={handleVisionImageSelect} style={{display:"none"}}/>
              </label>
            )}
            <input value={visionCaption} onChange={e=>setVisionCaption(e.target.value)} placeholder="Add a caption... (optional)"
              style={{width:"100%",padding:"11px 14px",background:T.bg,border:"1px solid "+T.border,color:T.text,fontSize:"14px",borderRadius:"8px",outline:"none",fontStyle:"italic",marginBottom:"10px"}}/>
            <button onClick={submitVisionPost} disabled={!visionImage||uploadingVision}
              style={{width:"100%",padding:"13px",background:visionImage?(aesObj?aesObj.color:T.gold):T.accent,border:"none",color:"#fff",fontSize:"11px",letterSpacing:"4px",fontWeight:"600",borderRadius:"8px",opacity:!visionImage?0.5:1}}>
              {uploadingVision?"ADDING TO YOUR BOARD...":"ADD TO VISION BOARD"}
            </button>
          </div>
          {visionPosts.length===0?(
            <div style={{textAlign:"center",padding:"40px 0",color:T.dim}}>
              <p style={{fontSize:"32px",marginBottom:"12px",color:aesObj?aesObj.color:T.gold,opacity:0.4}}>◉</p>
              <p style={{fontSize:"15px",fontStyle:"italic",lineHeight:1.8,color:T.muted}}>Your vision board is empty.<br/>Start adding images of what you are building.</p>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
              {visionPosts.map(post=>(
                <div key={post.id} style={{position:"relative",borderRadius:"10px",overflow:"hidden"}}>
                  <img src={post.image_url} style={{width:"100%",height:"160px",objectFit:"cover",display:"block"}}/>
                  {post.caption&&<div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent, rgba(42,34,24,0.85))",padding:"20px 10px 8px"}}>
                    <p style={{fontSize:"12px",color:"#fff",fontStyle:"italic"}}>{post.caption}</p>
                  </div>}
                  <button onClick={()=>deleteVisionPost(post.id)}
                    style={{position:"absolute",top:"6px",right:"6px",background:"rgba(240,232,216,0.85)",border:"none",color:T.text,width:"24px",height:"24px",borderRadius:"50%",fontSize:"12px",cursor:"pointer"}}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:T.card,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",padding:"10px 0 20px",zIndex:50}}>
        {[{v:"today",icon:"◈",label:"HOME"},{v:"goals",icon:"✶",label:"GOALS"},{v:"wall",icon:"◎",label:"CIRCLE"},{v:"cycle",icon:"☽",label:"CYCLE"},{v:"vision",icon:"◉",label:"VISION"}].map(({v,icon,label})=>(
          <button key={v} onClick={()=>{setView(v);if(v==="wall")loadWall();if(v==="vision")loadVisionBoard();}}
            style={{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",opacity:view===v?1:0.4}}>
            <span style={{fontSize:"20px",color:view===v?gold:T.muted}}>{icon}</span>
            <span style={{fontSize:"9px",letterSpacing:"2px",color:view===v?gold:T.muted}}>{label}</span>
          </button>
        ))}
      </div>

      {celebrating&&<div className="fi" style={{position:"fixed",inset:0,background:"rgba(245,240,232,0.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:100}}>
        <p style={{fontSize:"52px",marginBottom:"16px",color:gold}}>{aesObj?.icon||"✦"}</p>
        <p style={{fontSize:"28px",fontWeight:"300",color:T.text,letterSpacing:"2px",marginBottom:"10px"}}>Fully Aligned.</p>
        <p style={{fontSize:"12px",letterSpacing:"4px",color:gold}}>THE WOMAN YOU ARE BECOMING IS PROUD.</p>
      </div>}
    </div>
  );
}
