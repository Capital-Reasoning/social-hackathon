import { PersonaEntry } from "@/components/mealflo/persona-entry";
import { appConfig } from "@/lib/config/app";

export const metadata = {
  title: "Home",
};

export default function HomePage() {
  return <PersonaEntry integrations={appConfig.integrations} />;
}
