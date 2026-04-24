import { redirect } from "next/navigation";

export const metadata = {
  title: "Request food",
};

export default function PublicRequestPage() {
  redirect("/demo/public?view=request");
}
