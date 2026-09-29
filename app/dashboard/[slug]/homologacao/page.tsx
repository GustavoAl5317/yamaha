import { notFound } from "next/navigation";
import DashboardView from "@/components/dashboard/DashboardView";
import { getDashboard } from "@/lib/dashboards";

export const dynamic = "force-dynamic";

// Homologação — área de validação com o cliente antes de publicar na rota principal.
export default function DashboardSlugHomologacaoPage({ params }: { params: { slug: string } }) {
  const cfg = getDashboard(params.slug);
  if (!cfg) notFound();

  return <DashboardView homolog badge="Homologação" csqId={cfg.csqId} title={cfg.title} blocks={cfg.blocks} />;
}
