"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Recording {
  id: string;
  filename: string;
  status: string;
  languageDetected: string | null;
  errorMessage: string | null;
}

interface Job {
  id: string;
  name: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  createdAt: string;
  recordings: Recording[];
}

const statusColor: Record<string, string> = {
  PENDING: "#94a3b8",
  DOWNLOADING: "#3b82f6",
  TRANSCRIBING: "#8b5cf6",
  TRANSLATING: "#f59e0b",
  GENERATING_DOCX: "#10b981",
  COMPLETED: "#10b981",
  FAILED: "#ef4444",
};

export default function JobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchJob = async () => {
    const res = await fetch(`/api/jobs/${id}`);
    if (res.ok) setJob(await res.json());
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (!job) return (
    <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>
      <div style={{ fontSize: 40 }}>⚙️</div>
      <p>Loading job details...</p>
    </div>
  );

  const pct = job.totalFiles > 0
    ? Math.round((job.processedFiles / job.totalFiles) * 100)
    : 0;

  const statuses = ["ALL", "COMPLETED", "FAILED", "TRANSCRIBING", "TRANSLATING", "PENDING"];
  const filtered = job.recordings.filter((r) => {
    const matchStatus = filter === "ALL" || r.status === filter;
    const matchSearch = r.filename.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ color: "#6366f1", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
          ← All Jobs
        </a>
      </div>

      {/* Job header card */}
      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{job.name}</h1>
            <span className={`status-badge status-${job.status}`} style={{ fontSize: 13 }}>
              {job.status}
            </span>
          </div>
          {job.status === "COMPLETED" && (
            <a href={`/api/jobs/${job.id}/download`} style={{
              padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white", textDecoration: "none"
            }}>
              ⬇ Download All Transcripts
            </a>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          {[
            { label: "Total Files", value: job.totalFiles, color: "#6366f1" },
            { label: "Completed", value: job.processedFiles, color: "#10b981" },
            { label: "Failed", value: job.failedFiles, color: "#ef4444" },
            { label: "Progress", value: `${pct}%`, color: "#8b5cf6" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "#f8fafc", borderRadius: 10, padding: "14px 18px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="progress-bar" style={{ height: 12 }}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
            border: filter === s ? "2px solid #6366f1" : "2px solid #e2e8f0",
            background: filter === s ? "#ede9fe" : "white",
            color: filter === s ? "#6366f1" : "#64748b",
            cursor: "pointer"
          }}>{s}</button>
        ))}
        <input
          type="text"
          placeholder="Search by filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: "auto", padding: "6px 14px", borderRadius: 20,
            border: "2px solid #e2e8f0", fontSize: 13, outline: "none", minWidth: 200
          }}
        />
      </div>

      {/* Recordings table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 130px 110px",
          padding: "12px 20px", background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0", fontSize: 12,
          fontWeight: 700, color: "#64748b", textTransform: "uppercase"
        }}>
          <span>Filename</span>
          <span>Language</span>
          <span>Status</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            No recordings match this filter
          </div>
        ) : (
          filtered.map((rec, i) => (
            <div key={rec.id} style={{
              display: "grid", gridTemplateColumns: "1fr 130px 110px",
              padding: "12px 20px", fontSize: 14,
              borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
              background: i % 2 === 0 ? "white" : "#fafafa"
            }}>
              <span style={{
                color: "#0f172a", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>
                {rec.filename}
                {rec.errorMessage && (
                  <span title={rec.errorMessage} style={{ color: "#ef4444", marginLeft: 8, fontSize: 11 }}>
                    ⚠ {rec.errorMessage.slice(0, 40)}...
                  </span>
                )}
              </span>
              <span style={{ color: "#64748b", fontSize: 13 }}>
                {rec.languageDetected ? rec.languageDetected.toUpperCase() : "—"}
              </span>
              <span style={{
                color: statusColor[rec.status] || "#64748b",
                fontWeight: 600, fontSize: 12
              }}>
                {rec.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
