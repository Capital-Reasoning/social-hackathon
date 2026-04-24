import { redirect } from "next/navigation";

export const metadata = {
  title: "Volunteer",
};

export default function PublicVolunteerPage() {
  redirect("/demo/public?view=volunteer");
}
