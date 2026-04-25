"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/mealflo/button";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import { InsetCard } from "@/components/mealflo/card";
import { parseFoodConstraintsReviewText } from "@/lib/mealflo-food-constraints";

import type { AdminInboxData } from "@/server/mealflo/backend";

type InboxReviewProps = {
  onResolved?: (draftId: string) => void;
  primaryActionLabel?: string;
  selectedItem: AdminInboxData["selectedItem"];
};

type ReviewState = {
  message: string;
  status: "error" | "success";
} | null;

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "Unknown",
      lastName: "Neighbour",
    };
  }

  return {
    firstName: parts[0] ?? "Unknown",
    lastName: parts.slice(1).join(" ") || "Neighbour",
  };
}

async function parseResponse(response: Response) {
  const json = (await response.json()) as {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || !json.ok) {
    throw new Error(json.error ?? "The draft could not be updated.");
  }
}

export function AdminInboxReview({
  onResolved,
  primaryActionLabel,
  selectedItem,
}: InboxReviewProps) {
  const router = useRouter();
  const [state, setState] = useState<ReviewState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const payload = selectedItem.structuredPayload;
  const [name, setName] = useState(
    [asText(payload.firstName), asText(payload.lastName)]
      .filter(Boolean)
      .join(" ") || selectedItem.sender
  );
  const [address, setAddress] = useState(selectedItem.address);
  const [phone, setPhone] = useState(selectedItem.contactPhone);
  const [email, setEmail] = useState(selectedItem.contactEmail);
  const [needBy, setNeedBy] = useState(selectedItem.needBy);
  const [householdSize, setHouseholdSize] = useState(
    selectedItem.householdSize
  );
  const [dietaryFlags, setDietaryFlags] = useState(selectedItem.dietaryFlags);
  const [notes, setNotes] = useState(selectedItem.accessNotes);
  const [availability, setAvailability] = useState(
    String(asNumber(payload.minutesAvailable, 60))
  );
  const [windowStart, setWindowStart] = useState(
    asText(payload.windowStart, "09:00")
  );
  const [windowEnd, setWindowEnd] = useState(
    asText(payload.windowEnd, "13:00")
  );
  const [startArea, setStartArea] = useState(selectedItem.volunteerStartArea);
  const [vehicleAccess, setVehicleAccess] = useState(
    asBoolean(payload.hasVehicleAccess) ? "yes" : "no"
  );
  const [canBringCooler, setCanBringCooler] = useState(
    asBoolean(payload.canHandleColdChain) ? "yes" : "no"
  );
  const [canClimbStairs, setCanClimbStairs] = useState(
    asBoolean(payload.canClimbStairs) ? "yes" : "no"
  );

  function requestPayload() {
    const addressParts = address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const city =
      addressParts.length > 1
        ? addressParts[addressParts.length - 1]
        : undefined;
    const addressLine1 =
      addressParts.length > 1
        ? addressParts.slice(0, -1).join(", ")
        : (addressParts[0] ?? "");
    const parsedName = splitName(name);
    const foodConstraints = parseFoodConstraintsReviewText(dietaryFlags);

    return {
      ...payload,
      addressLine1:
        addressLine1 || asText(payload.addressLine1, "Address pending"),
      allergenFlags: foodConstraints.allergenFlags,
      coldChainRequired: asBoolean(payload.coldChainRequired),
      contactEmail: email.trim() || undefined,
      contactPhone: phone.trim() || undefined,
      dietaryTags: foodConstraints.dietaryTags,
      dueBucket: needBy,
      firstName: parsedName.firstName,
      householdSize: Number.parseInt(householdSize, 10) || 1,
      lastName: parsedName.lastName,
      message: notes || "Notes pending review.",
      municipality: city || asText(payload.municipality, "Victoria"),
      requestedMealCount: asNumber(payload.requestedMealCount, 2),
    };
  }

  function volunteerPayload() {
    const [homeArea, homeMunicipality] = startArea
      .split(",")
      .map((part) => part.trim());
    const parsedName = splitName(name);

    return {
      ...payload,
      canClimbStairs: canClimbStairs === "yes",
      canHandleColdChain: canBringCooler === "yes",
      contactEmail: email.trim() || undefined,
      contactPhone: phone.trim() || undefined,
      firstName: parsedName.firstName,
      hasVehicleAccess: vehicleAccess === "yes",
      homeArea: homeArea || asText(payload.homeArea, "Victoria"),
      homeMunicipality:
        homeMunicipality || asText(payload.homeMunicipality, "Victoria"),
      lastName: parsedName.lastName,
      message: notes || "Volunteer notes pending review.",
      minutesAvailable: Number.parseInt(availability, 10) || 60,
      windowEnd,
      windowStart,
    };
  }

  async function saveDraft() {
    if (!selectedItem.draftId || selectedItem.draftType === "other") {
      return;
    }

    await parseResponse(
      await fetch(`/api/drafts/${encodeURIComponent(selectedItem.draftId)}`, {
        body: JSON.stringify({
          draftType: selectedItem.draftType,
          structuredPayload:
            selectedItem.draftType === "request"
              ? requestPayload()
              : volunteerPayload(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      })
    );
  }

  async function handleApprove() {
    if (!selectedItem.draftId || selectedItem.draftType === "other") {
      return;
    }

    setIsSubmitting(true);
    setState(null);

    try {
      await saveDraft();
      await parseResponse(
        await fetch(
          `/api/drafts/${encodeURIComponent(selectedItem.draftId)}/approve`,
          {
            method: "POST",
          }
        )
      );
      onResolved?.(selectedItem.draftId);
      router.refresh();
      return;
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The draft could not be approved.",
        status: "error",
      });
      setIsSubmitting(false);
    }
  }

  async function handleIgnore() {
    if (!selectedItem.draftId) {
      return;
    }

    setIsSubmitting(true);
    setState(null);

    try {
      await parseResponse(
        await fetch(`/api/drafts/${encodeURIComponent(selectedItem.draftId)}`, {
          method: "DELETE",
        })
      );
      onResolved?.(selectedItem.draftId);
      router.refresh();
      return;
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The draft could not be ignored.",
        status: "error",
      });
      setIsSubmitting(false);
    }
  }

  if (!selectedItem.draftId) {
    return (
      <InsetCard className="space-y-2">
        <p className="font-display text-ink text-[22px] font-semibold tracking-[-0.02em]">
          Queue is clear
        </p>
        <p className="text-muted text-sm leading-6">
          New form submissions and mealflo Gmail messages will appear here.
        </p>
      </InsetCard>
    );
  }

  return (
    <div className="grid gap-4">
      {selectedItem.draftType === "request" ? (
        <>
          <Field label="Name" htmlFor="draft-name">
            <Input
              id="draft-name"
              value={name}
              leadingIcon="user-profile"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Address" htmlFor="draft-address">
            <Input
              id="draft-address"
              value={address}
              leadingIcon="location-pin"
              onChange={(event) => setAddress(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="draft-phone">
              <Input
                id="draft-phone"
                value={phone}
                leadingIcon="phone-handset"
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="draft-email">
              <Input
                id="draft-email"
                value={email}
                leadingIcon="chat-bubble"
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Need by" htmlFor="need-by">
            <Select
              id="need-by"
              value={needBy}
              leadingIcon="calendar"
              onChange={(event) => setNeedBy(event.target.value)}
            >
              <option value="today">today</option>
              <option value="tomorrow">tomorrow</option>
              <option value="later">later</option>
            </Select>
          </Field>
          <Field label="Household size" htmlFor="household-size">
            <Input
              id="household-size"
              value={householdSize}
              inputMode="numeric"
              leadingIcon="group"
              onChange={(event) => setHouseholdSize(event.target.value)}
            />
          </Field>
          <Field label="Food needs" htmlFor="dietary-flags">
            <Input
              id="dietary-flags"
              value={dietaryFlags}
              leadingIcon="allergy-peanut"
              onChange={(event) => setDietaryFlags(event.target.value)}
            />
          </Field>
        </>
      ) : selectedItem.draftType === "volunteer" ? (
        <>
          <Field label="Name" htmlFor="volunteer-name">
            <Input
              id="volunteer-name"
              value={name}
              leadingIcon="user-profile"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="volunteer-phone">
              <Input
                id="volunteer-phone"
                value={phone}
                leadingIcon="phone-handset"
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="volunteer-email">
              <Input
                id="volunteer-email"
                value={email}
                leadingIcon="chat-bubble"
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Availability" htmlFor="volunteer-availability">
            <Select
              id="volunteer-availability"
              value={availability}
              leadingIcon="clock"
              onChange={(event) => setAvailability(event.target.value)}
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
              <option value="120">120 minutes</option>
              <option value="180">180 minutes</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Window start" htmlFor="volunteer-window-start">
              <Input
                id="volunteer-window-start"
                value={windowStart}
                leadingIcon="calendar"
                onChange={(event) => setWindowStart(event.target.value)}
              />
            </Field>
            <Field label="Window end" htmlFor="volunteer-window-end">
              <Input
                id="volunteer-window-end"
                value={windowEnd}
                leadingIcon="clock"
                onChange={(event) => setWindowEnd(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Starting area" htmlFor="volunteer-start-area">
            <Input
              id="volunteer-start-area"
              value={startArea}
              leadingIcon="location-pin"
              onChange={(event) => setStartArea(event.target.value)}
            />
          </Field>
          <Field label="Vehicle access" htmlFor="volunteer-vehicle-access">
            <Select
              id="volunteer-vehicle-access"
              value={vehicleAccess}
              leadingIcon="delivery-van"
              onChange={(event) => setVehicleAccess(event.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </Field>
          <Field label="Can bring a cooler?" htmlFor="volunteer-cooler">
            <Select
              id="volunteer-cooler"
              value={canBringCooler}
              leadingIcon="snowflake"
              onChange={(event) => setCanBringCooler(event.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </Field>
          <Field label="Stairs" htmlFor="volunteer-stairs">
            <Select
              id="volunteer-stairs"
              value={canClimbStairs}
              leadingIcon="door"
              onChange={(event) => setCanClimbStairs(event.target.value)}
            >
              <option value="yes">Comfortable</option>
              <option value="no">Avoid stairs</option>
            </Select>
          </Field>
        </>
      ) : (
        <InsetCard>
          <p className="text-ink text-sm leading-6">
            This message needs manual triage before it can become a request or
            volunteer draft.
          </p>
        </InsetCard>
      )}

      <Field
        label={
          selectedItem.draftType === "volunteer"
            ? "Route notes"
            : "Access notes"
        }
        htmlFor="draft-notes"
      >
        <Textarea
          id="draft-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>

      {state ? (
        <InsetCard
          className={
            state.status === "success"
              ? "border-[rgba(78,173,111,0.36)] bg-[var(--mf-color-green-50)]"
              : "border-[rgba(224,80,80,0.3)] bg-[var(--mf-color-red-50)]"
          }
        >
          <p className="text-ink text-sm leading-6">{state.message}</p>
        </InsetCard>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          fullWidth
          disabled={isSubmitting || selectedItem.draftType === "other"}
          type="button"
          variant="primary"
          onClick={handleApprove}
        >
          {primaryActionLabel ??
            (selectedItem.draftType === "volunteer"
              ? "Approve volunteer"
              : "Approve request")}
        </Button>
        <Button
          fullWidth
          disabled={isSubmitting}
          type="button"
          variant="danger"
          onClick={handleIgnore}
        >
          Ignore
        </Button>
      </div>
    </div>
  );
}
