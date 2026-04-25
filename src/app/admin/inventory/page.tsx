import { AdminFrame, AdminInventoryView } from "@/views/admin";

export const metadata = {
  title: "Inventory",
};

export const dynamic = "force-dynamic";

export default function AdminInventoryPage() {
  return (
    <AdminFrame active="inventory">
      <AdminInventoryView />
    </AdminFrame>
  );
}
