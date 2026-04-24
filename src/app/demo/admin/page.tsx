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

function AdminView({
  draftId,
  view,
}: {
  draftId?: string | null;
  view: AdminNavKey;
}) {
  if (view === "inbox") {
    return <AdminInboxView demoMode draftId={draftId} />;
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
  searchParams: Promise<{
    draft?: string | string[];
    view?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const view = adminViewFromParam(params.view);
  const draftId = Array.isArray(params.draft) ? params.draft[0] : params.draft;

  return (
    <DemoShell activeRole="admin">
      <AdminFrame active={view} demoMode>
        <AdminView draftId={draftId} view={view} />
      </AdminFrame>
    </DemoShell>
  );
}
