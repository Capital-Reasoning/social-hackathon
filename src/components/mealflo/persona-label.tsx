"use client";

import { useSearchParams } from "next/navigation";

import { getPersona } from "@/lib/demo";
import type { DemoRole } from "@/lib/demo";

type PersonaLabelProps = {
  display?: "label" | "name";
  role: DemoRole;
};

export function PersonaLabel({ display = "label", role }: PersonaLabelProps) {
  const searchParams = useSearchParams();
  const personaId = searchParams.get("persona");
  const persona = getPersona(role, personaId);

  return <>{display === "name" ? persona.name : persona.label}</>;
}
