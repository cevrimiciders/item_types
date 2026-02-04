const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.anket.olcme.tr";

export default async function Home() {
  let health: any = null;
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    health = await res.json();
  } catch (e) {
    health = { ok: false, error: "API erişilemiyor" };
  }

  return (
    <main style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Ölçme Lab (MVP)</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Paired Comparison, MaxDiff ve Forced-Choice tabanlı anketler için altyapı.
      </p>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>API Sağlık</h2>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8, overflowX: "auto" }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        Sonraki adım: Araştırmacı paneli + katılımcı “runner” ekranı.
      </p>
    </main>
  );
}
