"use client";
import { useCallback, useEffect, useState } from "react";
import type { QueueConfig } from "@/lib/types";
import { BLOCK_LABELS, DEFAULT_BLOCKS, type DashboardBlocks } from "@/lib/dashboard-blocks";
import {
  LayoutDashboard, Plus, Link2, Check, Trash2, Lock, LogOut, AlertTriangle,
  ExternalLink, Radio, PauseCircle, SlidersHorizontal, ArrowRight,
} from "lucide-react";

interface DashboardCfg {
  slug: string; title: string; csqId: string; csqName: string;
  teamId?: string; teamName?: string;
  enabled: boolean; blocks: DashboardBlocks; createdAt: string;
}


export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [list, setList] = useState<DashboardCfg[]>([]);
  const [queues, setQueues] = useState<QueueConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newQueue, setNewQueue] = useState("");
  const [newBlocks, setNewBlocks] = useState<DashboardBlocks>({ ...DEFAULT_BLOCKS });
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<DashboardCfg | null>(null);

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
    setLoggingIn(true);
    const r = await fetch("/api/admin/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j = await r.json();
    setLoggingIn(false);
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
      body: JSON.stringify({
        title: newTitle.trim(), csqId: q.id, csqName: q.name,
        blocks: newBlocks,
      }),
    });
    const j = await r.json();
    setCreating(false);
    if (!j.ok) { setError(j.error); return; }
    setNewTitle(""); setNewQueue(""); setNewBlocks({ ...DEFAULT_BLOCKS });
    setError(null);
    setJustCreated(j.dashboard);
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
    setJustCreated((c) => (c?.slug === slug ? null : c));
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

  if (!ready) return (
    <div className="admin-center"><div className="spinner" /></div>
  );

  if (!enabled) return (
    <div className="admin-center">
      <div className="admin-card admin-card--narrow">
        <div className="admin-card__ico admin-card__ico--crit"><AlertTriangle size={22} /></div>
        <h2>Painel administrativo desativado</h2>
        <p className="admin-sub">
          Defina <code>ADMIN_PASSWORD</code> no <code>.env.local</code> do servidor e reinicie a aplicação.
        </p>
      </div>
    </div>
  );

  if (!authed) return (
    <div className="admin-center">
      <form onSubmit={login} className="admin-card admin-card--narrow">
        <img src="/yamaha-logo.png" alt="Yamaha" className="admin-login__logo" />
        <div className="admin-card__ico"><Lock size={20} /></div>
        <h2>Painel administrativo</h2>
        <p className="admin-sub">Central de dashboards do contact center.</p>
        <label className="admin-field">
          <span>Senha de acesso</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus placeholder="••••••••" />
        </label>
        {loginError && <p className="admin-error">{loginError}</p>}
        <button className="admin-btn admin-btn--primary admin-btn--block" type="submit" disabled={loggingIn}>
          {loggingIn ? "Entrando…" : <>Entrar <ArrowRight size={15} /></>}
        </button>
      </form>
    </div>
  );

  const online = list.filter((d) => d.enabled).length;

  return (
    <div className="admin-page">
      <header className="admin-top">
        <div className="admin-top__id">
          <img src="/yamaha-logo.png" alt="Yamaha" className="admin-top__logo" />
          <div>
            <h1>Central de dashboards</h1>
            <p>Libere um painel por cliente e escolha o que cada um enxerga.</p>
          </div>
        </div>
        <button className="admin-btn" onClick={logout}><LogOut size={14} /> Sair</button>
      </header>

      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat__ico"><LayoutDashboard size={16} /></span>
          <div><strong>{list.length}</strong><span>dashboards</span></div>
        </div>
        <div className="admin-stat admin-stat--ok">
          <span className="admin-stat__ico"><Radio size={16} /></span>
          <div><strong>{online}</strong><span>no ar</span></div>
        </div>
        <div className="admin-stat admin-stat--off">
          <span className="admin-stat__ico"><PauseCircle size={16} /></span>
          <div><strong>{list.length - online}</strong><span>pausados</span></div>
        </div>
      </div>

      {error && <p className="admin-error admin-error--bar">{error}</p>}

      <div className="admin-cols">
        {/* Liberar novo dashboard */}
        <section className="admin-card">
          <h3 className="admin-card__hd"><Plus size={15} /> Liberar novo dashboard</h3>
          <form onSubmit={create} className="admin-form">
            <label className="admin-field">
              <span>Nome para o cliente</span>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex.: Fila SAC Motor" />
            </label>
            <label className="admin-field">
              <span>Fila (CSQ)</span>
              <select value={newQueue} onChange={(e) => setNewQueue(e.target.value)}>
                <option value="">Selecione a fila…</option>
                {queues.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
              <small className="admin-hint">
                {queues.length === 0 ? "Carregando as filas do banco…" : "Os atendentes da tabela saem da skill desta fila."}
              </small>
            </label>

            <div className="admin-field">
              <span>Blocos que o cliente vê</span>
              <div className="admin-pills">
                {BLOCK_LABELS.map(({ key, label }) => (
                  <button
                    key={key} type="button"
                    className={"admin-pill" + (newBlocks[key] ? " admin-pill--on" : "")}
                    onClick={() => setNewBlocks((b) => ({ ...b, [key]: !b[key] }))}
                  >
                    <Check size={12} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <button className="admin-btn admin-btn--primary admin-btn--block" type="submit" disabled={creating}>
              {creating ? "Liberando…" : <>Liberar e gerar link <ArrowRight size={15} /></>}
            </button>
          </form>

          {justCreated && (
            <div className="admin-done">
              <strong><Check size={14} /> {justCreated.title} liberado</strong>
              <code className="admin-link">{linkFor(justCreated.slug)}</code>
              <button className="admin-btn admin-btn--primary" onClick={() => copyLink(justCreated.slug)}>
                {copied === justCreated.slug ? <><Check size={14} /> Copiado</> : <><Link2 size={14} /> Copiar link</>}
              </button>
            </div>
          )}
        </section>

        {/* Dashboards liberados */}
        <section className="admin-card">
          <h3 className="admin-card__hd">
            <LayoutDashboard size={15} /> Dashboards liberados
            <span className="admin-count">{list.length}</span>
          </h3>

          {list.length === 0 ? (
            <div className="admin-empty">
              <LayoutDashboard size={26} />
              <p>Nenhum dashboard liberado ainda.</p>
            </div>
          ) : (
            <ul className="admin-list">
              {list.map((d) => (
                <li key={d.slug} className={"admin-item" + (d.enabled ? "" : " admin-item--off")}>
                  <div className="admin-item__hd">
                    <div className="admin-item__id">
                      <span className={"admin-dot" + (d.enabled ? " admin-dot--on" : "")} />
                      <div>
                        <strong>{d.title}</strong>
                        <span className="admin-queue">{d.csqName}</span>
                      </div>
                    </div>
                    <button
                      className={"admin-switch" + (d.enabled ? " admin-switch--on" : "")}
                      onClick={() => patch(d.slug, { enabled: !d.enabled })}
                      title={d.enabled ? "Tirar do ar" : "Colocar no ar"}
                    >
                      <span className="admin-switch__knob" />
                      {d.enabled ? "No ar" : "Pausado"}
                    </button>
                  </div>

                  <div className="admin-item__link">
                    <code className="admin-link">{linkFor(d.slug)}</code>
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--sm" onClick={() => copyLink(d.slug)}>
                        {copied === d.slug ? <><Check size={13} /> Copiado</> : <><Link2 size={13} /> Copiar</>}
                      </button>
                      <a className="admin-btn admin-btn--sm" href={`/dashboard/${d.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} /> Abrir
                      </a>
                      <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => remove(d.slug, d.title)} title="Remover">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="admin-blocks">
                    <span className="admin-blocks__hd">
                      <SlidersHorizontal size={13} /> O que o cliente vê
                      <em>{BLOCK_LABELS.filter(({ key }) => d.blocks[key]).length} de {BLOCK_LABELS.length} blocos</em>
                    </span>
                    <div className="admin-pills">
                      {BLOCK_LABELS.map(({ key, label }) => (
                        <button
                          key={key} type="button"
                          className={"admin-pill" + (d.blocks[key] ? " admin-pill--on" : "")}
                          onClick={() => patch(d.slug, { blocks: { [key]: !d.blocks[key] } })}
                        >
                          <Check size={12} /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
