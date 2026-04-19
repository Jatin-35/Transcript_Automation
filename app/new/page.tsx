"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, driveUrl, googleApiKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error + (data.detail ? `\n${data.detail}` : ""));
        return;
      }
      router.push(`/jobs/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <a href="/" style={{ color: "#6366f1", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
          ← Back to Jobs
        </a>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 12, marginBottom: 6 }}>
          Create New Transcription Job
        </h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          Point to a Google Drive folder of MP3 recordings and we'll handle the rest.
        </p>
      </div>

      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#374151", fontSize: 14 }}>
              Job Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Calls - April 2024"
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", fontSize: 15, outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#374151", fontSize: 14 }}>
              Google Drive Folder URL *
            </label>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", fontSize: 15, outline: "none"
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              Make sure the folder is set to "Anyone with the link can view"
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6, color: "#374151", fontSize: 14 }}>
              Google API Key *
            </label>
            <input
              type="text"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              placeholder="AIza..."
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1.5px solid #e2e8f0", fontSize: 15, outline: "none",
                fontFamily: "monospace"
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              Create one at console.cloud.google.com → APIs → Drive API → Credentials
            </p>
          </div>

          {error && (
            <div style={{
              background: "#fee2e2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "12px 16px", color: "#dc2626",
              fontSize: 14, whiteSpace: "pre-wrap"
            }}>
              {error}
            </div>
          )}

          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#166534"
          }}>
            <strong>What happens next:</strong>
            <ul style={{ margin: "6px 0 0 16px", paddingLeft: 0 }}>
              <li>We scan your Drive folder and find all MP3 files</li>
              <li>Each file is transcribed with Soniox (with speaker diarization)</li>
              <li>South Indian languages are translated to Hindi/English mix via Azure OpenAI</li>
              <li>Each recording gets its own .docx file, downloadable as ZIP</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ fontSize: 16, padding: "12px 24px", borderRadius: 10 }}
          >
            {loading ? "Scanning Drive folder..." : "Create Job & Start Processing"}
          </button>
        </form>
      </div>
    </div>
  );
}
