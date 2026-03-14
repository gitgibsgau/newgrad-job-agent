"use client";
import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: "interested", label: "💡 Interested", color: "#14b8a6" },
  { id: "applied",    label: "📤 Applied",    color: "#f59e0b" },
  { id: "interview",  label: "🎯 Interview",  color: "#8b5cf6" },
  { id: "offer",      label: "🎉 Offer",      color: "#ec4899" },
];

const LEVELS = ["Any Level", "Entry-Level", "Mid-Level", "Senior", "Staff / Principal"];

const ROLE_CHIPS = [
  "AI Engineer",
  "ML Engineer",
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "DevOps Engineer",
  "UX Designer",
  "Data Analyst",
];

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
  bg:         "#f8fffe",
  bgCard:     "#ffffff",
  bgSubtle:   "#f0fdfa",
  border:     "#d1fae5",
  borderGray: "#e2e8f0",
  mint:       "#14b8a6",
  mintDark:   "#0d9488",
  mintLight:  "#ccfbf1",
  blue:       "#60a5fa",
  blueLight:  "#dbeafe",
  purple:     "#a78bfa",
  purpleLight:"#ede9fe",
  pink:       "#f472b6",
  pinkLight:  "#fce7f3",
  amber:      "#f59e0b",
  amberLight: "#fef3c7",
  text:       "#0f172a",
  text2:      "#334155",
  text3:      "#64748b",
  text4:      "#94a3b8",
  sidebar:    "#ffffff",
  sidebarBorder: "#e8f5f2",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const jKey = (job) => `${job.company}||${job.role}`;

const fitColor = (s) =>
  s == null ? null : s >= 80 ? "#059669" : s >= 60 ? "#d97706" : "#e11d48";

const fitBg = (s) =>
  s == null ? null : s >= 80 ? "#ecfdf5" : s >= 60 ? "#fffbeb" : "#fff1f2";

const cacheKey = ({ role, location, level }) =>
  `${role}|${location}|${level}`.toLowerCase().trim();

const timeAgo = (ts) => {
  const d = Date.now() - ts;
  if (d < 60000) return "just now";
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  return `${Math.floor(d / 3600000)}h ago`;
};

// ─── ActionPanel ──────────────────────────────────────────────────────────────

const ActionPanel = ({ action, job, loading, content, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const labels = {
    "cold-dm":        "✉️ Cold DM",
    "cover-letter":   "📄 Cover Letter",
    "interview-prep": "🎤 Interview Prep",
    "find-recruiter": "👤 Find Recruiter",
  };

  const isCached = (() => {
    if (!job || !action) return false;
    try { return !!JSON.parse(localStorage.getItem(`jw_action_${job.company}||${job.role}||${action}`) || "null")?.content; } catch { return false; }
  })();

  return (
    <div style={{
      marginTop: "12px",
      padding: "14px 16px",
      background: C.bgSubtle,
      border: `1px solid ${C.border}`,
      borderRadius: "10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: C.mintDark, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {labels[action]}
          </span>
          {isCached && !loading && (
            <span style={{ fontSize: "10px", color: C.text4, background: C.borderGray, borderRadius: "8px", padding: "1px 7px", fontFamily: "'DM Mono', monospace" }}>
              cached
            </span>
          )}
        </div>
        {!loading && content && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {isCached && (
              <button
                onClick={onRegenerate}
                title="Clear cache and regenerate"
                style={{ background: "none", border: "none", color: C.text4, fontSize: "11px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
              >
                ↻ Regenerate
              </button>
            )}
            <button
              onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ background: "none", border: "none", color: copied ? C.mint : C.text3, fontSize: "11px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div style={{ display: "flex", gap: "4px", padding: "4px 0" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.mint, animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
          ))}
        </div>
      ) : (
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "12.5px", lineHeight: 1.7, color: C.text2, fontFamily: "Inter, sans-serif" }}>
          {content}
        </pre>
      )}
    </div>
  );
};

// ─── JobCard ──────────────────────────────────────────────────────────────────

const JobCard = ({ job, index = 0, isSaved, onToggleSave, pipelineStage, onAddToPipeline, userProfile, accessCode }) => {
  const [activeAction, setActiveAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionContent, setActionContent] = useState("");

  const runAction = async (action) => {
    if (activeAction === action && !actionLoading) { setActiveAction(null); return; }
    setActiveAction(action);

    // Check localStorage cache first — never re-call API for same job+action
    const ck = `jw_action_${job.company}||${job.role}||${action}`;
    try {
      const hit = JSON.parse(localStorage.getItem(ck) || "null");
      if (hit?.content) { setActionContent(hit.content); return; }
    } catch {}


    setActionLoading(true);
    setActionContent("");
    try {
      const res = await fetch("/api/job-action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({ job, action, userProfile }),
      });
      const data = await res.json();
      const content = data.content || "";
      setActionContent(content);
      // Persist to localStorage so this action is never regenerated
      if (content) try { localStorage.setItem(ck, JSON.stringify({ content, ts: Date.now() })); } catch {}
    } catch {
      setActionContent("Error generating content. Please try again.");
    }
    setActionLoading(false);
  };

  const regenerateAction = (action) => {
    try { localStorage.removeItem(`jw_action_${job.company}||${job.role}||${action}`); } catch {}
    setActiveAction(null);
    setActionContent("");
    setTimeout(() => runAction(action), 0);
  };

  const score = job.fitScore;
  const color = fitColor(score);
  const bg = fitBg(score);
  const pipelineLabel = PIPELINE_STAGES.find((s) => s.id === pipelineStage)?.label;

  return (
    <div style={{
      background: C.bgCard,
      border: isSaved ? `1.5px solid ${C.pink}` : `1px solid ${C.borderGray}`,
      borderRadius: "14px",
      padding: "16px 20px",
      animation: `fadeSlideIn 0.4s ease ${index * 0.06}s both`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "15px", color: C.text }}>{job.company}</div>
          <div style={{ fontSize: "13px", color: C.mintDark, fontWeight: 500, marginTop: "2px" }}>{job.role}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, marginLeft: "12px" }}>
          {color && (
            <div title={job.fitReason || ""} style={{
              background: bg,
              border: `1px solid ${color}40`,
              borderRadius: "20px",
              padding: "3px 10px",
              fontSize: "11px",
              fontWeight: 700,
              color,
              fontFamily: "'DM Mono', monospace",
              cursor: "default",
              whiteSpace: "nowrap",
            }}>
              {score}% fit
            </div>
          )}
          <button
            onClick={onToggleSave}
            title={isSaved ? "Remove from saved" : "Save job"}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "17px", padding: "2px 4px", lineHeight: 1, transition: "transform 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isSaved ? "❤️" : "🤍"}
          </button>
          {job.link && job.link !== "#" && (
            <a href={job.link} target="_blank" rel="noopener noreferrer" style={{
              fontSize: "11px",
              color: C.blue,
              textDecoration: "none",
              background: C.blueLight,
              padding: "4px 10px",
              borderRadius: "20px",
              border: `1px solid ${C.blue}30`,
              whiteSpace: "nowrap",
              fontWeight: 500,
            }}>
              View →
            </a>
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: C.text3, marginBottom: "10px", flexWrap: "wrap" }}>
        <span>📍 {job.location}</span>
        {job.posted && <span>🕐 {job.posted}</span>}
        {job.level && <span style={{ color: C.text2 }}>🎯 {job.level}</span>}
      </div>

      {/* Fit reason */}
      {job.fitReason && (
        <div style={{
          fontSize: "12px",
          color: color || C.text3,
          background: bg || C.bgSubtle,
          padding: "7px 10px",
          borderRadius: "7px",
          marginBottom: "12px",
          lineHeight: 1.5,
        }}>
          {job.fitReason}
        </div>
      )}

      {/* Summary */}
      {job.summary && !job.fitReason && (
        <div style={{ fontSize: "12px", color: C.text3, lineHeight: 1.6, borderTop: `1px solid ${C.borderGray}`, paddingTop: "10px", marginBottom: "10px" }}>
          {job.summary}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: `1px solid ${C.borderGray}`, paddingTop: "10px" }}>
        {[
          { id: "cold-dm",        label: "✉️ Cold DM" },
          { id: "cover-letter",   label: "📄 Cover Letter" },
          { id: "interview-prep", label: "🎤 Interview Prep" },
          { id: "find-recruiter", label: "👤 Find Recruiter" },
        ].map((a) => (
          <button
            key={a.id}
            onClick={() => runAction(a.id)}
            style={{
              background: activeAction === a.id ? C.mintLight : C.bgSubtle,
              border: `1px solid ${activeAction === a.id ? C.mint : C.borderGray}`,
              borderRadius: "20px",
              padding: "5px 12px",
              fontSize: "11px",
              color: activeAction === a.id ? C.mintDark : C.text3,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "Inter, sans-serif",
              fontWeight: activeAction === a.id ? 600 : 400,
            }}
          >
            {a.label}
          </button>
        ))}
        <button
          onClick={() => onAddToPipeline(job)}
          style={{
            background: pipelineStage ? C.blueLight : C.bgSubtle,
            border: `1px solid ${pipelineStage ? C.blue : C.borderGray}`,
            borderRadius: "20px",
            padding: "5px 12px",
            fontSize: "11px",
            color: pipelineStage ? C.blue : C.text3,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "Inter, sans-serif",
            marginLeft: "auto",
            fontWeight: pipelineStage ? 600 : 400,
          }}
        >
          {pipelineStage ? `📌 ${pipelineLabel}` : "+ Pipeline"}
        </button>
      </div>

      {activeAction && (
        <ActionPanel action={activeAction} job={job} loading={actionLoading} content={actionContent} onRegenerate={() => regenerateAction(activeAction)} />
      )}
    </div>
  );
};

// ─── PipelineBoard ────────────────────────────────────────────────────────────

const PipelineBoard = ({ pipeline, onMoveStage, onRemove }) => {
  const entries = Object.values(pipeline);

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: C.text4 }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
        <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: C.text3 }}>Pipeline Empty</div>
        <div style={{ fontSize: "13px" }}>Click "+ Pipeline" on any job card to start tracking</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", alignItems: "start" }}>
      {PIPELINE_STAGES.map((stage, si) => {
        const stageEntries = entries.filter((e) => e.stage === stage.id);
        return (
          <div key={stage.id} style={{
            background: C.bgCard,
            border: `1px solid ${C.borderGray}`,
            borderRadius: "14px",
            padding: "14px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <span style={{ fontWeight: 700, fontSize: "12px", color: stage.color }}>{stage.label}</span>
              <span style={{ fontSize: "11px", color: C.text4, background: C.bgSubtle, borderRadius: "10px", padding: "2px 8px", fontWeight: 600 }}>
                {stageEntries.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {stageEntries.map(({ job }, i) => (
                <div key={i} style={{
                  background: C.bgSubtle,
                  border: `1px solid ${stage.color}30`,
                  borderRadius: "10px",
                  padding: "12px",
                }}>
                  <div style={{ fontWeight: 700, fontSize: "12px", color: C.text, marginBottom: "2px", lineHeight: 1.3 }}>{job.company}</div>
                  <div style={{ fontSize: "11px", color: C.mintDark, marginBottom: "4px" }}>{job.role}</div>
                  <div style={{ fontSize: "10px", color: C.text4, marginBottom: "10px" }}>📍 {job.location}</div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      onClick={() => si > 0 && onMoveStage(job, PIPELINE_STAGES[si - 1].id)}
                      disabled={si === 0}
                      style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "6px", padding: "4px", fontSize: "13px", color: si === 0 ? C.text4 : C.text3, cursor: si === 0 ? "default" : "pointer" }}
                    >←</button>
                    <button
                      onClick={() => si < PIPELINE_STAGES.length - 1 && onMoveStage(job, PIPELINE_STAGES[si + 1].id)}
                      disabled={si === PIPELINE_STAGES.length - 1}
                      style={{ flex: 1, background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "6px", padding: "4px", fontSize: "13px", color: si === PIPELINE_STAGES.length - 1 ? C.text4 : C.text3, cursor: si === PIPELINE_STAGES.length - 1 ? "default" : "pointer" }}
                    >→</button>
                    <button
                      onClick={() => onRemove(job)}
                      style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", color: "#e11d48", cursor: "pointer" }}
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

// ─── PostDisplay ──────────────────────────────────────────────────────────────

const PostDisplay = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background: "linear-gradient(135deg, #f0fdfa, #eff6ff)",
      border: `1px solid ${C.border}`,
      borderRadius: "14px",
      padding: "20px 22px",
      animation: "fadeSlideIn 0.5s ease both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontWeight: 700, fontSize: "13px", color: C.mintDark, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          ✨ Suggested LinkedIn Post
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{
            background: copied ? C.mintLight : C.bgCard,
            border: `1px solid ${C.borderGray}`,
            color: copied ? C.mintDark : C.text3,
            padding: "5px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            cursor: "pointer",
            transition: "all 0.2s",
            fontWeight: 500,
          }}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "13.5px", lineHeight: 1.75, color: C.text2, fontFamily: "Inter, sans-serif" }}>
        {text}
      </pre>
    </div>
  );
};

// ─── GateScreen ───────────────────────────────────────────────────────────────

const GateScreen = ({ onAuthorized }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (data.valid) {
        onAuthorized(trimmed);
      } else {
        setError("Invalid access code. Please check and try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: C.bg,
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: "20px",
        padding: "40px 36px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 8px 32px rgba(20,184,166,0.08)",
        animation: "fadeSlideIn 0.4s ease both",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{
            width: 42, height: 42, borderRadius: "12px",
            background: `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px",
          }}>🚀</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "18px", color: C.text, letterSpacing: "-0.03em" }}>JobWing</div>
            <div style={{ fontSize: "11px", color: C.text4 }}>Your AI job wingman</div>
          </div>
        </div>

        <div style={{ fontWeight: 700, fontSize: "16px", color: C.text, marginBottom: "6px" }}>Enter access code</div>
        <div style={{ fontSize: "13px", color: C.text3, marginBottom: "22px", lineHeight: 1.5 }}>
          This app is invite-only. Enter the code shared at the event to get started.
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Access code"
          type="password"
          style={{
            width: "100%",
            background: C.bgSubtle,
            border: `1.5px solid ${error ? "#fca5a5" : C.border}`,
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "14px",
            color: C.text,
            fontFamily: "Inter, sans-serif",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ fontSize: "12px", color: "#e11d48", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "8px 12px", marginBottom: "12px" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          style={{
            width: "100%",
            background: loading || !code.trim() ? C.borderGray : `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
            border: "none",
            borderRadius: "10px",
            padding: "13px",
            color: loading || !code.trim() ? C.text4 : "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading || !code.trim() ? "not-allowed" : "pointer",
            fontFamily: "Inter, sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              Verifying...
            </>
          ) : "Enter JobWing →"}
        </button>
      </div>
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { outline: none; }
        input::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  );
};

// ─── ResumeUpload ─────────────────────────────────────────────────────────────

const ResumeUpload = ({ onProfileExtracted, accessCode }) => {
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setResumeText(ev.target.result);
    reader.readAsText(file);
  };

  const analyze = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({ text: resumeText }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else {
        setResult(data);
        if (onProfileExtracted) onProfileExtracted(data);
      }
    } catch {
      setError("Failed to analyze resume. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Upload area */}
      <div style={{
        border: `2px dashed ${C.border}`,
        borderRadius: "12px",
        padding: "20px",
        background: C.bgSubtle,
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              background: C.mintLight,
              border: `1px solid ${C.mint}`,
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: "13px",
              color: C.mintDark,
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
            }}
          >
            📄 Upload .txt / .md
          </button>
          <span style={{ fontSize: "12px", color: C.text4 }}>or paste your resume below</span>
          <input ref={fileRef} type="file" accept=".txt,.md,.text" onChange={handleFile} style={{ display: "none" }} />
        </div>
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here..."
          rows={8}
          style={{
            width: "100%",
            background: C.bgCard,
            border: `1px solid ${C.borderGray}`,
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "12.5px",
            color: C.text2,
            fontFamily: "Inter, sans-serif",
            resize: "vertical",
            lineHeight: 1.6,
            boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={analyze}
        disabled={loading || !resumeText.trim()}
        style={{
          background: loading || !resumeText.trim()
            ? C.borderGray
            : `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
          border: "none",
          borderRadius: "10px",
          padding: "11px 24px",
          color: loading || !resumeText.trim() ? C.text4 : "#fff",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading || !resumeText.trim() ? "not-allowed" : "pointer",
          fontFamily: "Inter, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Analyzing...
          </>
        ) : "✨ Analyze Resume"}
      </button>

      {error && (
        <div style={{ color: "#e11d48", fontSize: "13px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
          {/* Summary */}
          <div style={{ background: "linear-gradient(135deg, #f0fdfa, #eff6ff)", border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px 18px", marginBottom: "14px" }}>
            <div style={{ fontWeight: 700, fontSize: "11px", color: C.mintDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Profile Summary</div>
            <p style={{ margin: 0, fontSize: "13px", color: C.text2, lineHeight: 1.6 }}>{result.summary}</p>
            {result.experience && (
              <div style={{ marginTop: "10px", display: "inline-block", background: C.purpleLight, border: "1px solid #c4b5fd", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", color: "#6d28d9", fontWeight: 600 }}>
                {result.experience}
              </div>
            )}
          </div>

          {/* Skills */}
          {result.skills?.length > 0 && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "12px", padding: "16px 18px", marginBottom: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "11px", color: C.mintDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>Detected Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {result.skills.map((skill, i) => (
                  <span key={i} style={{ background: C.mintLight, border: `1px solid ${C.mint}40`, borderRadius: "20px", padding: "4px 11px", fontSize: "12px", color: C.mintDark, fontWeight: 500 }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "12px", padding: "16px 18px" }}>
              <div style={{ fontWeight: 700, fontSize: "11px", color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                💡 Resume Improvement Tips
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {result.suggestions.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: C.text2, lineHeight: 1.5 }}>
                    <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Agent ───────────────────────────────────────────────────────────────

export default function Agent() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [view, setView] = useState("dashboard");
  const [userProfile, setUserProfile] = useState({ name: "", field: "", skills: "", experience: "" });
  const [searchForm, setSearchForm] = useState({ role: "", location: "", level: "Any Level" });
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [searchCache, setSearchCache] = useState({});
  const [currentCacheKey, setCurrentCacheKey] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [pipeline, setPipeline] = useState({});
  const [cityFilter, setCityFilter] = useState("");
  const [suggestedPost, setSuggestedPost] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [dashboardRole, setDashboardRole] = useState("");

  // ── Persistence ──
  useEffect(() => {
    try { setSavedJobs(JSON.parse(localStorage.getItem("savedJobs") || "[]")); } catch {}
    try { setPipeline(JSON.parse(localStorage.getItem("pipeline") || "{}")); } catch {}
    try { setSearchHistory(JSON.parse(localStorage.getItem("searchHistory") || "[]")); } catch {}
    try {
      const p = JSON.parse(localStorage.getItem("userProfile") || "null");
      if (p) setUserProfile(p);
    } catch {}
    // Load search cache from localStorage, drop entries older than 24h
    try {
      const raw = JSON.parse(localStorage.getItem("searchCache") || "{}");
      const ttl = 24 * 60 * 60 * 1000;
      const fresh = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => Date.now() - v.timestamp < ttl)
      );
      if (Object.keys(fresh).length > 0) setSearchCache(fresh);
    } catch {}
    try {
      const v = localStorage.getItem("view");
      if (v) setView(v);
    } catch {}
    try {
      const sf = JSON.parse(localStorage.getItem("searchForm") || "null");
      if (sf) setSearchForm(sf);
    } catch {}
    try {
      const ck = localStorage.getItem("currentCacheKey");
      if (ck) setCurrentCacheKey(ck);
    } catch {}
    try {
      const cf = localStorage.getItem("cityFilter");
      if (cf) setCityFilter(cf);
    } catch {}
    try {
      const post = localStorage.getItem("suggestedPost");
      if (post) setSuggestedPost(post);
    } catch {}
    try {
      const dr = localStorage.getItem("dashboardRole");
      if (dr) setDashboardRole(dr);
    } catch {}
    try {
      const ac = localStorage.getItem("accessCode");
      if (ac) { setAccessCode(ac); setIsAuthorized(true); }
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem("savedJobs", JSON.stringify(savedJobs)); }, [savedJobs]);
  useEffect(() => { localStorage.setItem("pipeline", JSON.stringify(pipeline)); }, [pipeline]);
  useEffect(() => { localStorage.setItem("searchHistory", JSON.stringify(searchHistory)); }, [searchHistory]);
  useEffect(() => { localStorage.setItem("userProfile", JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { try { localStorage.setItem("searchCache", JSON.stringify(searchCache)); } catch {} }, [searchCache]);
  useEffect(() => { localStorage.setItem("view", view); }, [view]);
  useEffect(() => { localStorage.setItem("searchForm", JSON.stringify(searchForm)); }, [searchForm]);
  useEffect(() => { if (currentCacheKey) localStorage.setItem("currentCacheKey", currentCacheKey); }, [currentCacheKey]);
  useEffect(() => { localStorage.setItem("cityFilter", cityFilter); }, [cityFilter]);
  useEffect(() => { localStorage.setItem("suggestedPost", suggestedPost); }, [suggestedPost]);
  useEffect(() => { localStorage.setItem("dashboardRole", dashboardRole); }, [dashboardRole]);

  // ── Search ──
  const runSearch = async (params, forceRefresh = false) => {
    const key = cacheKey(params);
    if (!forceRefresh && searchCache[key]) { setCurrentCacheKey(key); setView("search"); return; }
    setSearchLoading(true);
    setCurrentCacheKey(key);
    setView("search");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({ ...params, userProfile }),
      });
      const data = await res.json();
      const jobs = data.jobs || [];
      setSearchCache((prev) => ({ ...prev, [key]: { jobs, summary: data.summary || "", timestamp: Date.now(), params } }));
      setSearchHistory((prev) => {
        const filtered = prev.filter((h) => h.key !== key);
        return [{ key, params, timestamp: Date.now(), count: jobs.length }, ...filtered].slice(0, 8);
      });
    } catch (err) { console.error(err); }
    setSearchLoading(false);
  };

  const handleSearchSubmit = () => { if (!searchForm.role.trim()) return; runSearch(searchForm); };
  const handleChipClick = (chipRole) => { const p = { ...searchForm, role: chipRole }; setSearchForm(p); runSearch(p); };

  // ── Load More ──
  const loadMore = async () => {
    if (!currentResult || loadMoreLoading) return;
    setLoadMoreLoading(true);
    const excludeCompanies = currentJobs.map((j) => j.company);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({ ...currentResult.params, userProfile, excludeCompanies }),
      });
      const data = await res.json();
      const newJobs = data.jobs || [];
      if (newJobs.length > 0) {
        setSearchCache((prev) => ({
          ...prev,
          [currentCacheKey]: { ...prev[currentCacheKey], jobs: [...prev[currentCacheKey].jobs, ...newJobs] },
        }));
      }
    } catch (err) { console.error(err); }
    setLoadMoreLoading(false);
  };

  // ── Saved ──
  const isJobSaved = (job) => savedJobs.some((j) => jKey(j) === jKey(job));
  const toggleSaveJob = (job) => setSavedJobs((prev) => isJobSaved(job) ? prev.filter((j) => jKey(j) !== jKey(job)) : [...prev, job]);

  // ── Pipeline ──
  const getPipelineStage = (job) => pipeline[jKey(job)]?.stage ?? null;
  const addToPipeline = (job) => {
    const key = jKey(job);
    if (pipeline[key]) { setPipeline((prev) => { const n = { ...prev }; delete n[key]; return n; }); }
    else { setPipeline((prev) => ({ ...prev, [key]: { stage: "interested", job } })); setView("pipeline"); }
  };
  const movePipelineStage = (job, stage) => setPipeline((prev) => ({ ...prev, [jKey(job)]: { ...prev[jKey(job)], stage } }));
  const removeFromPipeline = (job) => setPipeline((prev) => { const n = { ...prev }; delete n[jKey(job)]; return n; });

  // ── Filter ──
  const filterByCity = (list) => cityFilter.trim() ? list.filter((j) => j.location?.toLowerCase().includes(cityFilter.toLowerCase())) : list;

  // ── Post ──
  const generatePost = async () => {
    setPostLoading(true);
    setSuggestedPost("");
    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-access-code": accessCode },
        body: JSON.stringify({ jobs: currentJobs, userProfile }),
      });
      const data = await res.json();
      setSuggestedPost(data.content || "");
    } catch (err) { console.error(err); }
    setPostLoading(false);
  };

  // ── History ──
  const removeFromHistory = (key) => setSearchHistory((prev) => prev.filter((h) => h.key !== key));
  const loadHistoryItem = (item) => { setSearchForm(item.params); runSearch(item.params); };

  // ── Computed ──
  const currentResult = currentCacheKey ? searchCache[currentCacheKey] : null;
  const currentJobs = currentResult?.jobs || [];
  const filteredJobs = filterByCity(currentJobs);
  const filteredSaved = filterByCity(savedJobs);
  const pipelineCount = Object.keys(pipeline).length;
  const totalJobsFound = Object.values(searchCache).reduce((sum, r) => sum + r.jobs.length, 0);
  const isCached = currentResult && Date.now() - currentResult.timestamp > 30000;

  // ── Nav ──
  const navItems = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "search",    icon: "🔍", label: "Search" },
    { id: "saved",     icon: "❤️",  label: "Saved",    badge: savedJobs.length || null },
    { id: "pipeline",  icon: "📋", label: "Pipeline",  badge: pipelineCount || null },
    { id: "profile",   icon: "👤", label: "Profile" },
    { id: "post",      icon: "✍️",  label: "Post" },
  ];

  // ── Input style ──
  const inputStyle = {
    width: "100%",
    background: C.bgCard,
    border: `1px solid ${C.borderGray}`,
    borderRadius: "8px",
    padding: "8px 10px",
    color: C.text,
    fontSize: "12px",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isAuthorized) {
    return (
      <GateScreen onAuthorized={(code) => {
        setAccessCode(code);
        setIsAuthorized(true);
        localStorage.setItem("accessCode", code);
      }} />
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #d1fae5; border-radius:4px; }
        input, select, button, textarea { outline: none; font-family: Inter, sans-serif; }
        input::placeholder, textarea::placeholder { color: #94a3b8; }
        select option { background: #fff; color: #0f172a; }
      `}</style>

      <div style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        height: "100vh",
        background: C.bg,
        fontFamily: "Inter, sans-serif",
        color: C.text,
        overflow: "hidden",
      }}>
        {/* ── SIDEBAR ── */}
        <aside style={{
          background: C.sidebar,
          borderRight: `1px solid ${C.sidebarBorder}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}>
          {/* Logo */}
          <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${C.sidebarBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "17px",
                flexShrink: 0,
              }}>
                🚀
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "15px", color: C.text, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  JobWing
                </div>
                <div style={{ fontSize: "10px", color: C.text4, letterSpacing: "0.02em", marginTop: "1px" }}>
                  Your AI job wingman
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: "10px 8px", borderBottom: `1px solid ${C.sidebarBorder}` }}>
            {navItems.map((item) => {
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: "8px",
                    border: "none",
                    background: isActive ? C.bgSubtle : "transparent",
                    color: isActive ? C.mintDark : C.text3,
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    transition: "all 0.15s",
                    textAlign: "left",
                    marginBottom: "2px",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.bgSubtle; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: "15px", flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge ? (
                    <span style={{
                      background: isActive ? C.mintLight : C.bgSubtle,
                      color: isActive ? C.mintDark : C.text4,
                      borderRadius: "10px",
                      padding: "1px 7px",
                      fontSize: "10px",
                      fontWeight: 700,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Recent Searches */}
          <div style={{ padding: "14px 12px", flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "10px", color: C.mint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
              Recent Searches
            </div>
            {searchHistory.length === 0 ? (
              <div style={{ fontSize: "11px", color: C.text4, lineHeight: 1.5 }}>No searches yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {searchHistory.map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      onClick={() => loadHistoryItem(item)}
                      style={{
                        flex: 1,
                        background: C.bgSubtle,
                        border: `1px solid ${C.sidebarBorder}`,
                        borderRadius: "7px",
                        padding: "7px 8px",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "Inter, sans-serif",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.mintLight)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = C.bgSubtle)}
                    >
                      <div style={{ fontSize: "11px", color: C.text2, fontWeight: 500, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.params.role || "Any"} · {item.params.location || "Any"}
                      </div>
                      <div style={{ fontSize: "10px", color: C.text4, marginTop: "1px" }}>
                        {item.count} jobs · {timeAgo(item.timestamp)}
                      </div>
                    </button>
                    <button
                      onClick={() => removeFromHistory(item.key)}
                      style={{ background: "none", border: "none", color: C.text4, cursor: "pointer", fontSize: "13px", padding: "4px", lineHeight: 1, flexShrink: 0, borderRadius: "4px", transition: "color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#e11d48")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.text4)}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ overflowY: "auto", overflowX: "hidden", padding: "28px 32px", background: C.bg }}>

          {/* ── DASHBOARD ── */}
          {view === "dashboard" && (
            <div style={{ animation: "fadeSlideIn 0.4s ease both" }}>
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontWeight: 800, fontSize: "26px", color: C.text, marginBottom: "6px" }}>
                  {userProfile.name ? `Hi ${userProfile.name}! 👋` : "Welcome to JobWing 🚀"}
                </div>
                <div style={{ fontSize: "14px", color: C.text3 }}>
                  Not just a job board: cold DMs, cover letters, interview prep, pipeline tracking, and recruiter suggestions, all in one place.
                </div>
              </div>

              {/* Feature highlights */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "26px", overflowX: "auto", paddingBottom: "4px" }}>
                {[
                  { icon: "✉️", label: "Cold DM", desc: "Message recruiters in seconds", color: C.mint, bg: C.mintLight, border: `${C.mint}40` },
                  { icon: "📄", label: "Cover Letter", desc: "Tailored to every job", color: C.blue, bg: C.blueLight, border: `${C.blue}40` },
                  { icon: "🎤", label: "Interview Prep", desc: "Role-specific Q&A", color: C.purple, bg: C.purpleLight, border: `${C.purple}40` },
                  { icon: "📋", label: "Kanban Board", desc: "Track every application", color: C.amber, bg: C.amberLight, border: `${C.amber}40`, onClick: () => setView("pipeline") },
                  { icon: "❤️", label: "Save Jobs", desc: "Favorite & revisit anytime", color: C.pink, bg: C.pinkLight, border: `${C.pink}40`, onClick: () => setView("saved") },
                  { icon: "👤", label: "Find Recruiters", desc: "Know exactly who to reach", color: "#6366f1", bg: "#eef2ff", border: "#6366f140" },
                ].map((f) => (
                  <div
                    key={f.label}
                    onClick={f.onClick}
                    style={{
                      flexShrink: 0,
                      background: f.bg,
                      border: `1px solid ${f.border}`,
                      borderRadius: "12px",
                      padding: "12px 14px",
                      minWidth: "132px",
                      cursor: f.onClick ? "pointer" : "default",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ fontSize: "20px", marginBottom: "6px" }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: f.color, lineHeight: 1.2 }}>{f.label}</div>
                    <div style={{ fontSize: "11px", color: C.text3, marginTop: "3px", lineHeight: 1.35 }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* Quick search */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
                <input
                  value={dashboardRole}
                  onChange={(e) => setDashboardRole(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && dashboardRole.trim()) { const p = { ...searchForm, role: dashboardRole.trim() }; setSearchForm(p); runSearch(p); } }}
                  placeholder="Search for a role (e.g. AI Engineer, Product Manager)..."
                  style={{
                    flex: 1,
                    background: C.bgCard,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    color: C.text,
                    fontSize: "14px",
                    fontFamily: "Inter, sans-serif",
                    boxShadow: "0 1px 4px rgba(20,184,166,0.08)",
                  }}
                />
                <button
                  onClick={() => { if (!dashboardRole.trim()) return; const p = { ...searchForm, role: dashboardRole.trim() }; setSearchForm(p); runSearch(p); }}
                  style={{
                    background: `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 22px",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  Search
                </button>
              </div>

              {/* Role chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
                {ROLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    style={{
                      background: searchForm.role === chip ? C.mintLight : C.bgCard,
                      border: `1px solid ${searchForm.role === chip ? C.mint : C.borderGray}`,
                      borderRadius: "20px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      color: searchForm.role === chip ? C.mintDark : C.text3,
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: searchForm.role === chip ? 600 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Stats cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "28px" }}>
                {[
                  { label: "Jobs Found", value: totalJobsFound, icon: "🔍", sub: "this session", color: C.mint, bg: C.mintLight },
                  { label: "Saved", value: savedJobs.length, icon: "❤️", sub: "locally stored", color: C.pink, bg: C.pinkLight },
                  { label: "In Pipeline", value: pipelineCount, icon: "📋", sub: "being tracked", color: C.purple, bg: C.purpleLight },
                ].map((card) => (
                  <div key={card.label} style={{
                    background: C.bgCard,
                    border: `1px solid ${C.borderGray}`,
                    borderRadius: "14px",
                    padding: "18px 20px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{ fontSize: "22px", marginBottom: "6px" }}>{card.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: "28px", color: card.color, lineHeight: 1, marginBottom: "4px" }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: "13px", color: C.text2, fontWeight: 600 }}>{card.label}</div>
                    <div style={{ fontSize: "11px", color: C.text4, marginTop: "2px" }}>{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Pipeline snapshot */}
              {pipelineCount > 0 && (
                <div style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "14px", padding: "18px 20px", marginBottom: "28px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: C.text2, marginBottom: "14px" }}>📋 Pipeline Snapshot</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {PIPELINE_STAGES.map((stage) => {
                      const count = Object.values(pipeline).filter((e) => e.stage === stage.id).length;
                      const pct = pipelineCount ? Math.round((count / pipelineCount) * 100) : 0;
                      return (
                        <div key={stage.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                            <span style={{ fontSize: "12px", color: stage.color, fontWeight: 600 }}>{stage.label}</span>
                            <span style={{ fontSize: "11px", color: C.text4, fontFamily: "'DM Mono', monospace" }}>{count}</span>
                          </div>
                          <div style={{ height: "5px", background: C.borderGray, borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: stage.color, borderRadius: "4px", transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent searches */}
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: C.text2, marginBottom: "12px" }}>Recent Searches</div>
                {searchHistory.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 20px", background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "12px", color: C.text4, fontSize: "13px" }}>
                    No searches yet — use the search tab to get started.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
                    {searchHistory.map((item) => (
                      <div key={item.key} style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "12px", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: C.text, marginBottom: "3px" }}>{item.params.role || "Any Role"}</div>
                        <div style={{ fontSize: "12px", color: C.text3, marginBottom: "2px" }}>📍 {item.params.location || "Any location"} · {item.params.level !== "Any Level" ? item.params.level : "Any level"}</div>
                        <div style={{ fontSize: "11px", color: C.text4, marginBottom: "12px" }}>{item.count} jobs · {timeAgo(item.timestamp)}</div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => loadHistoryItem(item)} style={{ flex: 1, background: C.blueLight, border: `1px solid ${C.blue}30`, borderRadius: "6px", padding: "6px", fontSize: "11px", color: C.blue, cursor: "pointer", fontWeight: 500 }}>View</button>
                          <button onClick={() => runSearch(item.params, true)} title="Refresh" style={{ background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "6px", padding: "6px 10px", fontSize: "13px", color: C.text3, cursor: "pointer" }}>↻</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SEARCH ── */}
          {view === "search" && (
            <div style={{ animation: "fadeSlideIn 0.3s ease both" }}>
              <div style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "14px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <input
                    value={searchForm.role}
                    onChange={(e) => setSearchForm((f) => ({ ...f, role: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
                    placeholder="Role / Title (e.g. AI Engineer)"
                    style={{ flex: 1, minWidth: "160px", background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "8px", padding: "10px 14px", color: C.text, fontSize: "13px" }}
                  />
                  <input
                    value={searchForm.location}
                    onChange={(e) => setSearchForm((f) => ({ ...f, location: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
                    placeholder="City (e.g. San Francisco)"
                    style={{ width: "200px", background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "8px", padding: "10px 14px", color: C.text, fontSize: "13px" }}
                  />
                  <select
                    value={searchForm.level}
                    onChange={(e) => setSearchForm((f) => ({ ...f, level: e.target.value }))}
                    style={{ width: "150px", background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "8px", padding: "10px 14px", color: C.text, fontSize: "13px", cursor: "pointer" }}
                  >
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <button
                    onClick={handleSearchSubmit}
                    disabled={searchLoading || !searchForm.role.trim()}
                    style={{
                      background: searchLoading || !searchForm.role.trim() ? C.borderGray : `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 22px",
                      color: searchLoading || !searchForm.role.trim() ? C.text4 : "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: searchLoading || !searchForm.role.trim() ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {searchLoading ? "Searching..." : "Find Jobs"}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {ROLE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      disabled={searchLoading}
                      style={{
                        background: searchForm.role === chip ? C.mintLight : C.bgSubtle,
                        border: `1px solid ${searchForm.role === chip ? C.mint : C.borderGray}`,
                        borderRadius: "20px",
                        padding: "5px 13px",
                        fontSize: "11px",
                        color: searchForm.role === chip ? C.mintDark : C.text3,
                        cursor: searchLoading ? "not-allowed" : "pointer",
                        fontWeight: searchForm.role === chip ? 600 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {searchLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "16px" }}>
                  <div style={{ width: 36, height: 36, border: `3px solid ${C.mintLight}`, borderTopColor: C.mint, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ color: C.mintDark, fontSize: "14px", fontWeight: 500 }}>Searching LinkedIn...</div>
                  <div style={{ color: C.text4, fontSize: "12px" }}>This may take up to 30 seconds</div>
                </div>
              ) : currentResult ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "16px", color: C.text }}>
                      ✅ {currentJobs.length} result{currentJobs.length !== 1 ? "s" : ""} for "{currentResult.params.role}"
                      {currentResult.params.location ? ` in "${currentResult.params.location}"` : ""}
                    </span>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      background: isCached ? C.blueLight : C.mintLight,
                      border: `1px solid ${isCached ? C.blue + "40" : C.mint + "40"}`,
                      borderRadius: "20px", padding: "3px 10px",
                      fontSize: "10px", fontWeight: 600,
                      color: isCached ? C.blue : C.mintDark,
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {isCached ? `💾 cached · ${timeAgo(currentResult.timestamp)}` : "✨ fresh"}
                    </span>
                    <button onClick={() => runSearch(currentResult.params, true)} style={{ background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "20px", padding: "4px 12px", fontSize: "11px", color: C.text3, cursor: "pointer" }}>
                      ↻ Refresh
                    </button>
                  </div>

                  {currentResult.summary && (
                    <div style={{ fontSize: "13px", color: C.text3, lineHeight: 1.6, marginBottom: "16px", fontStyle: "italic" }}>
                      {currentResult.summary}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: C.text4 }}>📍</span>
                      <input
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        placeholder="Filter by city..."
                        style={{ width: "100%", background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "8px", padding: "8px 12px 8px 30px", color: C.text, fontSize: "13px" }}
                      />
                    </div>
                    {cityFilter && (
                      <button onClick={() => setCityFilter("")} style={{ background: C.bgSubtle, border: `1px solid ${C.borderGray}`, color: C.text3, padding: "8px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
                        Clear
                      </button>
                    )}
                  </div>

                  {cityFilter && (
                    <div style={{ fontSize: "12px", color: C.text3, marginBottom: "12px" }}>
                      Showing {filteredJobs.length} of {currentJobs.length} jobs in "{cityFilter}"
                    </div>
                  )}

                  {filteredJobs.length === 0 && cityFilter ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: C.text4, fontSize: "14px" }}>
                      No jobs match "{cityFilter}"
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {filteredJobs.map((job, i) => (
                        <JobCard key={jKey(job) + i} job={job} index={i} isSaved={isJobSaved(job)} onToggleSave={() => toggleSaveJob(job)} pipelineStage={getPipelineStage(job)} onAddToPipeline={addToPipeline} userProfile={userProfile} accessCode={accessCode} />
                      ))}
                    </div>
                  )}

                  {/* Load More */}
                  {!cityFilter && currentJobs.length > 0 && (
                    <div style={{ textAlign: "center", marginTop: "20px" }}>
                      <button
                        onClick={loadMore}
                        disabled={loadMoreLoading}
                        style={{
                          background: loadMoreLoading ? C.borderGray : C.bgCard,
                          border: `1px solid ${loadMoreLoading ? C.borderGray : C.border}`,
                          borderRadius: "20px",
                          padding: "10px 28px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: loadMoreLoading ? C.text4 : C.mintDark,
                          cursor: loadMoreLoading ? "not-allowed" : "pointer",
                          fontFamily: "Inter, sans-serif",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          transition: "all 0.2s",
                        }}
                      >
                        {loadMoreLoading ? (
                          <>
                            <div style={{ width: 12, height: 12, border: `2px solid ${C.mintLight}`, borderTopColor: C.mint, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            Finding more...
                          </>
                        ) : `Load more jobs (${currentJobs.length} so far)`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 20px", color: C.text4 }}>
                  <div style={{ fontSize: "42px", marginBottom: "14px" }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: "17px", color: C.text3, marginBottom: "8px" }}>Find Your Next Role</div>
                  <div style={{ fontSize: "13px" }}>Enter a role above or click a chip to get started</div>
                </div>
              )}
            </div>
          )}

          {/* ── SAVED ── */}
          {view === "saved" && (
            <div style={{ animation: "fadeSlideIn 0.3s ease both" }}>
              <div style={{ fontWeight: 800, fontSize: "22px", color: C.text, marginBottom: "6px" }}>❤️ Saved Jobs</div>
              <div style={{ fontSize: "13px", color: C.text3, marginBottom: "20px" }}>
                {savedJobs.length} job{savedJobs.length !== 1 ? "s" : ""} saved · Stored locally
              </div>

              {savedJobs.length > 0 && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: C.text4 }}>📍</span>
                    <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Filter by city..." style={{ width: "100%", background: C.bgSubtle, border: `1px solid ${C.borderGray}`, borderRadius: "8px", padding: "8px 12px 8px 30px", color: C.text, fontSize: "13px" }} />
                  </div>
                  {cityFilter && <button onClick={() => setCityFilter("")} style={{ background: C.bgSubtle, border: `1px solid ${C.borderGray}`, color: C.text3, padding: "8px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>Clear</button>}
                </div>
              )}

              {savedJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: C.text4 }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>🤍</div>
                  <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px", color: C.text3 }}>No Saved Jobs</div>
                  <div style={{ fontSize: "13px" }}>Tap the heart icon on any job card to save it here</div>
                </div>
              ) : filteredSaved.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: C.text4, fontSize: "14px" }}>No saved jobs match "{cityFilter}"</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filteredSaved.map((job, i) => (
                    <JobCard key={jKey(job) + i} job={job} index={i} isSaved={true} onToggleSave={() => toggleSaveJob(job)} pipelineStage={getPipelineStage(job)} onAddToPipeline={addToPipeline} userProfile={userProfile} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PIPELINE ── */}
          {view === "pipeline" && (
            <div style={{ animation: "fadeSlideIn 0.3s ease both" }}>
              <div style={{ fontWeight: 800, fontSize: "22px", color: C.text, marginBottom: "6px" }}>📋 Application Pipeline</div>
              <div style={{ fontSize: "13px", color: C.text3, marginBottom: "22px" }}>Track from interest to offer</div>
              <PipelineBoard pipeline={pipeline} onMoveStage={movePipelineStage} onRemove={removeFromPipeline} />
            </div>
          )}

          {/* ── PROFILE ── */}
          {view === "profile" && (
            <div style={{ animation: "fadeSlideIn 0.3s ease both", maxWidth: "720px" }}>
              <div style={{ fontWeight: 800, fontSize: "22px", color: C.text, marginBottom: "6px" }}>👤 Your Profile</div>
              <div style={{ fontSize: "13px", color: C.text3, marginBottom: "24px" }}>
                Your profile improves AI fit scores, cover letters, and cold DMs
              </div>

              {/* Basic info */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "14px", padding: "20px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontWeight: 700, fontSize: "11px", color: C.mintDark, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "14px" }}>Basic Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[
                    { key: "name",       label: "Full Name",       placeholder: "e.g. Alex Johnson" },
                    { key: "field",      label: "Target Role",     placeholder: "e.g. Software Engineer" },
                    { key: "skills",     label: "Top Skills",      placeholder: "e.g. Python, React, SQL" },
                    { key: "experience", label: "Experience Level", placeholder: "e.g. New Grad, 2 years" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: C.text3, marginBottom: "5px" }}>{f.label}</label>
                      <input
                        value={userProfile[f.key]}
                        onChange={(e) => setUserProfile((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ ...inputStyle, padding: "9px 12px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Resume upload */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "14px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontWeight: 700, fontSize: "11px", color: C.mintDark, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Resume Analyzer</div>
                <div style={{ fontSize: "12px", color: C.text4, marginBottom: "16px" }}>
                  Upload or paste your resume to extract skills, get AI fit scores, and receive improvement tips
                </div>
                <ResumeUpload
                  accessCode={accessCode}
                  onProfileExtracted={(data) => {
                    if (data.skills?.length) setUserProfile((p) => ({ ...p, skills: data.skills.slice(0, 8).join(", ") }));
                    if (data.experience) setUserProfile((p) => ({ ...p, experience: data.experience }));
                  }}
                />
              </div>
            </div>
          )}

          {/* ── POST ── */}
          {view === "post" && (
            <div style={{ animation: "fadeSlideIn 0.3s ease both" }}>
              <div style={{ fontWeight: 800, fontSize: "22px", color: C.text, marginBottom: "6px" }}>✍️ LinkedIn Post</div>
              <div style={{ fontSize: "13px", color: C.text3, marginBottom: "24px" }}>Generate a tailored post based on your job search</div>

              {currentJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: C.bgCard, border: `1px solid ${C.borderGray}`, borderRadius: "14px", color: C.text4 }}>
                  <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: C.text3, marginBottom: "8px" }}>No jobs searched yet</div>
                  <div style={{ fontSize: "13px" }}>Search for jobs first, then generate a tailored post</div>
                </div>
              ) : (
                <div>
                  <div style={{ background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "18px" }}>
                    <div style={{ fontSize: "11px", color: C.mintDark, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>Profile being used</div>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: C.text3 }}>
                      {userProfile.name && <span><span style={{ color: C.text2, fontWeight: 500 }}>Name: </span>{userProfile.name}</span>}
                      {userProfile.field && <span><span style={{ color: C.text2, fontWeight: 500 }}>Field: </span>{userProfile.field}</span>}
                      {userProfile.skills && <span><span style={{ color: C.text2, fontWeight: 500 }}>Skills: </span>{userProfile.skills}</span>}
                      {userProfile.experience && <span><span style={{ color: C.text2, fontWeight: 500 }}>Experience: </span>{userProfile.experience}</span>}
                      {!userProfile.name && !userProfile.field && !userProfile.skills && !userProfile.experience && (
                        <span style={{ color: C.text4 }}>No profile filled in — add details in the Profile tab for a more personalized post</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: C.text3, marginBottom: "14px" }}>
                    Based on {currentJobs.length} job{currentJobs.length !== 1 ? "s" : ""} from "{currentResult?.params.role}" search
                  </div>

                  <button
                    onClick={generatePost}
                    disabled={postLoading}
                    style={{
                      background: postLoading ? C.borderGray : `linear-gradient(135deg, ${C.mint}, ${C.blue})`,
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px 24px",
                      color: postLoading ? C.text4 : "#fff",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: postLoading ? "not-allowed" : "pointer",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {postLoading ? (
                      <>
                        <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        Generating...
                      </>
                    ) : suggestedPost ? "Regenerate Post" : "Generate Post"}
                  </button>

                  {suggestedPost && <PostDisplay text={suggestedPost} />}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
