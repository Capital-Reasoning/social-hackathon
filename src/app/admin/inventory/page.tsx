import { redirect } from "next/navigation";

export const metadata = {
  title: "Inventory",
};

export const dynamic = "force-dynamic";

export default function AdminInventoryPage() {
  redirect("/demo/admin?view=inventory");
}
