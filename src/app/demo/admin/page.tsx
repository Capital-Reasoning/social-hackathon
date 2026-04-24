import { DemoShell } from "@/components/mealflo/demo-shell";
import {
  AdminDashboardView,
  AdminFrame,
  AdminInboxView,
  AdminInventoryView,
  AdminRoutesView,
  type AdminNavKey,
} from "@/views/admin";

export const metadata = {
  title: "Admin demo",
};

export const dynamic = "force-dynamic";

function adminViewFromParam(value?: string | string[]): AdminNavKey {
  const view = Array.isArray(value) ? value[0] : value;

  if (view === "inbox" || view === "routes" || view === "inventory") {
    return view;
  }

  return "dashboard";
}

function AdminView({ view }: { view: AdminNavKey }) {
  if (view === "inbox") {
    return <AdminInboxView demoMode />;
  }

  if (view === "routes") {
    return <AdminRoutesView />;
  }

  if (view === "inventory") {
    return <AdminInventoryView />;
  }

  return <AdminDashboardView />;
}

export default async function DemoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const params = await searchParams;
  const view = adminViewFromParam(params.view);

  return (
    <DemoShell activeRole="admin">
      <AdminFrame active={view} demoMode>
        <AdminView view={view} />
      </AdminFrame>
    </DemoShell>
  );
}
