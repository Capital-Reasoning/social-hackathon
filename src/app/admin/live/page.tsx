import { AdminFrame, AdminRoutesView } from "@/views/admin";

export const metadata = {
  title: "Routes",
};

export const dynamic = "force-dynamic";

export default function AdminLivePage() {
  return (
    <AdminFrame active="routes">
      <AdminRoutesView />
    </AdminFrame>
  );
}
