"use client";

import { useState, type FormEvent } from "react";

import { Button, ButtonLink } from "@/components/mealflo/button";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import { IconSwatch } from "@/components/mealflo/icon";

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

function tagsFromText(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[,;\n]/)
    .map((entry) => entry.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
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

  return (
    <div
      aria-live="polite"
      className="border-line bg-surface-tint flex flex-col gap-4 rounded-[16px] border-[1.5px] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <IconSwatch
          framed
          name={
            state.status === "success" ? "checkmark-circle" : "warning-alert"
          }
          size={28}
          swatchSize={48}
          tone={state.status === "success" ? "action" : "warm"}
        />
        <div className="space-y-1">
          <p className="font-display text-ink text-[22px] font-semibold tracking-[-0.02em]">
            {state.status === "success" ? "Draft ready" : "Check the form"}
          </p>
          <p className="text-muted text-sm leading-6">{state.message}</p>
        </div>
      </div>
      {state.status === "success" ? (
        <ButtonLink href="/demo/admin?view=inbox" size="sm" variant="secondary">
          Review inbox
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function PublicRequestForm() {
  const [state, setState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsSubmitting(true);
    setState(null);

    const formData = new FormData(form);
    const name = splitName(formData.get("name"));
    const message = String(formData.get("message") ?? "").trim();

    try {
      const draftId = await submitJson("/api/intake/request", {
        ...name,
        ...contactFields(formData.get("contactMethod")),
        addressLine1: String(formData.get("address") ?? "").trim(),
        allergenFlags: [],
        coldChainRequired: false,
        dietaryTags: tagsFromText(message),
        dueBucket: formData.get("urgency") || "tomorrow",
        householdSize: 1,
        message: message || "No extra notes provided.",
        municipality: "Victoria",
        requestedMealCount: numberField(formData.get("requestedMealCount"), 2),
      });

      form.reset();
      setState({
        draftId,
        message: "The request is ready for coordinator review.",
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

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
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
          className="font-bold"
        >
          {isSubmitting ? "Sending request" : "Submit request"}
        </Button>
        <SubmitStatus state={state} />
      </div>
    </form>
  );
}

export function PublicVolunteerForm() {
  const [state, setState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        message:
          [availabilityDetails, message].filter(Boolean).join("\n") ||
          "Volunteer can help with a short delivery route.",
        minutesAvailable: availability.minutesAvailable,
        windowEnd: availability.windowEnd,
        windowStart: availability.windowStart,
      });

      form.reset();
      setState({
        draftId,
        message: "The offer is ready for coordinator review.",
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

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
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
          className="font-bold"
          disabled={isSubmitting}
          size="lg"
          type="submit"
          variant="primary"
        >
          {isSubmitting
            ? "Sending availability"
            : "Submit availability"}
        </Button>
        <SubmitStatus state={state} />
      </div>
    </form>
  );
}
