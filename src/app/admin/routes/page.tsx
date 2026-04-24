import { redirect } from "next/navigation";

export const metadata = {
  title: "Routes",
};

export const dynamic = "force-dynamic";

export default function AdminRoutesPage() {
  redirect("/demo/admin?view=routes");
}
