"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.anket.olcme.tr";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("olcme_token") : null;
}

async function api<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Task = any;

export default function InstrumentEditor() {
  const { instrumentId } = useParams() as { instrumentId: string };
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [instrument, setInstrument] = useState<any>(null);
  const [specJson, setSpecJson] = useState<string>("");
  const [status, setStatus] = useState<string | null>(null);

  const spec = useMemo(() => {
    try { return JSON.parse(specJson); } catch { return null; }
  }, [specJson]);

  const tasks: Task[] = useMemo(() => {
    const t = spec?.blocks?.[0]?.tasks;
    return Array.isArray(t) ? t : [];
  }, [spec]);

  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const ins = await api(`/instruments/${instrumentId}`, { method: "GET" }, token || undefined);
        setInstrument(ins);
        setSpecJson(JSON.stringify(ins.spec ?? {}, null, 2));
        setStatus(null);
      } catch (e: any) {
        setStatus(`Hata: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [instrumentId]);

  function updateTask(partial: any) {
    if (!spec) return;
    const next = structuredClone(spec);
    next.blocks = next.blocks || [{ id: "main", title: "Main", tasks: [] }];
    next.blocks[0].tasks = next.blocks[0].tasks || [];
    next.blocks[0].tasks[selectedIdx] = { ...next.blocks[0].tasks[selectedIdx], ...partial };
    setSpecJson(JSON.stringify(next, null, 2));
  }

  function addPairedTask() {
    if (!spec) return;
    const next = structuredClone(spec);
    next.blocks = next.blocks || [{ id: "main", title: "Main", tasks: [] }];
    next.blocks[0].tasks = next.blocks[0].tasks || [];
    const n = next.blocks[0].tasks.length + 1;
    next.blocks[0].tasks.push({
      id: `pc_${n}`,
      type: "paired_comparison",
      prompt: "Hangisi daha uygun?",
      left: { id: `l_${n}`, text: "Sol seçenek" },
      right: { id: `r_${n}`, text: "Sağ seçenek" }
    });
    setSpecJson(JSON.stringify(next, null, 2));
    setSelectedIdx(next.blocks[0].tasks.length - 1);
  }

  function deleteTask(idx: number) {
    if (!spec) return;
    const next = structuredClone(spec);
    next.blocks[0].tasks.splice(idx, 1);
    setSpecJson(JSON.stringify(next, null, 2));
    setSelectedIdx(Math.max(0, idx - 1));
  }

  async function save() {
    if (!token) { setStatus("Token yok. /admin üzerinden tekrar giriş yap."); return; }
    if (!spec) { setStatus("JSON hatalı. Düzelttikten sonra kaydet."); return; }
    setStatus("Kaydediliyor…");
    try {
      await api(`/instruments/${instrumentId}`, {
        method: "PUT",
        body: JSON.stringify({ spec })
      }, token);
      setStatus("Kaydedildi.");
    } catch (e: any) {
      setStatus(`Hata: ${e.message}`);
    }
  }

  // Results: instrument bazlı
  const [results, setResults] = useState<any[] | null>(null);
  async function loadResults() {
    if (!token) { setStatus("Token yok."); return; }
    setStatus("Sonuçlar yükleniyor…");
    try {
      const rows = await api<any[]>(`/responses/by-instrument/${instrumentId}`, { method: "GET" }, token);
      setResults(rows);
      setStatus(null);
    } catch (e: any) {
      setStatus(`Hata: ${e.message}`);
    }
  }

  if (loading) return <main style={{ padding: 24 }}>Yükleniyor…</main>;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Instrument Edit</h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            #{instrument?.id} · {instrument?.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={addPairedTask} style={btnSecondary}>+ Paired Task</button>
          <button onClick={save} style={btnPrimary}>Kaydet</button>
          <button onClick={loadResults} style={btnGhost}>Results</button>
          <a href="/admin" style={{ ...btnGhost, textDecoration: "none" }}>Admin’e dön</a>
        </div>
      </div>

      {status && <div style={notice}>{status}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 16 }}>
        {/* Left: task list */}
        <section style={card}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Tasks</div>
          {tasks.length === 0 ? (
            <div style={{ opacity: 0.7 }}>Henüz task yok. “+ Paired Task” ile ekle.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {tasks.map((t, idx) => (
                <div key={t.id || idx} style={{ ...row, borderColor: idx === selectedIdx ? "#111" : "#eee" }}>
                  <button onClick={() => setSelectedIdx(idx)} style={rowBtn}>
                    <div style={{ fontWeight: 700 }}>{t.id ?? `task_${idx+1}`}</div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{t.type}</div>
                  </button>
                  <button onClick={() => deleteTask(idx)} style={miniDanger}>×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: editor + preview + json */}
        <section style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Form (MVP: paired)</div>
              {tasks[selectedIdx]?.type === "paired_comparison" ? (
                <>
                  <label style={label}>Prompt
                    <input style={input} value={tasks[selectedIdx]?.prompt || ""} onChange={(e) => updateTask({ prompt: e.target.value })} />
                  </label>
                  <label style={label}>Left text
                    <input style={input} value={tasks[selectedIdx]?.left?.text || ""} onChange={(e) => updateTask({ left: { ...(tasks[selectedIdx].left||{}), text: e.target.value } })} />
                  </label>
                  <label style={label}>Right text
                    <input style={input} value={tasks[selectedIdx]?.right?.text || ""} onChange={(e) => updateTask({ right: { ...(tasks[selectedIdx].right||{}), text: e.target.value } })} />
                  </label>

                  <div style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
                    Örnek: MaxDiff/Forced-choice şablonları için bir sonraki adımda form alanlarını ekleyeceğiz.
                  </div>
                </>
              ) : (
                <div style={{ opacity: 0.7 }}>
                  Bu task tipi için form yok (şimdilik). JSON’dan düzenleyebilirsin.
                </div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Preview</div>
              <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
                <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 6 }}>
                  {tasks[selectedIdx]?.type}
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
                  {tasks[selectedIdx]?.prompt || "—"}
                </div>
                {tasks[selectedIdx]?.type === "paired_comparison" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={choiceCard}>{tasks[selectedIdx]?.left?.text || "—"}</div>
                    <div style={choiceCard}>{tasks[selectedIdx]?.right?.text || "—"}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Spec JSON (Gelişmiş)</div>
            <textarea
              value={specJson}
              onChange={(e) => setSpecJson(e.target.value)}
              style={{ width: "100%", minHeight: 260, borderRadius: 14, border: "1px solid #ddd", padding: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 }}
            />
          </div>

          {results && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Results (instrument #{instrumentId})</div>
              <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th style={th}>id</th>
                      <th style={th}>session_id</th>
                      <th style={th}>task_id</th>
                      <th style={th}>payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td style={td}>{r.id}</td>
                        <td style={td}>{r.session_id}</td>
                        <td style={td}>{r.task_id}</td>
                        <td style={td}><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(r.payload)}</pre></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const card: React.CSSProperties = { padding: 16, border: "1px solid #e7e7e7", borderRadius: 16, background: "#fff" };
const notice: React.CSSProperties = { marginTop: 12, padding: 12, border: "1px solid #e5e5e5", borderRadius: 14, background: "#fafafa" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, border: "1px solid #eee", borderRadius: 14, padding: 10 };
const rowBtn: React.CSSProperties = { flex: 1, textAlign: "left", border: "none", background: "transparent", cursor: "pointer" };
const miniDanger: React.CSSProperties = { border: "1px solid #f1c4c4", background: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontWeight: 800 };
const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, opacity: 0.9, marginBottom: 10 };
const input: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, border: "1px solid #dcdcdc", outline: "none", fontSize: 14 };
const btnPrimary: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer", fontWeight: 700 };
const btnSecondary: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#fff", color: "#111", cursor: "pointer", fontWeight: 700 };
const btnGhost: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", color: "#111", cursor: "pointer", fontWeight: 700 };
const choiceCard: React.CSSProperties = { padding: 14, border: "1px solid #ddd", borderRadius: 14 };
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f2f2f2", verticalAlign: "top", fontSize: 13 };
