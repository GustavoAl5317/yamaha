import { redirect } from "next/navigation";

// Rota antiga — mantém links existentes funcionando.
export default function HomologacaoIndex() {
  redirect("/dashboard/help-desk/homologacao");
}
