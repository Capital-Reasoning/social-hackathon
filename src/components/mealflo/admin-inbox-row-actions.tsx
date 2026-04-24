"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/mealflo/button";

type AdminInboxRowActionsProps = {
  draftId: string;
  editHref: string;
};

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
  const [isPending, setIsPending] = useState(false);

  async function approve() {
    setIsPending(true);

    try {
      await ensureOk(
        await fetch(`/api/drafts/${encodeURIComponent(draftId)}/approve`, {
          method: "POST",
        })
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function ignore() {
    setIsPending(true);

    try {
      await ensureOk(
        await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, {
          method: "DELETE",
        })
      );
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={isPending}
        onClick={approve}
        size="sm"
        type="button"
        variant="primary"
      >
        Approve
      </Button>
      <ButtonLink href={editHref} size="sm" variant="secondary">
        Edit
      </ButtonLink>
      <Button
        disabled={isPending}
        onClick={ignore}
        size="sm"
        type="button"
        variant="danger"
      >
        Ignore
      </Button>
    </div>
  );
}
