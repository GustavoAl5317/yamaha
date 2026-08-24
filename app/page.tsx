import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard/help-desk");
}
