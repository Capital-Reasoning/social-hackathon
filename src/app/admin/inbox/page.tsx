import { AdminFrame, AdminInboxView } from "@/views/admin";

export const metadata = {
  title: "Admin inbox",
};

export const dynamic = "force-dynamic";

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    draft?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const draftId = Array.isArray(params.draft) ? params.draft[0] : params.draft;

  return (
    <AdminFrame active="inbox">
      <AdminInboxView draftId={draftId} />
    </AdminFrame>
  );
}
