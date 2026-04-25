"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminInboxReview } from "@/components/mealflo/admin-inbox-review";
import { Button } from "@/components/mealflo/button";
import { MealfloIcon } from "@/components/mealflo/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/mealflo/table";
import { cn } from "@/lib/utils";
import type { AdminInboxData, InboxQueueItem } from "@/server/mealflo/backend";

type DraftKind = "request" | "volunteer";

type AdminInboxWorkbenchProps = {
  initialData: AdminInboxData;
};

type LoadState = {
  message: string;
  status: "error" | "idle";
};

const kindTabs: Array<{ key: DraftKind; label: string }> = [
  { key: "request", label: "Clients" },
  { key: "volunteer", label: "Drivers" },
];

function sourceLabel(item: InboxQueueItem) {
  return item.channel === "gmail" ? "Gmail" : "Form";
}

function actionLabel(kind: AdminInboxData["selectedItem"]["draftType"]) {
  return kind === "volunteer" ? "Approve driver" : "Approve request";
}

function rowKind(item: InboxQueueItem): DraftKind | null {
  if (item.draftType === "request" || item.draftType === "volunteer") {
    return item.draftType;
  }

  return null;
}

async function fetchDraftData(draftId: string) {
  const response = await fetch(
    `/api/admin/inbox?draft=${encodeURIComponent(draftId)}`
  );
  const json = (await response.json()) as {
    data?: AdminInboxData;
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || !json.ok || !json.data) {
    throw new Error(json.error ?? "Draft details could not be loaded.");
  }

  return json.data;
}

function RequestReviewModal({
  data,
  loadState,
  onClose,
}: {
  data: AdminInboxData | null;
  loadState: LoadState;
  onClose: () => void;
}) {
  const selected = data?.selectedItem;
  const rawText = selected?.rawParagraphs.join("\n\n").trim();
  const showSource =
    selected?.sourceChannel === "gmail" || selected?.draftType === "volunteer";
  const sourceTitle =
    selected?.sourceChannel === "gmail" ? "Source" : "Form notes";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,28,46,0.34)] px-3 py-4 backdrop-blur-[2px] sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-review-title"
    >
      <div className="border-line max-h-[calc(100vh-2rem)] w-full max-w-[1180px] overflow-hidden rounded-[22px] border-[1.5px] bg-white shadow-[var(--mf-shadow-elevated)]">
        <div className="border-line flex items-start justify-between gap-4 border-b bg-[var(--mf-color-neutral-50)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-muted text-sm font-medium">
              {selected ? sourceLabelFromSelected(selected) : "Review"}
            </p>
            <h3
              id="inbox-review-title"
              className="font-display text-ink mt-1 text-[30px] font-semibold tracking-[-0.02em]"
            >
              {selected?.sender ?? "Loading request"}
            </h3>
          </div>
          <Button
            type="button"
            variant="quiet"
            iconOnly
            aria-label="Close review"
            onClick={onClose}
          >
            <MealfloIcon name="close-x" size={22} />
          </Button>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5 sm:p-6">
          {loadState.status === "error" ? (
            <div className="border-line text-error-text rounded-[16px] border-[1.5px] bg-[var(--mf-color-red-50)] p-4">
              {loadState.message}
            </div>
          ) : selected ? (
            <div
              className={cn(
                "grid gap-5",
                showSource
                  ? "lg:grid-cols-[minmax(260px,0.88fr)_minmax(0,1.12fr)]"
                  : "mx-auto w-full max-w-[680px]"
              )}
            >
              {showSource ? (
                <section className="min-w-0 space-y-3">
                  <h4 className="font-display text-ink text-[22px] font-semibold">
                    {sourceTitle}
                  </h4>
                  <div className="border-line bg-surface-tint text-ink min-h-[360px] rounded-[16px] border-[1.5px] p-4 text-[15px] leading-7 whitespace-pre-wrap">
                    {rawText || "No notes were included with this submission."}
                  </div>
                </section>
              ) : null}

              <section className="min-w-0 space-y-3">
                <h4 className="font-display text-ink text-[22px] font-semibold">
                  Parsed fields
                </h4>
                <AdminInboxReview
                  key={selected.draftId ?? "empty"}
                  selectedItem={selected}
                  primaryActionLabel={actionLabel(selected.draftType)}
                />
              </section>
            </div>
          ) : (
            <div className="border-line rounded-[16px] border-[1.5px] bg-white p-5">
              Loading request details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function sourceLabelFromSelected(selected: AdminInboxData["selectedItem"]) {
  if (selected.sourceChannel === "gmail") {
    return selected.draftType === "volunteer"
      ? "Gmail driver offer"
      : "Gmail request";
  }

  return selected.draftType === "volunteer" ? "Driver form" : "Request form";
}

export function AdminInboxWorkbench({ initialData }: AdminInboxWorkbenchProps) {
  const [activeKind, setActiveKind] = useState<DraftKind>("request");
  const [data, setData] = useState(initialData);
  const [modalData, setModalData] = useState<AdminInboxData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({
    message: "",
    status: "idle",
  });
  const rows = useMemo(
    () => data.inboxItems.filter((item) => rowKind(item) === activeKind),
    [activeKind, data.inboxItems]
  );
  const counts = useMemo(
    () => ({
      request: data.inboxItems.filter((item) => item.draftType === "request")
        .length,
      volunteer: data.inboxItems.filter(
        (item) => item.draftType === "volunteer"
      ).length,
    }),
    [data.inboxItems]
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshInbox() {
      try {
        const nextData = await fetchDraftData("");

        if (!cancelled) {
          setData(nextData);
        }
      } catch {
        // Keep the current inbox visible if a background refresh misses.
      }
    }

    const interval = window.setInterval(() => {
      void refreshInbox();
    }, 1400);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function openReview(item: InboxQueueItem) {
    setLoadState({ message: "", status: "idle" });
    setModalData({
      ...data,
      selectedItem:
        data.selectedItem.draftId === item.id
          ? data.selectedItem
          : {
              ...data.selectedItem,
              draftId: null,
              sender: item.sender,
              subject: item.subject,
            },
    });

    try {
      setModalData(await fetchDraftData(item.id));
    } catch (error) {
      setLoadState({
        message:
          error instanceof Error
            ? error.message
            : "Draft details could not be loaded.",
        status: "error",
      });
    }
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-ink text-[30px] font-semibold tracking-[-0.02em]">
          New requests
        </h2>
        <div
          className="border-line inline-grid w-full max-w-[360px] grid-cols-2 rounded-full border-[1.5px] bg-white p-1"
          aria-label="New request type"
        >
          {kindTabs.map((tab) => {
            const active = activeKind === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                aria-pressed={active}
                className={cn(
                  "min-h-[44px] rounded-full px-4 text-sm font-semibold transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                  active
                    ? "bg-[var(--mf-color-yellow-300)]"
                    : "hover:bg-[var(--mf-color-yellow-50)]"
                )}
                style={{
                  color: active
                    ? "var(--mf-color-ink)"
                    : "var(--mf-color-muted)",
                }}
                onClick={() => setActiveKind(tab.key)}
              >
                {tab.label} ({counts[tab.key]})
              </button>
            );
          })}
        </div>
      </div>

      <Table className="w-full min-w-[720px]">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-[34%] py-3">Name</TableHeaderCell>
            <TableHeaderCell className="w-[34%] py-3">Note</TableHeaderCell>
            <TableHeaderCell className="w-[14%] py-3">Source</TableHeaderCell>
            <TableHeaderCell className="w-[18%] py-3 text-right">
              Action
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((item) => (
              <TableRow
                key={item.id}
                className="animate-[mfInboxPop_320ms_var(--mf-ease-spring)] transition-[background-color,border-color] duration-[var(--mf-duration-base)] hover:bg-[rgba(253,248,228,0.48)]"
              >
                <TableCell className="py-3.5 align-middle">
                  <p className="text-ink font-semibold">{item.sender}</p>
                  <p className="text-muted mt-0.5 text-sm leading-5">
                    {item.address}
                  </p>
                </TableCell>
                <TableCell className="py-3.5 align-middle">
                  <p className="text-ink font-medium">{item.subject}</p>
                  <p className="text-muted mt-0.5 text-sm leading-5">
                    {item.snippet}
                  </p>
                </TableCell>
                <TableCell className="py-3.5 align-middle">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink font-medium">
                      {sourceLabel(item)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex min-h-[28px] items-center gap-2 rounded-full border-[1.5px] px-2.5 text-xs font-semibold",
                        item.isParsing
                          ? "text-info-text border-[rgba(120,144,250,0.35)] bg-[var(--mf-color-blue-50)]"
                          : "text-success-text border-[rgba(78,173,111,0.28)] bg-[var(--mf-color-green-50)]"
                      )}
                    >
                      {item.isParsing ? (
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 animate-pulse rounded-full bg-[var(--mf-color-blue-300)]"
                        />
                      ) : null}
                      {item.isParsing ? "Parsing" : "Ready"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 text-right align-middle">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leading={<MealfloIcon name="pencil-edit" size={18} />}
                    disabled={item.isParsing}
                    onClick={() => void openReview(item)}
                  >
                    {item.isParsing ? "Parsing" : "Review"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-muted py-8 text-center">
                No {activeKind === "request" ? "client" : "driver"} requests are
                waiting.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {modalData ? (
        <RequestReviewModal
          data={modalData}
          loadState={loadState}
          onClose={() => setModalData(null)}
        />
      ) : null}
    </section>
  );
}
