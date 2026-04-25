type Person = {
  firstName: string;
  lastName: string;
};

type AddressSeed = {
  area: string;
  street: string;
};

type RequestDemoFill = {
  address: string;
  contactMethod: string;
  message: string;
  name: string;
  requestedMealCount: string;
  urgency: "today" | "tomorrow" | "later";
};

type VolunteerDemoFill = {
  availabilityDetails: string;
  canBringCooler: "yes" | "no";
  canClimbStairs: "yes" | "no";
  contact: string;
  details: string;
  name: string;
  vehicleAccess: "bike" | "car" | "none";
};

const firstNames = [
  "Aaliyah",
  "Aiden",
  "Amara",
  "Anika",
  "Beatrice",
  "Caleb",
  "Camila",
  "Daniel",
  "Daria",
  "Elias",
  "Elise",
  "Farah",
  "Felix",
  "Grace",
  "Hana",
  "Iris",
  "Jamal",
  "Jasper",
  "Keiko",
  "Leah",
  "Leo",
  "Mara",
  "Maya",
  "Nadia",
  "Noah",
  "Omar",
  "Priya",
  "Rafael",
  "Rina",
  "Sam",
  "Sana",
  "Sofia",
  "Theo",
  "Valerie",
  "Yara",
  "Zoe",
] as const;

const lastNames = [
  "Adjei",
  "Bennett",
  "Chen",
  "Cole",
  "Dhillon",
  "Foster",
  "Grant",
  "Harris",
  "Ibrahim",
  "Jensen",
  "Kaur",
  "Leung",
  "Martinez",
  "Mercier",
  "Nordin",
  "Okafor",
  "Patel",
  "Price",
  "Quinn",
  "Reyes",
  "Singh",
  "Tran",
  "Vega",
  "Wong",
  "Yusuf",
] as const;

const victoriaAddressSeeds: AddressSeed[] = [
  { area: "James Bay", street: "Menzies Street" },
  { area: "James Bay", street: "Michigan Street" },
  { area: "Fernwood", street: "Pembroke Street" },
  { area: "Fernwood", street: "Gladstone Avenue" },
  { area: "North Park", street: "Mason Street" },
  { area: "North Park", street: "Caledonia Avenue" },
  { area: "Harris Green", street: "Yates Street" },
  { area: "Harris Green", street: "View Street" },
  { area: "Cook Street Village", street: "Oscar Street" },
  { area: "Cook Street Village", street: "Cook Street" },
  { area: "Oaklands", street: "Haultain Street" },
  { area: "Oaklands", street: "Cedar Hill Road" },
  { area: "Fairfield", street: "Moss Street" },
  { area: "Fairfield", street: "Linden Avenue" },
  { area: "Rockland", street: "Fort Street" },
  { area: "Rockland", street: "Richardson Street" },
  { area: "Burnside", street: "Jutland Road" },
  { area: "Burnside", street: "Gorge Road East" },
  { area: "Vic West", street: "Esquimalt Road" },
  { area: "Vic West", street: "Tyee Road" },
  { area: "Quadra Village", street: "Quadra Street" },
  { area: "Quadra Village", street: "Kings Road" },
  { area: "Downtown", street: "Johnson Street" },
  { area: "Downtown", street: "Pandora Avenue" },
  { area: "Hillside", street: "Shelbourne Street" },
  { area: "Hillside", street: "Bay Street" },
  { area: "Oak Bay border", street: "Foul Bay Road" },
  { area: "Cedar Hill", street: "Finlayson Street" },
  { area: "Tillicum", street: "Burnside Road West" },
  { area: "Gonzales", street: "Fairfield Road" },
] as const;

const requestNoteSubjects = [
  "Please text before arriving because the buzzer is unreliable",
  "Low sodium meals would be best this week",
  "The side entrance is easier than the front stairs",
  "A vegetarian hamper would help until the next cheque arrives",
  "Please avoid peanuts and tree nuts",
  "Soft meals are easier after dental work",
  "The caregiver can meet the driver in the lobby",
  "Frozen meals are okay if they can come before 3pm",
  "Please call from outside because the doorbell is broken",
  "A grocery hamper with shelf-stable items would be helpful",
] as const;

const requestNoteContexts = [
  "There are two people at home.",
  "The recipient uses a walker.",
  "The elevator has been slow all week.",
  "A neighbour can receive the bag if needed.",
  "The building entrance faces the courtyard.",
  "The family is stretching meals through the weekend.",
  "The recipient has an afternoon medical appointment.",
  "The intercom lists the suite under a family member's name.",
  "The driver can park briefly in the loading zone.",
  "The household is managing without a car right now.",
] as const;

const volunteerDetailSubjects = [
  "Happy to take a compact route with apartment stops.",
  "Can cover a short route before school pickup.",
  "Comfortable carrying meals up one or two flights.",
  "Can bring a clean cooler bag for chilled meals.",
  "Best for routes close to downtown or Fernwood.",
  "Can pair with another volunteer for heavier hampers.",
  "Comfortable calling recipients before arrival.",
  "Can help with grocery hampers if parking is simple.",
  "Available most weeks with one day of notice.",
  "Would prefer no late evening route this week.",
] as const;

const volunteerDetailContexts = [
  "Has a hatchback with room for insulated bags.",
  "Can bike with two delivery bags.",
  "Knows James Bay and Fairfield well.",
  "Works near Quadra Village.",
  "Can start from the community kitchen.",
  "Has done food bank pickup shifts before.",
  "Can support a quiet route for seniors.",
  "Needs assignments under 90 minutes.",
  "Can help again next week if the timing works.",
  "Prefers clear parking notes for each stop.",
] as const;

const availabilityWindows = [
  "Monday lunch, 90 minutes, starting near Fernwood, 11am-12:30pm",
  "Tuesday afternoon, 60 minutes, starting near James Bay, 2pm-3pm",
  "Wednesday morning, 120 minutes, starting near Quadra Village, 9am-11am",
  "Thursday after work, 90 minutes, starting near Oaklands, 4:30pm-6pm",
  "Friday lunch, 60 minutes, starting near Downtown, 12pm-1pm",
  "Saturday morning, 120 minutes, starting near Cook Street Village, 10am-12pm",
  "Sunday afternoon, 90 minutes, starting near Vic West, 1pm-2:30pm",
  "Tuesday evening, 60 minutes, starting near Fairfield, 5pm-6pm",
] as const;

const phonePrefixes = ["250-555", "778-555", "236-555"] as const;

function buildPeople(count: number): Person[] {
  return Array.from({ length: count }, (_, index) => ({
    firstName: firstNames[index % firstNames.length],
    lastName: lastNames[(index * 7) % lastNames.length],
  }));
}

function buildRequestNotes(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const subject = requestNoteSubjects[index % requestNoteSubjects.length];
    const context =
      requestNoteContexts[Math.floor(index / requestNoteSubjects.length)];

    return `${subject}. ${context}`;
  });
}

function buildVolunteerNotes(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const subject =
      volunteerDetailSubjects[index % volunteerDetailSubjects.length];
    const context =
      volunteerDetailContexts[
        Math.floor(index / volunteerDetailSubjects.length)
      ];

    return `${subject} ${context}`;
  });
}

function phoneForIndex(index: number) {
  const suffix = String(1100 + ((index * 37) % 8900)).padStart(4, "0");

  return `${phonePrefixes[index % phonePrefixes.length]}-${suffix}`;
}

function addressForIndex(index: number) {
  const seed = victoriaAddressSeeds[index % victoriaAddressSeeds.length];
  const houseNumber = 520 + ((index * 83) % 2100);

  return `${houseNumber} ${seed.street}`;
}

function pick<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)] as T;
}

function pickIndex(values: readonly unknown[]) {
  return Math.floor(Math.random() * values.length);
}

export const requestDemoProfiles = buildPeople(200).map((person, index) => ({
  ...person,
  address: addressForIndex(index),
  area: victoriaAddressSeeds[index % victoriaAddressSeeds.length].area,
  contactMethod: phoneForIndex(index),
}));

export const volunteerDemoProfiles = buildPeople(200).map((person, index) => ({
  ...person,
  contact: phoneForIndex(index + 200),
}));

export const requestDemoNotes = buildRequestNotes(100);
export const volunteerDemoNotes = buildVolunteerNotes(100);

export function randomRequestDemoFill(): RequestDemoFill {
  const profile = pick(requestDemoProfiles);
  const note = pick(requestDemoNotes);
  const urgency = pick(["today", "tomorrow", "later"] as const);
  const householdSize = 1 + pickIndex([0, 1, 2, 3]);

  return {
    address: profile.address,
    contactMethod: profile.contactMethod,
    message: `${note} Area: ${profile.area}.`,
    name: `${profile.firstName} ${profile.lastName}`,
    requestedMealCount: String(Math.max(2, householdSize + pickIndex([0, 1]))),
    urgency,
  };
}

export function randomVolunteerDemoFill(): VolunteerDemoFill {
  const profile = pick(volunteerDemoProfiles);
  const index = pickIndex(availabilityWindows);
  const vehicleAccess = pick(["car", "car", "bike", "none"] as const);
  const canBringCooler =
    vehicleAccess === "none" ? "no" : pick(["yes", "no"] as const);

  return {
    availabilityDetails: availabilityWindows[index],
    canBringCooler,
    canClimbStairs: pick(["yes", "yes", "no"] as const),
    contact: profile.contact,
    details: pick(volunteerDemoNotes),
    name: `${profile.firstName} ${profile.lastName}`,
    vehicleAccess,
  };
}
