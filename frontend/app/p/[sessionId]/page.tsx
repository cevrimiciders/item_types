"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.anket.olcme.tr";

type Task =
  | {
      id: string;
      type: "paired_comparison";
      prompt: string;
      left: { id: string; text: string };
      right: { id: string; text: string };
    }
  | any;

export default function ParticipantRunner() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const [taskIndex, setTaskIndex] = useState(0);

  const tasks: Task[] = useMemo(() => {
    const spec = session?.instrument?.spec;
    const block = spec?.blocks?.[0];
    return block?.tasks || [];
  }, [session]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/sessions/${sessionId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((j) => { setSession(j); setErr(null); })
      .catch(() => setErr("Session okunamadı (API erişimi veya session_id hatalı olabilir)."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function submitChoice(taskId: string, choice: "left" | "right") {
    const payload = {
      session_id: Number(sessionId),
      task_id: taskId,
      payload: { choice, rt_ms: null }
    };

    const res = await fetch(`${API_BASE}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setErr("Yanıt kaydedilemedi.");
      return;
    }

    // bir sonraki task
    if (taskIndex + 1 < tasks.length) setTaskIndex(taskIndex + 1);
    else setErr("Teşekkürler! (MVP) Anket tamamlandı.");
  }

  if (loading) {
    return <main style={{ padding: 24 }}>Yükleniyor…</main>;
  }

  if (err && !session) {
    return <main style={{ padding: 24, color: "crimson" }}>{err}</main>;
  }

  const task = tasks[taskIndex];

  if (!task) {
    return <main style={{ padding: 24 }}>Bu session’da task bulunamadı.</main>;
  }

  if (task.type !== "paired_comparison") {
    return <main style={{ padding: 24 }}>Şimdilik sadece paired_comparison destekleniyor.</main>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 6 }}>{session.instrument.name}</h1>
      <div style={{ opacity: 0.7, marginBottom: 18 }}>
        Soru {taskIndex + 1} / {tasks.length}
      </div>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>{task.prompt}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            onClick={() => submitChoice(task.id, "left")}
            style={{ padding: 16, borderRadius: 12, border: "1px solid #ccc", fontSize: 16, cursor: "pointer" }}
          >
            {task.left.text}
          </button>

          <button
            onClick={() => submitChoice(task.id, "right")}
            style={{ padding: 16, borderRadius: 12, border: "1px solid #ccc", fontSize: 16, cursor: "pointer" }}
          >
            {task.right.text}
          </button>
        </div>
      </div>

      {err && (
        <p style={{ marginTop: 16, color: err.includes("Teşekkürler") ? "green" : "crimson" }}>
          {err}
        </p>
      )}
    </main>
  );
}
