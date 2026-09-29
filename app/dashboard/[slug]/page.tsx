import { notFound } from "next/navigation";
import DashboardView from "@/components/dashboard/DashboardView";
import { getDashboard } from "@/lib/dashboards";

export const dynamic = "force-dynamic";

// Painel do cliente. O que aparece vem do cadastro feito em /admin.
export default function DashboardSlugPage({ params }: { params: { slug: string } }) {
  const cfg = getDashboard(params.slug);
  if (!cfg || !cfg.enabled) notFound();

  return <DashboardView homolog csqId={cfg.csqId} title={cfg.title} blocks={cfg.blocks} />;
}
