import { PublicFrame, PublicVolunteerView } from "@/views/public";

export const metadata = {
  title: "Volunteer",
};

export default function PublicVolunteerPage() {
  return (
    <PublicFrame active="volunteer">
      <PublicVolunteerView />
    </PublicFrame>
  );
}
