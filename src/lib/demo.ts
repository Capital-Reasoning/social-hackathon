export type DemoRole = "admin" | "public" | "driver";

export type DemoDriverControlAction =
  | "advance-stop"
  | "jump-to-next-stop"
  | "reset-route"
  | "switch-driver"
  | "toggle-location";

export type DemoDriverStatus = {
  canJumpToNextStop: boolean;
};

export type DemoPersona = {
  id: string;
  name: string;
  label: string;
  note: string;
};

export const demoDriverControlEvent = "mealflo-demo-driver-control";
export const demoDriverStatusEvent = "mealflo-demo-driver-status";
export const demoDriverStatusRequestEvent =
  "mealflo-demo-driver-status-request";

export const roleDefinitions: Record<
  DemoRole,
  {
    label: string;
    note: string;
    defaultPath: string;
    demoPath: string;
    icon: string;
  }
> = {
  admin: {
    label: "Admin view",
    note: "Inbox, routing, inventory",
    defaultPath: "/admin",
    demoPath: "/demo/admin",
    icon: "checklist",
  },
  public: {
    label: "Public view",
    note: "Request food or volunteer",
    defaultPath: "/public",
    demoPath: "/demo/public",
    icon: "heart",
  },
  driver: {
    label: "Driver view",
    note: "Phone-first route flow",
    defaultPath: "/driver",
    demoPath: "/demo/driver",
    icon: "delivery-van",
  },
};

export const demoInboundPayloads = {
  request: {
    addressLine1: "1120 Pandora Ave",
    allergenFlags: ["peanut"],
    coldChainRequired: true,
    contactPhone: "250-555-0148",
    dietaryTags: ["vegetarian", "soft_food"],
    dueBucket: "today",
    firstName: "Mina",
    householdSize: 2,
    lastName: "Rahman",
    message:
      "Two soft vegetarian meals would help today. Please call from the lobby because the buzzer is unreliable.",
    municipality: "Victoria",
    neighborhood: "Harris Green",
    requestedMealCount: 2,
  },
  volunteer: {
    canClimbStairs: true,
    canHandleColdChain: true,
    contactPhone: "250-555-0162",
    firstName: "Theo",
    hasVehicleAccess: true,
    homeArea: "Fernwood",
    homeMunicipality: "Victoria",
    lastName: "Nguyen",
    message:
      "I can cover a lunch route from Fernwood and bring a cooler bag if needed.",
    minutesAvailable: 90,
    windowEnd: "13:00",
    windowStart: "11:30",
  },
} as const;

export const personasByRole: Record<DemoRole, DemoPersona[]> = {
  admin: [
    {
      id: "sarah-coordinator",
      name: "Sarah",
      label: "Sarah, coordinator",
      note: "Morning dispatcher",
    },
    {
      id: "mika-ops",
      name: "Mika",
      label: "Mika, operations",
      note: "Route planning lead",
    },
  ],
  public: [
    {
      id: "guest-neighbor",
      name: "Guest",
      label: "Guest neighbor",
      note: "Food request flow",
    },
    {
      id: "guest-volunteer",
      name: "Guest",
      label: "Guest volunteer",
      note: "Volunteer interest flow",
    },
  ],
  driver: [
    {
      id: "rosa-driver",
      name: "Rosa",
      label: "Rosa",
      note: "Van route on shift",
    },
    {
      id: "james-driver",
      name: "James",
      label: "James",
      note: "Short-window route",
    },
  ],
};

export function getPersona(role: DemoRole, personaId?: string | null) {
  const personas = personasByRole[role];

  return personas.find((persona) => persona.id === personaId) ?? personas[0];
}

export function getPersonaLabel(role: DemoRole, personaId?: string | null) {
  return getPersona(role, personaId).label;
}
