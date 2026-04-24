"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/mealflo/badge";
import { Button } from "@/components/mealflo/button";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import { InsetCard } from "@/components/mealflo/card";

import type { AdminInboxData } from "@/server/mealflo/backend";

type InboxReviewProps = {
  inboxFields: AdminInboxData["inboxFields"];
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

function toTags(value: string) {
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

function contactPatch(value: string) {
  if (value.includes("@")) {
    return {
      contactEmail: value,
      contactPhone: undefined,
    };
  }

  return {
    contactEmail: undefined,
    contactPhone: value,
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
  inboxFields,
  selectedItem,
}: InboxReviewProps) {
  const router = useRouter();
  const [state, setState] = useState<ReviewState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const payload = selectedItem.structuredPayload;
  const [address, setAddress] = useState(selectedItem.address);
  const [contact, setContact] = useState(selectedItem.contact);
  const [needBy, setNeedBy] = useState(selectedItem.needBy);
  const [householdSize, setHouseholdSize] = useState(
    selectedItem.householdSize
  );
  const [dietaryFlags, setDietaryFlags] = useState(selectedItem.dietaryFlags);
  const [notes, setNotes] = useState(selectedItem.accessNotes);
  const [availability, setAvailability] = useState(
    String(asNumber(payload.minutesAvailable, 60))
  );
  const [startArea, setStartArea] = useState(selectedItem.volunteerStartArea);
  const [vehicleAccess, setVehicleAccess] = useState(
    asBoolean(payload.hasVehicleAccess) ? "yes" : "no"
  );
  const lowConfidence = useMemo(
    () => new Set(selectedItem.lowConfidenceFields),
    [selectedItem.lowConfidenceFields]
  );

  function requestPayload() {
    const [addressLine1, city] = address.split(",").map((part) => part.trim());

    return {
      ...payload,
      ...contactPatch(contact),
      addressLine1:
        addressLine1 || asText(payload.addressLine1, "Address pending"),
      allergenFlags: Array.isArray(payload.allergenFlags)
        ? payload.allergenFlags
        : [],
      coldChainRequired: asBoolean(payload.coldChainRequired),
      dietaryTags: toTags(dietaryFlags),
      dueBucket: needBy,
      firstName: asText(payload.firstName, "Unknown"),
      householdSize: Number.parseInt(householdSize, 10) || 1,
      lastName: asText(payload.lastName, "Neighbour"),
      message: notes || "Notes pending review.",
      municipality: city || asText(payload.municipality, "Victoria"),
      requestedMealCount: asNumber(payload.requestedMealCount, 2),
    };
  }

  function volunteerPayload() {
    const [homeArea, homeMunicipality] = startArea
      .split(",")
      .map((part) => part.trim());

    return {
      ...payload,
      ...contactPatch(contact),
      canClimbStairs: asBoolean(payload.canClimbStairs),
      canHandleColdChain: asBoolean(payload.canHandleColdChain),
      firstName: asText(payload.firstName, "Unknown"),
      hasVehicleAccess: vehicleAccess === "yes",
      homeArea: homeArea || asText(payload.homeArea, "Victoria"),
      homeMunicipality:
        homeMunicipality || asText(payload.homeMunicipality, "Victoria"),
      lastName: asText(payload.lastName, "Volunteer"),
      message: notes || "Volunteer notes pending review.",
      minutesAvailable: Number.parseInt(availability, 10) || 60,
      windowEnd: asText(payload.windowEnd, "13:00"),
      windowStart: asText(payload.windowStart, "09:00"),
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

  async function handleSave() {
    setIsSubmitting(true);
    setState(null);

    try {
      await saveDraft();
      setState({
        message: "The draft has been saved for coordinator review.",
        status: "success",
      });
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The draft could not be saved.",
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
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
      setState({
        message: "The draft is approved for routing.",
        status: "success",
      });
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The draft could not be approved.",
        status: "error",
      });
    } finally {
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
      setState({
        message: "The draft has been removed from the active queue.",
        status: "success",
      });
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The draft could not be ignored.",
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkOther() {
    if (!selectedItem.draftId) {
      return;
    }

    setIsSubmitting(true);
    setState(null);

    try {
      await parseResponse(
        await fetch(
          `/api/drafts/${encodeURIComponent(selectedItem.draftId)}/other`,
          {
            method: "POST",
          }
        )
      );
      setState({
        message: "The draft has been marked for manual intake triage.",
        status: "success",
      });
      router.refresh();
    } catch (error) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "The draft could not be marked as other.",
        status: "error",
      });
    } finally {
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
          <Field
            label="Address"
            hint={
              lowConfidence.has("addressLine1") ? "Low confidence" : undefined
            }
            htmlFor="draft-address"
          >
            <Input
              id="draft-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </Field>
          <Field label="Contact" htmlFor="draft-contact">
            <Input
              id="draft-contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
          </Field>
          <Field
            label="Need by"
            hint={lowConfidence.has("dueBucket") ? "Low confidence" : undefined}
            htmlFor="need-by"
          >
            <Select
              id="need-by"
              value={needBy}
              onChange={(event) => setNeedBy(event.target.value)}
            >
              <option value="today">today</option>
              <option value="tomorrow">tomorrow</option>
              <option value="later">later</option>
            </Select>
          </Field>
          <Field
            label="Household size"
            hint={
              lowConfidence.has("householdSize") ? "Low confidence" : undefined
            }
            htmlFor="household-size"
          >
            <Input
              id="household-size"
              value={householdSize}
              inputMode="numeric"
              onChange={(event) => setHouseholdSize(event.target.value)}
            />
          </Field>
          <Field label="Dietary flags" htmlFor="dietary-flags">
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
          <Field label="Contact" htmlFor="volunteer-contact">
            <Input
              id="volunteer-contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
            />
          </Field>
          <Field
            label="Availability"
            hint={
              lowConfidence.has("minutesAvailable")
                ? "Low confidence"
                : undefined
            }
            htmlFor="volunteer-availability"
          >
            <Select
              id="volunteer-availability"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </Select>
          </Field>
          <Field
            label="Starting area"
            hint={lowConfidence.has("homeArea") ? "Low confidence" : undefined}
            htmlFor="volunteer-start-area"
          >
            <Input
              id="volunteer-start-area"
              value={startArea}
              onChange={(event) => setStartArea(event.target.value)}
            />
          </Field>
          <Field label="Vehicle access" htmlFor="volunteer-vehicle-access">
            <Select
              id="volunteer-vehicle-access"
              value={vehicleAccess}
              onChange={(event) => setVehicleAccess(event.target.value)}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
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
        hint={lowConfidence.has("message") ? "Low confidence" : undefined}
        htmlFor="draft-notes"
      >
        <Textarea
          id="draft-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        {inboxFields.map((field) => (
          <InsetCard key={field.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted text-sm font-medium">{field.label}</p>
              <Badge
                size="sm"
                tone={
                  field.confidence === "high"
                    ? "success"
                    : field.confidence === "medium"
                      ? "info"
                      : "warning"
                }
              >
                {field.confidence}
              </Badge>
            </div>
            <p className="text-ink text-sm leading-6">{field.value}</p>
          </InsetCard>
        ))}
      </div>

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
          {selectedItem.draftType === "volunteer"
            ? "Approve volunteer"
            : "Approve request"}
        </Button>
        <Button
          fullWidth
          disabled={isSubmitting || selectedItem.draftType === "other"}
          type="button"
          variant="secondary"
          onClick={handleSave}
        >
          Save draft
        </Button>
        <Button
          fullWidth
          disabled={isSubmitting || selectedItem.draftType === "other"}
          type="button"
          variant="quiet"
          onClick={handleMarkOther}
        >
          Mark other
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
