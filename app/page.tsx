"use client";
import { useEffect, useState } from "react";

interface Job {
  id: string;
  name: string;
  status: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  createdAt: string;
}

const statusIcons: Record<string, string> = {
  PENDING: "⏳",
  DOWNLOADING: "⬇️",
  PROCESSING: "⚙️",
  COMPLETED: "✅",
  FAILED: "❌",
};

export default function HomePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this job and all its transcripts?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    fetchJobs();
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
          Transcription Jobs
        </h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          Batch transcription with speaker diarization powered by Soniox
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
          <p>Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 80 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎙️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
            No transcription jobs yet
          </h2>
          <p style={{ color: "#64748b", marginBottom: 24 }}>
            Create your first job by pasting a Google Drive folder link
          </p>
          <a href="/new" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "white", textDecoration: "none",
            padding: "12px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15
          }}>
            Create First Job
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {jobs.map((job) => {
            const pct = job.totalFiles > 0
              ? Math.round((job.processedFiles / job.totalFiles) * 100)
              : 0;
            const isActive = ["DOWNLOADING", "PROCESSING"].includes(job.status);
            return (
              <div key={job.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{job.name}</h2>
                      <span className={`status-badge status-${job.status}`}>
                        {isActive && <span className="pulse-dot" style={{ display: "inline" }}>●&nbsp;</span>}
                        {statusIcons[job.status]} {job.status}
                      </span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>
                      {job.processedFiles} / {job.totalFiles} files processed
                      {job.failedFiles > 0 && (
                        <span style={{ color: "#ef4444", marginLeft: 8 }}>
                          • {job.failedFiles} failed
                        </span>
                      )}
                      <span style={{ marginLeft: 12 }}>
                        Created {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{pct}% complete</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginLeft: 20, flexShrink: 0 }}>
                    <a href={`/jobs/${job.id}`} style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: "#f1f5f9", color: "#0f172a", textDecoration: "none"
                    }}>View Details</a>
                    {job.status === "COMPLETED" && (
                      <a href={`/api/jobs/${job.id}/download`} style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        color: "white", textDecoration: "none"
                      }}>⬇ ZIP</a>
                    )}
                    <button onClick={() => deleteJob(job.id)} style={{
                      padding: "8px 12px", borderRadius: 8, fontSize: 13,
                      background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer"
                    }}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
