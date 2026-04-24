"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/mealflo/button";
import { MealfloIcon } from "@/components/mealflo/icon";

type AdminInboxRowActionsProps = {
  draftId: string;
  editHref: string;
};

type PendingAction = "approve" | "ignore" | null;

type ActionState = {
  message: string;
  tone: "error" | "success";
} | null;

async function ensureOk(response: Response) {
  const payload = (await response.json()) as {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Draft action failed.");
  }
}

export function AdminInboxRowActions({
  draftId,
  editHref,
}: AdminInboxRowActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [state, setState] = useState<ActionState>(null);
  const isPending = pendingAction !== null;

  async function approve() {
    setPendingAction("approve");
    setState(null);

    try {
      await ensureOk(
        await fetch(`/api/drafts/${encodeURIComponent(draftId)}/approve`, {
          method: "POST",
        })
      );
      setState({ message: "Approved.", tone: "success" });
      router.refresh();
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : "Approval failed.",
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function ignore() {
    setPendingAction("ignore");
    setState(null);

    try {
      await ensureOk(
        await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, {
          method: "DELETE",
        })
      );
      setState({ message: "Ignored.", tone: "success" });
      router.refresh();
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : "Ignore failed.",
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex min-w-[248px] flex-wrap gap-2">
        <Button
          className="w-[86px]"
          disabled={isPending}
          onClick={approve}
          size="sm"
          type="button"
          variant="primary"
          leading={<MealfloIcon name="checkmark-circle" size={16} />}
        >
          {pendingAction === "approve" ? "Saving" : "Approve"}
        </Button>
        <ButtonLink
          className="w-[66px]"
          href={editHref}
          size="sm"
          variant="secondary"
          leading={<MealfloIcon name="pencil-edit" size={16} />}
        >
          Edit
        </ButtonLink>
        <Button
          className="w-[78px]"
          disabled={isPending}
          onClick={ignore}
          size="sm"
          type="button"
          variant="danger"
        >
          {pendingAction === "ignore" ? "Saving" : "Ignore"}
        </Button>
      </div>
      <p
        aria-live="polite"
        className={`min-h-[20px] text-xs leading-5 ${
          state?.tone === "error" ? "text-error-text" : "text-success-text"
        }`}
      >
        {state?.message ?? ""}
      </p>
    </div>
  );
}
