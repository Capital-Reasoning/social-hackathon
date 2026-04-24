import { redirect } from "next/navigation";

export const metadata = {
  title: "Public intake",
};

export default function PublicPage() {
  redirect("/demo/public");
}
