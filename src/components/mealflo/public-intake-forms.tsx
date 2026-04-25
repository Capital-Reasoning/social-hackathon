"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/mealflo/button";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import { IconSwatch, MealfloIcon } from "@/components/mealflo/icon";
import {
  randomRequestDemoFill,
  randomVolunteerDemoFill,
} from "@/lib/mealflo-demo-intake";
import { inferFoodConstraintsFromText } from "@/lib/mealflo-food-constraints";

type SubmitState =
  | {
      message: string;
      status: "error";
    }
  | {
      draftId: string;
      message: string;
      status: "success";
    }
  | null;

function splitName(value: FormDataEntryValue | null) {
  const parts = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "Neighbour",
  };
}

function contactFields(value: FormDataEntryValue | null) {
  const contact = String(value ?? "").trim();

  if (contact.includes("@")) {
    return {
      contactEmail: contact,
    };
  }

  return {
    contactPhone: contact,
  };
}

function numberField(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fillFormFields(
  form: HTMLFormElement | null,
  values: Record<string, string>
) {
  if (!form) {
    return;
  }

  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

function parseAvailabilityText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  const minuteMatch = text.match(/(\d+)\s*(min|minute|minutes)\b/i);
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(hr|hour|hours)\b/i);
  const rangeMatch = text.match(
    /\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?\b.*\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?\b/i
  );

  const minutes = minuteMatch
    ? Number.parseInt(minuteMatch[1] ?? "60", 10)
    : hourMatch
      ? Math.round(Number.parseFloat(hourMatch[1] ?? "1") * 60)
      : 60;

  const toTime = (
    hourValue: string | undefined,
    minuteValue: string | undefined,
    meridiem: string | undefined,
    fallback: string
  ) => {
    if (!hourValue) {
      return fallback;
    }

    let hour = Number.parseInt(hourValue, 10);

    if (meridiem?.toLowerCase() === "pm" && hour < 12) {
      hour += 12;
    }

    if (meridiem?.toLowerCase() === "am" && hour === 12) {
      hour = 0;
    }

    return `${String(hour).padStart(2, "0")}:${minuteValue ?? "00"}`;
  };

  return {
    minutesAvailable: Number.isFinite(minutes) && minutes > 0 ? minutes : 60,
    windowEnd: toTime(
      rangeMatch?.[4],
      rangeMatch?.[5],
      rangeMatch?.[6],
      "13:00"
    ),
    windowStart: toTime(
      rangeMatch?.[1],
      rangeMatch?.[2],
      rangeMatch?.[3],
      "09:00"
    ),
  };
}

async function submitJson(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const json = (await response.json()) as {
    data?: {
      draftId?: string;
    };
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || !json.ok || !json.data?.draftId) {
    throw new Error(json.error ?? "The intake draft could not be created.");
  }

  return json.data.draftId;
}

function SubmitStatus({ state }: { state: SubmitState }) {
  if (!state) {
    return null;
  }

  if (state.status === "success") {
    return (
      <div
        aria-live="polite"
        className="animate-[mfSuccessPop_420ms_var(--mf-ease-spring)] rounded-[20px] border-[2px] border-[rgba(78,173,111,0.38)] bg-[var(--mf-color-green-50)] p-5"
      >
        <div className="flex items-center gap-4">
          <span className="inline-flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[rgba(78,173,111,0.34)] bg-white">
            <MealfloIcon name="checkmark-circle" size={54} />
          </span>
          <div className="space-y-1">
            <p className="font-display text-success-text text-[clamp(2rem,3vw,2.65rem)] leading-none font-bold tracking-[-0.02em]">
              Thank you
            </p>
            <p className="text-ink text-base leading-6">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className="border-line bg-surface-tint flex flex-col gap-4 rounded-[16px] border-[1.5px] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <IconSwatch
          framed
          name="warning-alert"
          size={28}
          swatchSize={48}
          tone="warm"
        />
        <div className="space-y-1">
          <p className="font-display text-ink text-[22px] font-semibold tracking-[-0.02em]">
            Check the form
          </p>
          <p className="text-muted text-sm leading-6">{state.message}</p>
        </div>
      </div>
    </div>
  );
}

function DemoGeneratePrompt({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="border-action flex flex-col gap-5 rounded-[18px] border-2 bg-[var(--mf-color-blue-50)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 md:col-span-2">
      <div className="flex min-w-0 items-center gap-4">
        <IconSwatch
          framed
          name="star"
          size={36}
          swatchSize={64}
          tone="action"
        />
        <div className="min-w-0">
          <p className="font-display text-ink text-[clamp(1.45rem,2.4vw,1.9rem)] leading-tight font-bold tracking-[-0.02em]">
            Sample details
          </p>
          <p className="text-muted mt-1 text-base leading-6">
            Use realistic Victoria details for a quick entry.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        className="h-[76px] min-w-[300px] shrink-0 gap-3 rounded-[16px] px-9 leading-none shadow-[0_10px_24px_rgba(61,92,245,0.2)]"
        style={{
          fontSize: "clamp(1.7rem, 2.5vw, 2.1rem)",
          fontWeight: 800,
        }}
        onClick={onGenerate}
        leading={<MealfloIcon name="pencil-edit" size={36} />}
      >
        Generate
      </Button>
    </div>
  );
}

export function PublicRequestForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleGenerate() {
    const sample = randomRequestDemoFill();

    fillFormFields(formRef.current, {
      address: sample.address,
      contactMethod: sample.contactMethod,
      message: sample.message,
      name: sample.name,
      requestedMealCount: sample.requestedMealCount,
      urgency: sample.urgency,
    });
    setState(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setState(null);

    const formData = new FormData(form);
    const name = splitName(formData.get("name"));
    const message = String(formData.get("message") ?? "").trim();
    const constraints = inferFoodConstraintsFromText(message);

    try {
      const draftId = await submitJson("/api/intake/request", {
        ...name,
        ...contactFields(formData.get("contactMethod")),
        addressLine1: String(formData.get("address") ?? "").trim(),
        allergenFlags: constraints.allergenFlags,
        coldChainRequired: constraints.coldChainRequired,
        dietaryTags: constraints.dietaryTags,
        dueBucket: formData.get("urgency") || "tomorrow",
        householdSize: 1,
        message: message || "No extra notes provided.",
        municipality: "Victoria",
        requestedMealCount: numberField(formData.get("requestedMealCount"), 2),
      });

      form.reset();
      setState({
        draftId,
        message:
          "Your request has been received. The Mealflo team will follow up if anything is unclear.",
        status: "success",
      });
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The intake draft could not be created.",
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state?.status === "success") {
    return <SubmitStatus state={state} />;
  }

  return (
    <form
      ref={formRef}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <DemoGeneratePrompt onGenerate={handleGenerate} />
      <Field label="Who should we contact?" htmlFor="request-name" required>
        <Input
          required
          id="request-name"
          autoComplete="name"
          name="name"
          placeholder="Full name"
        />
      </Field>
      <Field label="Where should food go?" htmlFor="request-address" required>
        <Input
          required
          id="request-address"
          autoComplete="street-address"
          name="address"
          placeholder="Street address"
        />
      </Field>
      <Field label="How can we reach you?" htmlFor="request-contact" required>
        <Input
          required
          id="request-contact"
          autoComplete="tel"
          inputMode="tel"
          name="contactMethod"
          placeholder="Phone number or email"
          spellCheck={false}
        />
      </Field>
      <Field label="How many meals do you need?" htmlFor="request-meals">
        <Input
          id="request-meals"
          inputMode="numeric"
          min={1}
          name="requestedMealCount"
          placeholder="2"
          type="number"
        />
      </Field>
      <Field label="When would food help most?" htmlFor="request-urgency">
        <Select id="request-urgency" defaultValue="tomorrow" name="urgency">
          <option value="today">Today if possible</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="later">This week</option>
        </Select>
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Allergies, preferences, or delivery notes"
          htmlFor="request-message"
        >
          <Textarea
            id="request-message"
            name="message"
            placeholder="Low sodium, vegetarian, peanut allergy, buzzer, stairs, side door, or anything else the driver should know"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:col-span-2">
        <Button
          fullWidth
          disabled={isSubmitting}
          size="lg"
          type="submit"
          variant="primary"
          className="h-[60px] font-black"
          style={{
            fontSize: "1.35rem",
            fontWeight: 850,
          }}
        >
          {isSubmitting ? "Sending request" : "Submit request"}
        </Button>
        <SubmitStatus state={state} />
      </div>
    </form>
  );
}

export function PublicVolunteerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleGenerate() {
    const sample = randomVolunteerDemoFill();

    fillFormFields(formRef.current, {
      availabilityDetails: sample.availabilityDetails,
      canBringCooler: sample.canBringCooler,
      canClimbStairs: sample.canClimbStairs,
      contact: sample.contact,
      details: sample.details,
      name: sample.name,
      vehicleAccess: sample.vehicleAccess,
    });
    setState(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setState(null);

    const formData = new FormData(form);
    const name = splitName(formData.get("name"));
    const message = String(formData.get("details") ?? "").trim();
    const availabilityDetails = String(
      formData.get("availabilityDetails") ?? ""
    ).trim();
    const availability = parseAvailabilityText(availabilityDetails);
    const locationMatch = availabilityDetails.match(
      /\b(?:near|from|around|in)\s+([^,.;\n]+)/i
    );

    try {
      const draftId = await submitJson("/api/intake/volunteer", {
        ...name,
        ...contactFields(formData.get("contact")),
        canClimbStairs: formData.get("canClimbStairs") === "yes",
        canHandleColdChain: formData.get("canBringCooler") === "yes",
        hasVehicleAccess: formData.get("vehicleAccess") !== "none",
        homeArea: locationMatch?.[1]?.trim() ?? "",
        homeMunicipality: "Victoria",
        message: message || "No extra route notes provided.",
        minutesAvailable: availability.minutesAvailable,
        windowEnd: availability.windowEnd,
        windowStart: availability.windowStart,
      });

      form.reset();
      setState({
        draftId,
        message:
          "Your availability has been received. The Mealflo team will reach out when there is a route that fits.",
        status: "success",
      });
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The volunteer draft could not be created.",
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (state?.status === "success") {
    return <SubmitStatus state={state} />;
  }

  return (
    <form
      ref={formRef}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={handleSubmit}
    >
      <DemoGeneratePrompt onGenerate={handleGenerate} />
      <Field label="Name" htmlFor="volunteer-name" required>
        <Input
          required
          id="volunteer-name"
          autoComplete="name"
          name="name"
          placeholder="Full name"
        />
      </Field>
      <Field label="Contact info" htmlFor="volunteer-contact" required>
        <Input
          required
          id="volunteer-contact"
          autoComplete="tel"
          inputMode="tel"
          name="contact"
          placeholder="Phone number or email"
          spellCheck={false}
        />
      </Field>
      <div className="md:col-span-2">
        <Field
          label="Availability + location"
          htmlFor="volunteer-availability"
          required
        >
          <Textarea
            required
            id="volunteer-availability"
            name="availabilityDetails"
            placeholder="Example: Tuesday lunch, 90 minutes, starting near Fernwood, 11am-1pm"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
        <Field label="Vehicle access" htmlFor="volunteer-vehicle">
          <Select
            id="volunteer-vehicle"
            defaultValue="car"
            name="vehicleAccess"
          >
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="none">No vehicle</option>
          </Select>
        </Field>
        <Field label="Can bring a cooler?" htmlFor="volunteer-cooler">
          <Select id="volunteer-cooler" defaultValue="no" name="canBringCooler">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
        <Field label="Stairs" htmlFor="volunteer-stairs">
          <Select
            id="volunteer-stairs"
            defaultValue="yes"
            name="canClimbStairs"
          >
            <option value="yes">Comfortable</option>
            <option value="no">Avoid stairs</option>
          </Select>
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Anything else to share" htmlFor="volunteer-detail">
          <Textarea
            id="volunteer-detail"
            name="details"
            placeholder="Anything the coordinator team should know before assigning a route"
          />
        </Field>
      </div>
      <div className="grid gap-4 md:col-span-2">
        <Button
          fullWidth
          className="h-[60px] font-black"
          disabled={isSubmitting}
          size="lg"
          type="submit"
          variant="primary"
          style={{
            fontSize: "1.35rem",
            fontWeight: 850,
          }}
        >
          {isSubmitting ? "Sending availability" : "Submit availability"}
        </Button>
        <SubmitStatus state={state} />
      </div>
    </form>
  );
}
