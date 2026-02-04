export const dynamic = "force-dynamic";
export const revalidate = 0;

"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.anket.olcme.tr";
const APP_BASE =
  process.env.NEXT_PUBLIC_APP_BASE ||
  (typeof window !== "undefined" ? window.location.origin : "https://anket.olcme.tr");

type Study = { id: number; title: string };
type Instrument = { id: number; study_id: number; name: string };

function saveToken(t: string) {
  localStorage.setItem("olcme_token", t);
}
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("olcme_token") : null;
}
function clearToken() {
  localStorage.removeItem("olcme_token");
}

async function api<T>(path: string, opts: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.headers) Object.assign(headers, opts.headers as any);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/** --- Spec şablonları (MVP) --- */
function pairedSpec5() {
  return {
    version: "0.1",
    blocks: [
      {
        id: "main",
        title: "Karşılaştırma Görevleri",
        tasks: [
          {
            id: "pc_1",
            type: "paired_comparison",
            prompt: "Hangisi sana daha çok uyuyor?",
            left: { id: "a1", text: "Belirsizlik olsa da harekete geçerim." },
            right: { id: "a2", text: "Netleşmeden adım atmayı sevmem." },
          },
          {
            id: "pc_2",
            type: "paired_comparison",
            prompt: "Hangisi sana daha yakın?",
            left: { id: "b1", text: "Hızlı karar veririm; sonra düzeltirim." },
            right: { id: "b2", text: "Yavaş karar veririm; sonra değiştirmem." },
          },
          {
            id: "pc_3",
            type: "paired_comparison",
            prompt: "Hangisi daha doğru tarif eder?",
            left: { id: "c1", text: "Yeni fikirlere kolayca ısınırım." },
            right: { id: "c2", text: "Yeni fikirlere temkinli yaklaşırım." },
          },
          {
            id: "pc_4",
            type: "paired_comparison",
            prompt: "Hangisi sana daha çok uyar?",
            left: { id: "d1", text: "Risk almak beni canlı tutar." },
            right: { id: "d2", text: "Güvenli seçenekler beni rahatlatır." },
          },
          {
            id: "pc_5",
            type: "paired_comparison",
            prompt: "Hangisine daha çok katılırsın?",
            left: { id: "e1", text: "Planlarım sık değişebilir." },
            right: { id: "e2", text: "Planlarıma sadık kalmayı tercih ederim." },
          },
        ],
      },
    ],
  };
}

// MaxDiff ve Forced-choice şimdilik “spec olarak saklanacak”; runner’ını bir sonraki adımda ekleriz.
function maxdiffSpecDemo() {
  return {
    version: "0.1",
    blocks: [
      {
        id: "main",
        title: "MaxDiff Demo",
        tasks: [
          {
            id: "md_1",
            type: "maxdiff",
            prompt: "Aşağıdakilerden EN uygun ve EN uygunsuz olanı seç.",
            items: [
              { id: "m1", text: "Hız" },
              { id: "m2", text: "Güvenilirlik" },
              { id: "m3", text: "Yaratıcılık" },
              { id: "m4", text: "Düzen" },
            ],
          },
        ],
      },
    ],
  };
}

function forcedChoiceSpecDemo() {
  return {
    version: "0.1",
    blocks: [
      {
        id: "main",
        title: "Forced-Choice Demo",
        tasks: [
          {
            id: "fc_1",
            type: "forced_choice",
            prompt: "Hangisi daha çok sana benziyor?",
            statements: [
              { id: "s1", text: "İnsanlarla hızlıca bağ kurarım." },
              { id: "s2", text: "Karar vermeden önce epey düşünürüm." },
              { id: "s3", text: "Bir işi bitirmeden rahat edemem." },
              { id: "s4", text: "Yeni fikirlere meraklıyımdır." },
            ],
            pick: 2
          },
        ],
      },
    ],
  };
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  // login
  const [email, setEmail] = useState("murat@olcme.tr");
  const [password, setPassword] = useState("");

  // data
  const [studies, setStudies] = useState<Study[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);

  // create study
  const [studyTitle, setStudyTitle] = useState("Ölçme Lab Pilot 1");
  const [selectedStudyId, setSelectedStudyId] = useState<number | null>(null);

  // create instrument
  const [instrumentName, setInstrumentName] = useState("Pilot Instrument");
  const [template, setTemplate] = useState<"paired" | "maxdiff" | "forced">("paired");

  // create session result
  const [sessionId, setSessionId] = useState<number | null>(null);
  const participantLink = useMemo(() => {
    if (!sessionId) return null;
    return `${APP_BASE}/p/${sessionId}`;
  }, [sessionId]);

  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (t) setToken(t);
  }, []);

  async function refreshAll(t: string) {
    const s = await api<Study[]>("/studies", { method: "GET" }, t);
    setStudies(s);
    if (!selectedStudyId && s[0]) setSelectedStudyId(s[0].id);

    const ins = await api<Instrument[]>("/instruments", { method: "GET" }, t);
    setInstruments(ins);
  }

    async function doLogin() {
    try {
      setStatus("Giriş yapılıyor…");

      const r = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveToken(r.access_token);
      setToken(r.access_token);
      setStatus("Giriş başarılı.");
      await refreshAll(r.access_token);
    } catch (e: any) {
      console.error(e);
      setStatus(`Giriş hatası: ${e?.message ?? e}`);
    }
  }


  async function doLogout() {
    clearToken();
    setToken(null);
    setStudies([]);
    setInstruments([]);
    setSessionId(null);
    setStatus("Çıkış yapıldı.");
  }

  async function createStudy() {
    if (!token) return;
    setStatus("Study oluşturuluyor…");
    const s = await api<Study>("/studies", {
      method: "POST",
      body: JSON.stringify({ title: studyTitle }),
    }, token);
    setStatus(`Study oluşturuldu (id=${s.id}).`);
    await refreshAll(token);
    setSelectedStudyId(s.id);
  }

  async function createInstrument() {
    if (!token) return;
    if (!selectedStudyId) {
      setStatus("Önce bir study seçmelisin.");
      return;
    }
    setStatus("Instrument oluşturuluyor…");

    const spec =
      template === "paired" ? pairedSpec5() :
      template === "maxdiff" ? maxdiffSpecDemo() :
      forcedChoiceSpecDemo();

    const created = await api<Instrument>("/instruments", {
      method: "POST",
      body: JSON.stringify({
        study_id: selectedStudyId,
        name: instrumentName,
        spec,
      }),
    }, token);

    setStatus(`Instrument oluşturuldu (id=${created.id}).`);
    await refreshAll(token);
  }

  async function createSession(instrumentId: number) {
    setStatus("Session oluşturuluyor…");
    const r = await api<{ session_id: number; participant_id: string }>("/sessions", {
      method: "POST",
      body: JSON.stringify({ instrument_id: instrumentId }),
    });
    setSessionId(r.session_id);
    setStatus(`Session hazır (session_id=${r.session_id}). Link kopyalayabilirsin.`);
  }

    async function deleteInstrument(instrumentId: number) {
    if (!token) return;
    const ok = confirm("Instrument silinsin mi? (MVP: bağlı session/response varsa backend'de silme eklemek gerekir)");
    if (!ok) return;

    try {
      setStatus("Instrument siliniyor…");
      await api(`/instruments/${instrumentId}`, { method: "DELETE" }, token);
      setInstruments((prev) => prev.filter((x) => x.id !== instrumentId));
      setStatus("Instrument silindi.");
    } catch (e: any) {
      setStatus(`Hata: ${e.message}`);
    }
  }




  async function copyLink() {
    if (!participantLink) return;
    await navigator.clipboard.writeText(participantLink);
    setStatus("Link panoya kopyalandı.");
  }

  useEffect(() => {
    if (token) refreshAll(token).catch((e) => setStatus(`Hata: ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Ölçme Lab — Admin Edit-Sİl-TEST</h1>
          <div style={{ opacity: 0.7, marginTop: 6 }}>Study • Instrument • Session (MVP)</div>
        </div>
        {token ? (
          <button onClick={doLogout} style={btnGhost}>Çıkış</button>
        ) : (
          <a href="/docs" style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>API Docs</a>
        )}
      </header>

      {status && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e5e5", borderRadius: 12, background: "#fafafa" }}>
          {status}
        </div>
      )}

      {!token ? (
        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Giriş</h2>
          <div style={grid2}>
            <label style={label}>
              E-posta
              <input value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
            </label>
            <label style={label}>
              Şifre
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={input} />
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={doLogin} style={btnPrimary}>Giriş Yap</button>
          </div>
          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
            Not: Token tarayıcıda saklanır (MVP). İstersen sonraki adımda “admin user / role” yapısını ekleriz.
          </div>
        </section>
      ) : (
        <>
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Study</h2>
            <div style={grid2}>
              <label style={label}>
                Yeni study başlığı
                <input value={studyTitle} onChange={(e) => setStudyTitle(e.target.value)} style={input} />
              </label>
              <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                <button onClick={createStudy} style={btnPrimary}>Study Oluştur</button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Mevcut studies</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {studies.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudyId(s.id)}
                    style={{
                      ...chip,
                      borderColor: selectedStudyId === s.id ? "#111" : "#ddd",
                      background: selectedStudyId === s.id ? "#111" : "#fff",
                      color: selectedStudyId === s.id ? "#fff" : "#111",
                    }}
                  >
                    #{s.id} · {s.title}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Instrument</h2>
            <div style={grid2}>
              <label style={label}>
                Instrument adı
                <input value={instrumentName} onChange={(e) => setInstrumentName(e.target.value)} style={input} />
              </label>

              <label style={label}>
                Şablon
                <select value={template} onChange={(e) => setTemplate(e.target.value as any)} style={input}>
                  <option value="paired">Paired Comparison (çalışır)</option>
                  <option value="maxdiff">MaxDiff (spec saklanır)</option>
                  <option value="forced">Forced-Choice (spec saklanır)</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={createInstrument} style={btnPrimary}>Instrument Oluştur</button>
              <div style={{ opacity: 0.7, fontSize: 13 }}>
                Seçili study_id: <b>{selectedStudyId ?? "—"}</b>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Mevcut instruments</div>
              <div style={{ display: "grid", gap: 10 }}>
                {instruments
                  .filter((i) => !selectedStudyId || i.study_id === selectedStudyId)
                  .map((i) => (
                    <div key={i.id} style={rowCard}>
  <div>
    <div style={{ fontWeight: 700 }}>{i.name}</div>
    <div style={{ opacity: 0.7, fontSize: 13 }}>
      instrument_id: {i.id} · study_id: {i.study_id}
    </div>
  </div>

  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <a
      href={`/admin/instruments/${i.id}`}
      style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}
    >
      Edit
    </a>

    <button onClick={() => createSession(i.id)} style={btnSecondary}>
      Session Üret
    </button>

    <button onClick={() => deleteInstrument(i.id)} style={btnDanger}>
      Sil
    </button>
  </div>
</div>

                  ))}
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={{ marginTop: 0 }}>Katılımcı Linki</h2>
            {participantLink ? (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <code style={codeBox}>{participantLink}</code>
                  <button onClick={copyLink} style={btnSecondary}>Kopyala</button>
                  <a href={participantLink} target="_blank" rel="noreferrer" style={{ ...btnGhost, textDecoration: "none" }}>
                    Aç
                  </a>
                </div>
                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
                  Linki paylaştığında katılımcı direkt ankete düşer. (Session bazlı.)
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.7 }}>Bir instrument için “Session Üret” butonuna basınca link burada çıkacak.</div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

/** --- Minimal UI styles --- */
const card: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  border: "1px solid #e7e7e7",
  borderRadius: 16,
  background: "#fff",
};

const rowCard: React.CSSProperties = {
  padding: 12,
  border: "1px solid #eee",
  borderRadius: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  opacity: 0.9,
};

const input: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #dcdcdc",
  outline: "none",
  fontSize: 14,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #111",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};

const btnGhost: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};

const chip: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};

const codeBox: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e5e5",
  background: "#fafafa",
  display: "inline-block",
  maxWidth: "100%",
  overflowX: "auto",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #f1c4c4",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};

