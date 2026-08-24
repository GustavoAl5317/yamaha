import DashboardView from "@/components/dashboard/DashboardView";

// Homologação — ajustes em validação com o cliente:
// ordem dos meses (anterior → atual), quantidade acima das colunas,
// nível de serviço iniciando em 100% e nomes padronizados.
export default function HelpDeskHomologacaoPage() {
  return <DashboardView homolog />;
}
