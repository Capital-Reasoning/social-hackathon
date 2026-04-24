import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin dashboard",
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  redirect("/demo/admin");
}
