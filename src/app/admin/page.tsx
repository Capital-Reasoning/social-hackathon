import { AdminDashboardView, AdminFrame } from "@/views/admin";

export const metadata = {
  title: "Admin dashboard",
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <AdminFrame active="dashboard">
      <AdminDashboardView />
    </AdminFrame>
  );
}
