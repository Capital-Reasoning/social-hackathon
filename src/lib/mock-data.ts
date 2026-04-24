export type RouteSummary = {
  id: string;
  name: string;
  driver: string;
  status: "on-track" | "attention" | "ready";
  stops: number;
  delivered: number;
  remaining: number;
  eta: string;
  area: string;
  utilization: string;
  latitude: number;
  longitude: number;
};

export const dashboardKpis = [
  {
    id: "new-intake",
    label: "New intake",
    value: "6",
    note: "4 need review",
    icon: "notification-bell",
    tone: "warning",
  },
  {
    id: "ready-today",
    label: "Ready today",
    value: "18",
    note: "12 approved, 6 drafted",
    icon: "checklist",
    tone: "success",
  },
  {
    id: "routes",
    label: "Routes ready",
    value: "4",
    note: "2 active now",
    icon: "route-road",
    tone: "info",
  },
  {
    id: "meals",
    label: "Meals ready",
    value: "42",
    note: "8 need refrigeration",
    icon: "grocery-bag",
    tone: "neutral",
  },
] as const;

export const routeSummaries: RouteSummary[] = [
  {
    id: "hastings-run",
    name: "Hastings run",
    driver: "Rosa Martinez",
    status: "on-track",
    stops: 7,
    delivered: 4,
    remaining: 3,
    eta: "42 min",
    area: "Hastings-Sunrise",
    utilization: "84%",
    latitude: 49.2813,
    longitude: -123.0544,
  },
  {
    id: "mount-pleasant",
    name: "Mount Pleasant",
    driver: "James Tran",
    status: "attention",
    stops: 5,
    delivered: 2,
    remaining: 3,
    eta: "55 min",
    area: "Mount Pleasant",
    utilization: "68%",
    latitude: 49.2631,
    longitude: -123.1005,
  },
  {
    id: "kitsilano-pm",
    name: "Kitsilano PM",
    driver: "Amara Diallo",
    status: "ready",
    stops: 6,
    delivered: 0,
    remaining: 6,
    eta: "1 hr 10 min",
    area: "Kitsilano",
    utilization: "73%",
    latitude: 49.2706,
    longitude: -123.1556,
  },
];

export const routeLine = [
  [-123.1148, 49.2836],
  [-123.1069, 49.2798],
  [-123.0978, 49.2756],
  [-123.086, 49.2728],
  [-123.0759, 49.2747],
] as const;

export const liveMarkers = [
  {
    id: "hub",
    label: "Kitchen hub",
    latitude: 49.2836,
    longitude: -123.1148,
    tone: "primary",
  },
  {
    id: "driver-rosa",
    label: "Rosa",
    latitude: 49.2756,
    longitude: -123.0978,
    tone: "success",
  },
  {
    id: "driver-james",
    label: "James",
    latitude: 49.2728,
    longitude: -123.086,
    tone: "warning",
  },
  {
    id: "next-stop",
    label: "Next stop",
    latitude: 49.2747,
    longitude: -123.0759,
    tone: "info",
  },
] as const;

export const inboxItems = [
  {
    id: "intake-104",
    channel: "gmail",
    subject: "Need meals for Friday",
    sender: "Maya Johnson",
    status: "needs review",
    confidence: "91%",
    address: "1655 Commercial Dr, Vancouver",
    snippet: "Two seniors, elevator access, soft foods if possible.",
  },
  {
    id: "intake-105",
    channel: "form",
    subject: "Volunteer signup",
    sender: "Chris Lee",
    status: "low confidence",
    confidence: "74%",
    address: "Kerrisdale start area",
    snippet: "Available after 4 PM with hatchback.",
  },
  {
    id: "intake-106",
    channel: "gmail",
    subject: "Urgent hamper request",
    sender: "Aunt Leah's House",
    status: "needs review",
    confidence: "88%",
    address: "2550 Fraser St, Vancouver",
    snippet: "Family of four, peanut allergy, building callbox 19.",
  },
] as const;

export const inboxFields = [
  {
    label: "Need by",
    value: "Today, 5 PM",
    confidence: "high",
  },
  {
    label: "Household size",
    value: "4",
    confidence: "medium",
  },
  {
    label: "Dietary flags",
    value: "Peanut allergy",
    confidence: "high",
  },
  {
    label: "Access notes",
    value: "Callbox 19",
    confidence: "low",
  },
] as const;

export const inventoryMeals = [
  {
    name: "Roast chicken tray",
    category: "Hot meal",
    quantity: "14",
    tags: ["High protein", "Needs refrigeration"],
  },
  {
    name: "Vegetable soup",
    category: "Hot meal",
    quantity: "12",
    tags: ["Vegetarian", "Needs refrigeration"],
  },
  {
    name: "Soft meal kit",
    category: "Ready pack",
    quantity: "8",
    tags: ["Soft food", "Shelf stable"],
  },
] as const;

export const inventoryIngredients = [
  {
    name: "Fresh produce hamper",
    source: "Food bank pickup",
    quantity: "18 packs",
    perishability: "Use today",
  },
  {
    name: "Rice and lentils",
    source: "Dry goods",
    quantity: "32 kits",
    perishability: "Stable",
  },
  {
    name: "Yogurt cups",
    source: "Cold storage",
    quantity: "24 cups",
    perishability: "Needs refrigeration",
  },
] as const;

export const publicPromisePoints = [
  {
    id: "fast-intake",
    label: "Fast intake",
    note: "Request and volunteer forms create drafts for review.",
    icon: "send-airplane",
  },
  {
    id: "calm-copy",
    label: "Plain steps",
    note: "Short forms, large inputs, no account needed.",
    icon: "shield-check",
  },
  {
    id: "live-demo",
    label: "Demo ready",
    note: "Role paths stay visible for on-stage routing.",
    icon: "star",
  },
] as const;

export const driverStops = [
  {
    id: "stop-1",
    name: "Margaret Okafor",
    address: "231 Oak Ave, Apt 3",
    note: "Use side entrance. Call before buzzer.",
    items: "2 meal trays, 1 soup pack",
    status: "Now",
  },
  {
    id: "stop-2",
    name: "Robert Chen",
    address: "88 Maple Street",
    note: "Low sodium bag in blue tote.",
    items: "1 soft meal kit",
    status: "Next",
  },
] as const;
