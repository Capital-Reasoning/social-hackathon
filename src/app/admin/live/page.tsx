import { redirect } from "next/navigation";

export const metadata = {
  title: "Routes",
};

export const dynamic = "force-dynamic";

export default function AdminLivePage() {
  redirect("/demo/admin?view=routes");
}
