import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin inbox",
};

export const dynamic = "force-dynamic";

export default function AdminInboxPage() {
  redirect("/demo/admin?view=inbox");
}
