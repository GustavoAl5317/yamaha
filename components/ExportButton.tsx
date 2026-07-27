"use client";
import { Download, FileJson, Printer } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function ExportButton({ queueId }: { queueId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn btn--primary" onClick={() => setOpen((v) => !v)}>
        <Download size={15} /> Exportar relatório
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "110%", background: "var(--raised)", border: "1px solid var(--line)", borderRadius: 10, padding: 6, minWidth: 200, zIndex: 20, boxShadow: "var(--shadow)" }}>
          <a className="btn" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4, border: "none", background: "transparent" }} href={`/api/report?queueId=${queueId}&format=csv`}>
            <Download size={14} /> Baixar CSV
          </a>
          <a className="btn" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4, border: "none", background: "transparent" }} href={`/api/report?queueId=${queueId}&format=json`} target="_blank">
            <FileJson size={14} /> Ver JSON
          </a>
          <button className="btn" style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "transparent" }} onClick={() => { setOpen(false); window.print(); }}>
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      )}
    </div>
  );
}
