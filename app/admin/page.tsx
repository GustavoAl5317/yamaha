"use client";
import { useCallback, useEffect, useState } from "react";
import type { QueueConfig } from "@/lib/types";
import { BLOCK_LABELS, DEFAULT_BLOCKS, type DashboardBlocks } from "@/lib/dashboard-blocks";
import {
  LayoutDashboard, Plus, Link2, Check, Trash2, Lock, LogOut, AlertTriangle, ExternalLink,
} from "lucide-react";

interface DashboardCfg {
  slug: string; title: string; csqId: string; csqName: string;
  enabled: boolean; blocks: DashboardBlocks; createdAt: string;
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [list, setList] = useState<DashboardCfg[]>([]);
  const [queues, setQueues] = useState<QueueConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newQueue, setNewQueue] = useState("");
  const [newBlocks, setNewBlocks] = useState<DashboardBlocks>({ ...DEFAULT_BLOCKS });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session").then((r) => r.json()).then((j) => {
      setEnabled(j.enabled); setAuthed(j.authenticated); setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const load = useCallback(() => {
    fetch("/api/admin/dashboards", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (j.ok) { setList(j.dashboards); setError(null); }
      else { setError(j.error); if (j.error === "Não autorizado") setAuthed(false); }
    }).catch((e) => setError(String(e)));
    fetch("/api/queues").then((r) => r.json()).then((j) => {
      if (j.ok) setQueues(j.queues);
    }).catch(() => {});
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const r = await fetch("/api/admin/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j = await r.json();
    if (j.ok) { setPassword(""); setAuthed(true); }
    else setLoginError(j.error || "Falha no login");
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthed(false); setList([]);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const q = queues.find((x) => x.id === newQueue);
    if (!newTitle.trim() || !q) { setError("Informe o nome e a fila."); return; }
    setCreating(true);
    const r = await fetch("/api/admin/dashboards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), csqId: q.id, csqName: q.name, blocks: newBlocks }),
    });
    const j = await r.json();
    setCreating(false);
    if (!j.ok) { setError(j.error); return; }
    setNewTitle(""); setNewQueue(""); setNewBlocks({ ...DEFAULT_BLOCKS });
    setError(null);
    load();
  }

  async function patch(slug: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/dashboards/${slug}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!j.ok) { setError(j.error); return; }
    setList((cur) => cur.map((d) => (d.slug === slug ? j.dashboard : d)));
  }

  async function remove(slug: string, title: string) {
    if (!confirm(`Remover o dashboard "${title}"? O link sai do ar.`)) return;
    const r = await fetch(`/api/admin/dashboards/${slug}`, { method: "DELETE" });
    const j = await r.json();
    if (!j.ok) { setError(j.error); return; }
    setList((cur) => cur.filter((d) => d.slug !== slug));
  }

  function linkFor(slug: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/dashboard/${slug}`;
  }

  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(linkFor(slug));
      setCopied(slug);
      setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
    } catch { /* clipboard bloqueado: o link fica visível na tela */ }
  }

  if (!ready) return <div className="dash-full"><div className="panel"><div className="empty"><div className="spinner" /></div></div></div>;

  if (!enabled) return (
    <div className="dash-full">
      <div className="panel"><div className="empty">
        <div className="ico"><AlertTriangle color="var(--crit)" /></div>
        <h4>Painel admin desativado</h4>
        <p>Defina <code>ADMIN_PASSWORD</code> no <code>.env.local</code> do servidor e reinicie a aplicação.</p>
      </div></div>
    </div>
  );

  if (!authed) return (
    <div className="dash-full">
      <div className="admin-login panel">
        <div className="panel__hd"><h3><Lock size={14} /> Painel administrativo</h3></div>
        <form onSubmit={login} className="admin-form">
          <label className="admin-field">
            <span>Senha</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
          {loginError && <p className="admin-error">{loginError}</p>}
          <button className="admin-btn admin-btn--primary" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="dash-full">
      <header className="noc-head admin-head">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/yamaha-logo.png" alt="Yamaha" className="noc-logo" style={{ height: 48, objectFit: "contain", background: "white", padding: "4px 10px", borderRadius: 8 }} />
          <h1 className="noc-title" style={{ fontSize: "1.6rem", margin: 0 }}>Painel administrativo</h1>
        </div>
        <button className="admin-btn" onClick={logout}><LogOut size={14} /> Sair</button>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <div className="grid">
        {/* Liberar novo dashboard */}
        <div className="panel panel--wide">
          <div className="panel__hd"><h3><Plus size={14} /> Liberar novo dashboard</h3></div>
          <form onSubmit={create} className="admin-form">
            <label className="admin-field">
              <span>Nome para o cliente</span>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex.: Fila Atendimento Concessionárias" />
            </label>
            <label className="admin-field">
              <span>Fila (CSQ)</span>
              <select value={newQueue} onChange={(e) => setNewQueue(e.target.value)}>
                <option value="">Selecione a fila…</option>
                {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </label>
            <fieldset className="admin-blocks">
              <legend>Blocos que o cliente vê</legend>
              {BLOCK_LABELS.map(({ key, label }) => (
                <label key={key} className="admin-check">
                  <input type="checkbox" checked={newBlocks[key]}
                    onChange={(e) => setNewBlocks((b) => ({ ...b, [key]: e.target.checked }))} />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <button className="admin-btn admin-btn--primary" type="submit" disabled={creating}>
              {creating ? "Liberando…" : "Liberar e gerar link"}
            </button>
          </form>
        </div>

        {/* Dashboards liberados */}
        <div className="panel panel--wide">
          <div className="panel__hd">
            <h3><LayoutDashboard size={14} /> Dashboards liberados</h3>
            <span className="chip chip--live">{list.length}</span>
          </div>
          {list.length === 0 ? (
            <div className="empty"><div className="ico"><LayoutDashboard /></div><p>Nenhum dashboard liberado ainda.</p></div>
          ) : (
            <ul className="admin-list">
              {list.map((d) => (
                <li key={d.slug} className={"admin-item" + (d.enabled ? "" : " admin-item--off")}>
                  <div className="admin-item__hd">
                    <div>
                      <strong>{d.title}</strong>
                      <span className="admin-queue">{d.csqName}</span>
                    </div>
                    <div className="admin-actions">
                      <label className="admin-check">
                        <input type="checkbox" checked={d.enabled}
                          onChange={(e) => patch(d.slug, { enabled: e.target.checked })} />
                        <span>{d.enabled ? "No ar" : "Fora do ar"}</span>
                      </label>
                      <button className="admin-btn" onClick={() => copyLink(d.slug)} title="Copiar link">
                        {copied === d.slug ? <><Check size={14} /> Copiado</> : <><Link2 size={14} /> Copiar link</>}
                      </button>
                      <a className="admin-btn" href={`/dashboard/${d.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir</a>
                      <button className="admin-btn admin-btn--danger" onClick={() => remove(d.slug, d.title)} title="Remover">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <code className="admin-link">{linkFor(d.slug)}</code>
                  <div className="admin-blocks admin-blocks--inline">
                    {BLOCK_LABELS.map(({ key, label }) => (
                      <label key={key} className="admin-check">
                        <input type="checkbox" checked={d.blocks[key]}
                          onChange={(e) => patch(d.slug, { blocks: { [key]: e.target.checked } })} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
