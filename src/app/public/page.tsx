import { PublicFrame, PublicLandingView } from "@/views/public";

export const metadata = {
  title: "Public intake",
};

export default function PublicPage() {
  return (
    <PublicFrame active="home">
      <PublicLandingView />
    </PublicFrame>
  );
}
