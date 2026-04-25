import { PublicFrame, PublicRequestView } from "@/views/public";

export const metadata = {
  title: "Request food",
};

export default function PublicRequestPage() {
  return (
    <PublicFrame active="request">
      <PublicRequestView />
    </PublicFrame>
  );
}
