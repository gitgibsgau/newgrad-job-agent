"use client";
import { useState, useRef, useEffect } from "react";

const PIPELINE_STAGES = [
  { id: "interested", label: "💡 Interested", color: "#7eb8ff" },
  { id: "applied",    label: "📤 Applied",    color: "#f0c060" },
  { id: "interview",  label: "🎯 Interview",  color: "#63d9b4" },
  { id: "offer",      label: "🎉 Offer",      color: "#c080ff" },
];

const jKey = (job) => `${job.company}||${job.role}`;

const fitColor = (score) => {
  if (score == null) return null;
  if (score >= 80) return "#63d9b4";
  if (score >= 60) return "#f0c060";
  return "#ff8080";
};

// ─── Agent Logs ───────────────────────────────────────────────────────────────
const AgentLog = ({ logs }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    {logs.map((log, i) => (
      <div key={i} style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "8px 12px", borderRadius: "8px",
        background: log.type === "tool" ? "rgba(99,217,180,0.08)" : log.type === "error" ? "rgba(255,100,100,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${log.type === "tool" ? "rgba(99,217,180,0.2)" : log.type === "error" ? "rgba(255,100,100,0.2)" : "rgba(255,255,255,0.08)"}`,
        fontSize: "12px", fontFamily: "'DM Mono', monospace",
      }}>
        <span style={{ fontSize: "14px", flexShrink: 0 }}>
          {log.type === "tool" ? "🔍" : log.type === "error" ? "⚠️" : log.type === "agent" ? "🤖" : "📋"}
        </span>
        <span style={{ color: log.type === "tool" ? "#63d9b4" : log.type === "error" ? "#ff8080" : "#a0b0c0", lineHeight: 1.5 }}>
          {log.message}
        </span>
      </div>
    ))}
  </div>
);

// ─── Inline AI Action Result ──────────────────────────────────────────────────
const ActionPanel = ({ action, loading, content }) => {
  const [copied, setCopied] = useState(false);
  const labels = { "cold-dm": "✉️ Cold DM", "cover-letter": "📄 Cover Letter", "interview-prep": "🎤 Interview Prep" };
  return (
    <div style={{ marginTop: "12px", padding: "14px 16px", background: "rgba(99,217,180,0.05)", border: "1px solid rgba(99,217,180,0.18)", borderRadius: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#63d9b4", textTransform: "uppercase", letterSpacing: "0.08em" }}>{labels[action]}</span>
        {!loading && content && (
          <button
            onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: "none", border: "none", color: copied ? "#63d9b4" : "#5a7a9a", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >{copied ? "✓ Copied" : "Copy"}</button>
        )}
      </div>
      {loading ? (
        <div style={{ display: "flex", gap: "4px", padding: "4px 0" }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#63d9b4", animation: `pulse 1.2s ${i*0.2}s infinite` }} />)}
        </div>
      ) : (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "12.5px", lineHeight: 1.7, color: "#c0d8f0", fontFamily: "'DM Sans', sans-serif" }}>{content}</pre>
      )}
    </div>
  );
};

// ─── Job Card ─────────────────────────────────────────────────────────────────
const JobCard = ({ job, index = 0, isSaved, onToggleSave, pipelineStage, onAddToPipeline, userProfile }) => {
  const [activeAction, setActiveAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionContent, setActionContent] = useState("");

  const runAction = async (action) => {
    if (activeAction === action && !actionLoading) { setActiveAction(null); return; }
    setActiveAction(action); setActionLoading(true); setActionContent("");
    try {
      const res = await fetch("/api/job-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, action, userProfile }),
      });
      const data = await res.json();
      setActionContent(data.content || "");
    } catch {
      setActionContent("Error generating content. Please try again.");
    }
    setActionLoading(false);
  };

  const score = job.fitScore;
  const color = fitColor(score);
  const pipelineLabel = PIPELINE_STAGES.find(s => s.id === pipelineStage)?.label;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: isSaved ? "1px solid rgba(255,120,120,0.3)" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px", padding: "16px 20px",
      animation: `fadeSlideIn 0.4s ease ${index * 0.06}s both`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "15px", color: "#f0f4ff" }}>{job.company}</div>
          <div style={{ fontSize: "13px", color: "#63d9b4", fontWeight: 500, marginTop: "2px" }}>{job.role}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, marginLeft: "12px" }}>
          {color && (
            <div title={job.fitReason || ""} style={{
              background: `${color}15`, border: `1px solid ${color}35`, borderRadius: "20px",
              padding: "3px 10px", fontSize: "11px", fontWeight: 700, color,
              fontFamily: "'DM Mono', monospace", cursor: "default", whiteSpace: "nowrap"
            }}>{score}% fit</div>
          )}
          <button
            onClick={onToggleSave} title={isSaved ? "Remove from saved" : "Save job"}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "17px", padding: "2px 4px", lineHeight: 1, transition: "transform 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >{isSaved ? "❤️" : "🤍"}</button>
          {job.link && job.link !== "#" && (
            <a href={job.link} target="_blank" rel="noopener noreferrer" style={{
              fontSize: "11px", color: "#7eb8ff", textDecoration: "none",
              background: "rgba(126,184,255,0.1)", padding: "4px 10px",
              borderRadius: "20px", border: "1px solid rgba(126,184,255,0.2)", whiteSpace: "nowrap"
            }}>View →</a>
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#7a8a9a", marginBottom: "10px", flexWrap: "wrap" }}>
        <span>📍 {job.location}</span>
        {job.posted && <span>🕐 {job.posted}</span>}
        {job.level && <span style={{ color: "#a0b8d0" }}>🎯 {job.level}</span>}
      </div>

      {/* Fit reason */}
      {job.fitReason && (
        <div style={{
          fontSize: "12px", color: color || "#8a9ab0",
          background: `${color || "#8a9ab0"}10`, padding: "7px 10px",
          borderRadius: "7px", marginBottom: "12px", lineHeight: 1.5
        }}>{job.fitReason}</div>
      )}

      {/* Summary (only when no fit reason) */}
      {job.summary && !job.fitReason && (
        <div style={{ fontSize: "12px", color: "#8a9ab0", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px", marginBottom: "10px" }}>
          {job.summary}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
        {[
          { id: "cold-dm",       label: "✉️ Cold DM" },
          { id: "cover-letter",  label: "📄 Cover Letter" },
          { id: "interview-prep",label: "🎤 Interview Prep" },
        ].map(a => (
          <button key={a.id} onClick={() => runAction(a.id)} style={{
            background: activeAction === a.id ? "rgba(99,217,180,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${activeAction === a.id ? "rgba(99,217,180,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "20px", padding: "5px 12px", fontSize: "11px",
            color: activeAction === a.id ? "#63d9b4" : "#8a9ab0",
            cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
          }}>{a.label}</button>
        ))}
        <button onClick={() => onAddToPipeline(job)} style={{
          background: pipelineStage ? "rgba(126,184,255,0.1)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${pipelineStage ? "rgba(126,184,255,0.3)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: "20px", padding: "5px 12px", fontSize: "11px",
          color: pipelineStage ? "#7eb8ff" : "#8a9ab0",
          cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif", marginLeft: "auto",
        }}>
          {pipelineStage ? `📌 ${pipelineLabel}` : "+ Pipeline"}
        </button>
      </div>

      {activeAction && (
        <ActionPanel action={activeAction} loading={actionLoading} content={actionContent} />
      )}
    </div>
  );
};

// ─── Pipeline Kanban ──────────────────────────────────────────────────────────
const PipelineBoard = ({ pipeline, onMoveStage, onRemove }) => {
  const entries = Object.values(pipeline);

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a5a7a" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: "#4a6a8a" }}>Pipeline Empty</div>
        <div style={{ fontSize: "13px" }}>Click "+ Pipeline" on any job card to start tracking your applications</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", alignItems: "start" }}>
      {PIPELINE_STAGES.map((stage, si) => {
        const stageEntries = entries.filter(e => e.stage === stage.id);
        return (
          <div key={stage.id} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px", padding: "14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "12px", color: stage.color }}>{stage.label}</span>
              <span style={{ fontSize: "11px", color: "#3a5a7a", background: "rgba(255,255,255,0.05)", borderRadius: "10px", padding: "2px 8px" }}>{stageEntries.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {stageEntries.map(({ job }, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${stage.color}22`,
                  borderRadius: "10px", padding: "12px",
                }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "12px", color: "#f0f4ff", marginBottom: "2px", lineHeight: 1.3 }}>{job.company}</div>
                  <div style={{ fontSize: "11px", color: "#63d9b4", marginBottom: "4px" }}>{job.role}</div>
                  <div style={{ fontSize: "10px", color: "#4a6a8a", marginBottom: "10px" }}>📍 {job.location}</div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      onClick={() => si > 0 && onMoveStage(job, PIPELINE_STAGES[si - 1].id)}
                      disabled={si === 0}
                      title="Move back"
                      style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "4px", fontSize: "13px", color: si === 0 ? "#1a2a3a" : "#6a8aa0", cursor: si === 0 ? "default" : "pointer" }}
                    >←</button>
                    <button
                      onClick={() => si < PIPELINE_STAGES.length - 1 && onMoveStage(job, PIPELINE_STAGES[si + 1].id)}
                      disabled={si === PIPELINE_STAGES.length - 1}
                      title="Move forward"
                      style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "4px", fontSize: "13px", color: si === PIPELINE_STAGES.length - 1 ? "#1a2a3a" : "#6a8aa0", cursor: si === PIPELINE_STAGES.length - 1 ? "default" : "pointer" }}
                    >→</button>
                    <button
                      onClick={() => onRemove(job)}
                      title="Remove from pipeline"
                      style={{ background: "rgba(255,80,80,0.06)", border: "1px solid rgba(255,80,80,0.15)", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", color: "#ff7070", cursor: "pointer" }}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Post Display ─────────────────────────────────────────────────────────────
const PostDisplay = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(99,217,180,0.06), rgba(126,184,255,0.06))",
      border: "1px solid rgba(99,217,180,0.25)", borderRadius: "14px", padding: "20px 22px",
      animation: "fadeSlideIn 0.5s ease both"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "13px", color: "#63d9b4", letterSpacing: "0.08em", textTransform: "uppercase" }}>✨ Suggested LinkedIn Post</span>
        <button onClick={copy} style={{
          background: copied ? "rgba(99,217,180,0.2)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)", color: copied ? "#63d9b4" : "#a0b0c0",
          padding: "5px 14px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s"
        }}>{copied ? "✓ Copied!" : "Copy"}</button>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "13.5px", lineHeight: 1.75, color: "#d8e8f0", fontFamily: "'DM Sans', sans-serif" }}>{text}</pre>
    </div>
  );
};

// ─── City Filter Bar ──────────────────────────────────────────────────────────
const CityFilter = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
    <div style={{ position: "relative", flex: 1 }}>
      <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#5a7a9a" }}>📍</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Filter by city (e.g. San Francisco, Austin)..."
        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 12px 8px 30px", color: "#d0e0f0", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
      />
    </div>
    {value && (
      <button onClick={() => onChange("")} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a0b0c0", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
        Clear
      </button>
    )}
  </div>
);

// ─── Main Agent ───────────────────────────────────────────────────────────────
export default function Agent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [pipeline, setPipeline] = useState({}); // { jKey: { stage, job } }
  const [cityFilter, setCityFilter] = useState("");
  const [suggestedPost, setSuggestedPost] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [userProfile, setUserProfile] = useState({ name: "", field: "", skills: "", experience: "" });
  const bottomRef = useRef(null);

  // Load persisted state
  useEffect(() => {
    try { setSavedJobs(JSON.parse(localStorage.getItem("savedJobs") || "[]")); } catch {}
    try { setPipeline(JSON.parse(localStorage.getItem("pipeline") || "{}")); } catch {}
  }, []);

  useEffect(() => { localStorage.setItem("savedJobs", JSON.stringify(savedJobs)); }, [savedJobs]);
  useEffect(() => { localStorage.setItem("pipeline", JSON.stringify(pipeline)); }, [pipeline]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, agentLogs]);

  const addLog = (type, message) => setAgentLogs(prev => [...prev, { type, message }]);

  // ── Saved jobs ──
  const isJobSaved = (job) => savedJobs.some(j => jKey(j) === jKey(job));
  const toggleSaveJob = (job) => {
    setSavedJobs(prev =>
      isJobSaved(job) ? prev.filter(j => jKey(j) !== jKey(job)) : [...prev, job]
    );
  };

  // ── Pipeline ──
  const getPipelineStage = (job) => pipeline[jKey(job)]?.stage ?? null;

  const addToPipeline = (job) => {
    const key = jKey(job);
    if (pipeline[key]) {
      setPipeline(prev => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      setPipeline(prev => ({ ...prev, [key]: { stage: "interested", job } }));
      setActiveTab("pipeline");
    }
  };

  const movePipelineStage = (job, stage) => {
    const key = jKey(job);
    setPipeline(prev => ({ ...prev, [key]: { ...prev[key], stage } }));
  };

  const removeFromPipeline = (job) => {
    setPipeline(prev => { const n = { ...prev }; delete n[jKey(job)]; return n; });
  };

  // ── Filtering ──
  const filterByCity = (list) =>
    cityFilter.trim()
      ? list.filter(j => j.location?.toLowerCase().includes(cityFilter.toLowerCase()))
      : list;

  // ── Agent call ──
  const runAgent = async (userMessage) => {
    setLoading(true);
    setAgentLogs([]);
    addLog("agent", `Starting agent: "${userMessage}"`);
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    try {
      addLog("tool", "Calling agent with web search...");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userProfile }),
      });
      const data = await res.json();
      if (data.error) { addLog("error", data.error); setLoading(false); return; }

      addLog("agent", "Agent completed. Parsing results...");
      const fullText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");

      const jobsMatch = fullText.match(/<jobs>([\s\S]*?)<\/jobs>/);
      if (jobsMatch) {
        try {
          const parsed = JSON.parse(jobsMatch[1].trim());
          setJobs(parsed);
          addLog("📋", `Found ${parsed.length} job postings`);
          setActiveTab("jobs");
        } catch {}
      }

      const postMatch = fullText.match(/<post>([\s\S]*?)<\/post>/);
      if (postMatch) { setSuggestedPost(postMatch[1].trim()); addLog("📋", "LinkedIn post generated"); setActiveTab("post"); }

      const cleanText = fullText
        .replace(/<jobs>[\s\S]*?<\/jobs>/g, jobsMatch ? "✅ Found job listings — check the **Jobs** tab!" : "")
        .replace(/<post>[\s\S]*?<\/post>/g, postMatch ? "✅ Post generated — check the **Post** tab!" : "")
        .trim();

      setMessages(prev => [...prev, { role: "assistant", content: cleanText || "Done! Check the tabs above." }]);
    } catch (err) {
      addLog("error", err.message);
      setMessages(prev => [...prev, { role: "assistant", content: "Error. Please try again." }]);
    }
    setLoading(false);
  };

  const handleSend = () => { if (!input.trim() || loading) return; const msg = input.trim(); setInput(""); runAgent(msg); };

  const quickActions = [
    { label: "🤖 AI / ML Jobs",              msg: "Search LinkedIn for AI engineer, machine learning engineer, and ML researcher job postings across the US in 2025 at all experience levels." },
    { label: "💻 Software Engineer Jobs",     msg: "Search LinkedIn for software engineer job postings across the US in 2025 at all experience levels." },
    { label: "📊 Data Science & Analytics",   msg: "Search LinkedIn for data scientist, data analyst, and analytics engineer positions across the US in 2025." },
    { label: "🎨 Product & Design Jobs",      msg: "Search LinkedIn for product manager and UX/product designer positions across the US in 2025." },
    { label: "💼 Finance & Banking Jobs",     msg: "Search LinkedIn for finance analyst, investment banking, and financial analyst positions across major US financial hubs in 2025." },
    { label: "☁️ DevOps & Cloud Jobs",        msg: "Search LinkedIn for DevOps engineer, cloud engineer, and platform engineer positions across the US in 2025." },
  ];

  const profileFields = [
    { key: "name",       placeholder: "Your name (e.g. Alex Chen)" },
    { key: "field",      placeholder: "Field / Role (e.g. AI, SWE, Design, Finance)" },
    { key: "skills",     placeholder: "Top skills (e.g. Python, React)" },
    { key: "experience", placeholder: "Experience level (e.g. Entry-Level, 3 yrs)" },
  ];

  const pipelineCount = Object.keys(pipeline).length;

  const tabs = [
    { id: "chat",     label: "💬 Chat" },
    { id: "jobs",     label: `🗂 Jobs${jobs.length > 0 ? ` (${jobs.length})` : ""}` },
    { id: "saved",    label: `❤️ Saved${savedJobs.length > 0 ? ` (${savedJobs.length})` : ""}` },
    { id: "pipeline", label: `📋 Pipeline${pipelineCount > 0 ? ` (${pipelineCount})` : ""}` },
    { id: "post",     label: "✍️ Post" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius:4px; }
        textarea { outline: none; } input { outline: none; }
        .tab-btn { background: transparent; border: none; cursor: pointer; padding: 8px 14px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; transition: all 0.2s; white-space: nowrap; }
        .tab-btn:hover { background: rgba(255,255,255,0.06); }
      `}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #080e1a 0%, #0d1625 50%, #0a1520 100%)", fontFamily: "'DM Sans', sans-serif", color: "#e0eaf5" }}>

        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", background: "linear-gradient(135deg, #0077b5, #63d9b4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>💼</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "17px", color: "#f0f4ff", letterSpacing: "-0.02em" }}>Job Intelligence Agent</div>
              <div style={{ fontSize: "11px", color: "#5a7a9a", letterSpacing: "0.04em" }}>LinkedIn Intelligence · Powered by Claude AI</div>
            </div>
          </div>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#63d9b4" }}>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(99,217,180,0.3)", borderTopColor: "#63d9b4", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Agent running...
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "calc(100vh - 65px)" }}>

          {/* ── Left Panel ── */}
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Profile */}
            <div style={{ padding: "18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "12px", color: "#63d9b4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>Your Profile</div>
              {profileFields.map(f => (
                <input key={f.key} value={userProfile[f.key]} onChange={e => setUserProfile(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 10px", color: "#d0e0f0", fontSize: "12px", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }} />
              ))}
            </div>
            {/* Quick Actions */}
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "12px", color: "#63d9b4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Quick Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {quickActions.map((a, i) => (
                  <button key={i} onClick={() => !loading && runAgent(a.msg)} disabled={loading}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "9px 12px", color: loading ? "#4a5a6a" : "#c0d0e0", fontSize: "12px", cursor: loading ? "not-allowed" : "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => !loading && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  >{a.label}</button>
                ))}
              </div>
            </div>
            {/* Agent Logs */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "12px", color: "#63d9b4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Agent Logs</div>
              {agentLogs.length === 0
                ? <div style={{ color: "#3a4a5a", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>No activity yet...</div>
                : <AgentLog logs={agentLogs} />}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "4px", overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)}
                  style={{ color: activeTab === t.id ? "#f0f4ff" : "#5a7a9a", background: activeTab === t.id ? "rgba(255,255,255,0.08)" : "transparent", fontWeight: activeTab === t.id ? 600 : 400 }}
                >{t.label}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

              {/* ── Chat ── */}
              {activeTab === "chat" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 20px", animation: "fadeSlideIn 0.6s ease both" }}>
                      <div style={{ fontSize: "48px", marginBottom: "16px" }}>💼</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "22px", color: "#f0f4ff", marginBottom: "10px" }}>Job Intelligence Agent</div>
                      <div style={{ color: "#5a7a9a", fontSize: "14px", maxWidth: "400px", margin: "0 auto", lineHeight: 1.7 }}>
                        Search for jobs at any experience level. Get an AI fit score, generate cold DMs and cover letters, and track applications in your pipeline.
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeSlideIn 0.3s ease both" }}>
                      <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "linear-gradient(135deg, #0077b5, #005f94)" : "rgba(255,255,255,0.05)", border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)", fontSize: "14px", lineHeight: 1.65, color: m.role === "user" ? "#fff" : "#d0e0f0", whiteSpace: "pre-wrap" }}>{m.content}</div>
                    </div>
                  ))}
                  {loading && (
                    <div style={{ display: "flex" }}>
                      <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ display: "flex", gap: "5px" }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#63d9b4", animation: `pulse 1.2s ${i*0.2}s infinite` }} />)}</div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}

              {/* ── Jobs ── */}
              {activeTab === "jobs" && (
                <div>
                  {jobs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a5a7a" }}>
                      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🗂</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: "#4a6a8a" }}>No Jobs Yet</div>
                      <div style={{ fontSize: "13px" }}>Use the quick actions or ask me to find jobs</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: "#f0f4ff", marginBottom: "6px" }}>{jobs.length} Opportunities Found</div>
                      <div style={{ fontSize: "13px", color: "#5a7a9a", marginBottom: "16px" }}>Positions across the US · Updated just now</div>
                      <CityFilter value={cityFilter} onChange={setCityFilter} />
                      {filterByCity(jobs).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", color: "#3a5a7a" }}>
                          <div style={{ fontSize: "14px", color: "#4a6a8a" }}>No jobs match "{cityFilter}"</div>
                        </div>
                      ) : (
                        <div>
                          {cityFilter && <div style={{ fontSize: "12px", color: "#5a7a9a", marginBottom: "12px" }}>Showing {filterByCity(jobs).length} of {jobs.length} jobs in "{cityFilter}"</div>}
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {filterByCity(jobs).map((job, i) => (
                              <JobCard key={i} job={job} index={i} isSaved={isJobSaved(job)} onToggleSave={() => toggleSaveJob(job)} pipelineStage={getPipelineStage(job)} onAddToPipeline={addToPipeline} userProfile={userProfile} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Saved ── */}
              {activeTab === "saved" && (
                <div>
                  {savedJobs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a5a7a" }}>
                      <div style={{ fontSize: "40px", marginBottom: "12px" }}>🤍</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: "#4a6a8a" }}>No Saved Jobs</div>
                      <div style={{ fontSize: "13px" }}>Tap the heart icon on any job card to save it here</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: "#f0f4ff", marginBottom: "6px" }}>❤️ Saved Jobs</div>
                      <div style={{ fontSize: "13px", color: "#5a7a9a", marginBottom: "16px" }}>{savedJobs.length} job{savedJobs.length !== 1 ? "s" : ""} saved · Stored locally</div>
                      <CityFilter value={cityFilter} onChange={setCityFilter} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {filterByCity(savedJobs).map((job, i) => (
                          <JobCard key={i} job={job} index={i} isSaved={true} onToggleSave={() => toggleSaveJob(job)} pipelineStage={getPipelineStage(job)} onAddToPipeline={addToPipeline} userProfile={userProfile} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Pipeline ── */}
              {activeTab === "pipeline" && (
                <div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: "#f0f4ff", marginBottom: "6px" }}>📋 Application Pipeline</div>
                  <div style={{ fontSize: "13px", color: "#5a7a9a", marginBottom: "20px" }}>Track your applications from interest to offer</div>
                  <PipelineBoard pipeline={pipeline} onMoveStage={movePipelineStage} onRemove={removeFromPipeline} />
                </div>
              )}

              {/* ── Post ── */}
              {activeTab === "post" && (
                <div>
                  {!suggestedPost ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#3a5a7a" }}>
                      <div style={{ fontSize: "40px", marginBottom: "12px" }}>✍️</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: "#4a6a8a" }}>No Post Yet</div>
                      <div style={{ fontSize: "13px" }}>Ask me to write a LinkedIn post based on the job findings</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "20px", color: "#f0f4ff", marginBottom: "6px" }}>Your LinkedIn Post</div>
                      <div style={{ fontSize: "13px", color: "#5a7a9a", marginBottom: "20px" }}>Ready to copy and share</div>
                      <PostDisplay text={suggestedPost} />
                      <button onClick={() => runAgent("Rewrite the LinkedIn post with a different angle and tone")} disabled={loading}
                        style={{ marginTop: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a0b0c0", padding: "9px 18px", borderRadius: "8px", fontSize: "13px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        🔄 Regenerate
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Input */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Search for jobs by role, level, or location — or ask me to write your LinkedIn post..."
                  rows={2}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 14px", color: "#e0eaf5", fontSize: "14px", resize: "none", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }} />
                <button onClick={handleSend} disabled={loading || !input.trim()}
                  style={{ background: loading || !input.trim() ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #0077b5, #005f94)", border: "none", borderRadius: "12px", width: 44, height: 44, cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: "18px", transition: "all 0.2s", flexShrink: 0, color: "#fff" }}>
                  {loading
                    ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "auto" }} />
                    : "↑"}
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "#2a4a6a", marginTop: "8px" }}>Enter to send · Shift+Enter for new line</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
