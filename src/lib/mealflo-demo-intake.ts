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
  "I'm low on groceries and a few ready meals would get me through the next couple days",
  "I can use vegetarian meals if you have them. Not picky, just no meat please",
  "Anything soft would be easiest right now because chewing has been rough",
  "I do not have a car this week and carrying groceries home is not really possible",
  "A small hamper would help a lot until my cheque comes in",
  "If there are lower-salt meals, those are best for me",
  "I can take frozen meals as long as they do not sit out too long",
  "Please no peanuts if possible. I know it is hard, just noting it",
  "I have been skipping dinners, so even two or three meals would help",
  "Shelf stable groceries are useful too, especially soup, rice, or oatmeal",
] as const;

const requestNoteContexts = [
  "Please text when you are close, the buzzer only works sometimes.",
  "I use a walker, so I may need a minute to get to the door.",
  "The elevator is slow lately, sorry if I take a bit.",
  "If I miss the call, my neighbour in 204 can take it for me.",
  "The entrance is off the courtyard, not the main street door.",
  "We are trying to stretch what we have through the weekend.",
  "I have an appointment in the afternoon, so earlier would be easier.",
  "The intercom is under my son's last name, not mine.",
  "There is a loading zone out front if it is open.",
  "Side door is better, the front steps are hard for me.",
] as const;

const volunteerDetailSubjects = [
  "I can do a smaller route today, especially if the stops are close together.",
  "I need to be done before school pickup, but I can still help.",
  "I am okay with a couple flights of stairs, just not a whole tower.",
  "I can bring a clean cooler bag if there are chilled meals.",
  "I am best around downtown, Fernwood, or anywhere nearby.",
  "I can help with heavier bags if someone pairs me with another driver.",
  "I am happy to call people before I arrive.",
  "I can take grocery hampers too if parking is not too chaotic.",
  "I can usually help with a day of notice.",
  "I would rather not do a late route tonight if there is another option.",
] as const;

const volunteerDetailContexts = [
  "My car is small but it has room for a few insulated bags.",
  "I am on a bike, so two bags is probably my max.",
  "I know James Bay and Fairfield pretty well.",
  "I work near Quadra Village, so starting there is easy.",
  "I can start from the kitchen if that helps.",
  "I have done food bank pickup shifts before, but not this exact route.",
  "Quiet senior stops are totally fine for me.",
  "Please keep it under 90 minutes if you can.",
  "If this goes well I can probably do another shift next week.",
  "Clear parking notes help me a lot, I get turned around sometimes.",
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

let requestDemoCursor = Math.floor(Math.random() * requestDemoProfiles.length);

export function randomRequestDemoFill(): RequestDemoFill {
  const index = requestDemoCursor % requestDemoProfiles.length;
  const profile = requestDemoProfiles[index] ?? requestDemoProfiles[0]!;
  const note =
    requestDemoNotes[index % requestDemoNotes.length] ?? requestDemoNotes[0]!;
  const urgency = "today" as const;
  const householdSize = 1 + (index % 4);

  requestDemoCursor += 1;

  return {
    address: profile.address,
    contactMethod: profile.contactMethod,
    message: note,
    name: `${profile.firstName} ${profile.lastName}`,
    requestedMealCount: String(Math.max(2, householdSize + (index % 2))),
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
