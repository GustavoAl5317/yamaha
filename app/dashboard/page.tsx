import { redirect } from "next/navigation";

// Rota antiga — mantém links existentes funcionando.
export default function DashboardIndex() {
  redirect("/dashboard/help-desk");
}
