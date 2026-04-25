"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminInboxReview } from "@/components/mealflo/admin-inbox-review";
import { Button } from "@/components/mealflo/button";
import { MealfloIcon } from "@/components/mealflo/icon";
import { ModalLayer } from "@/components/mealflo/modal-layer";
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

type DraftKind = "other" | "request" | "volunteer";

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
  { key: "other", label: "Other" },
];

function sourceLabel(item: InboxQueueItem) {
  return item.channel === "gmail" ? "Gmail" : "Form";
}

function actionLabel(kind: AdminInboxData["selectedItem"]["draftType"]) {
  if (kind === "volunteer") {
    return "Approve driver";
  }

  if (kind === "other") {
    return "Needs triage";
  }

  return "Approve request";
}

function rowKind(item: InboxQueueItem): DraftKind {
  return item.draftType === "request" || item.draftType === "volunteer"
    ? item.draftType
    : "other";
}

async function fetchDraftData(
  draftId?: string,
  options: { syncGmail?: boolean } = {}
) {
  const params = new URLSearchParams();

  if (draftId) {
    params.set("draft", draftId);
  }

  if (options.syncGmail) {
    params.set("sync", "gmail");
  }

  const response = await fetch(`/api/admin/inbox?${params.toString()}`);
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
  onResolved,
}: {
  data: AdminInboxData | null;
  loadState: LoadState;
  onClose: () => void;
  onResolved: (draftId: string) => void;
}) {
  const selected = data?.selectedItem;
  const rawText = selected?.rawParagraphs.join("\n\n").trim();
  const isOther = selected?.draftType === "other";
  const showSource = Boolean(rawText);
  const sourceTitle =
    selected?.sourceChannel === "gmail" ? "Source" : "Form notes";

  return (
    <ModalLayer
      className="flex animate-[mfModalBackdropIn_180ms_var(--mf-ease-out)] items-center justify-center bg-[rgba(28,28,46,0.34)] px-3 py-4 backdrop-blur-[2px] sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-review-title"
    >
      <div className="border-line max-h-[calc(100vh-2rem)] w-full max-w-[1180px] animate-[mfModalPanelIn_260ms_var(--mf-ease-spring)] overflow-hidden rounded-[22px] border-[1.5px] bg-white shadow-[var(--mf-shadow-elevated)]">
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
            iconOnly
            aria-label="Close review"
            className="min-h-[48px] border-transparent bg-transparent p-0 text-[var(--mf-color-muted)] hover:-translate-y-0.5 hover:border-transparent hover:bg-transparent hover:text-[var(--mf-color-ink)]"
            onClick={onClose}
          >
            <MealfloIcon name="close-x" size={28} />
          </Button>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-5 sm:p-6">
          {loadState.status === "error" ? (
            <div className="border-line text-error-text rounded-[16px] border-[1.5px] bg-[var(--mf-color-red-50)] p-4">
              {loadState.message}
            </div>
          ) : selected && isOther ? (
            <section className="mx-auto w-full max-w-[780px] space-y-3">
              <h4 className="font-display text-ink text-[22px] font-semibold">
                Message
              </h4>
              <div className="border-line bg-surface-tint text-ink min-h-[360px] rounded-[16px] border-[1.5px] p-4 text-[15px] leading-7 whitespace-pre-wrap">
                {rawText || "No message body was included."}
              </div>
            </section>
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
                <section className="grid min-w-0 content-start gap-4">
                  <h4 className="font-display text-ink text-[22px] font-semibold">
                    {sourceTitle}
                  </h4>
                  <div className="border-line bg-surface-tint text-ink rounded-[16px] border-[1.5px] p-4 text-[15px] leading-7 whitespace-pre-wrap">
                    {rawText}
                  </div>
                  <p className="text-muted inline-flex items-center gap-1.5 text-xs font-medium leading-5">
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
                      <path d="M19 14l.7 1.9L21.6 17l-1.9.7L19 19.6l-.7-1.9L16.4 17l1.9-1.1z" />
                    </svg>
                    Fields on the right were parsed from this message with AI — review before approving.
                  </p>
                </section>
              ) : null}

              <section className="grid min-w-0 content-start gap-6">
                <h4 className="font-display text-ink text-[22px] font-semibold">
                  Parsed fields
                </h4>
                <AdminInboxReview
                  key={selected.draftId ?? "empty"}
                  selectedItem={selected}
                  onResolved={onResolved}
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
    </ModalLayer>
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
  const [openingDraftId, setOpeningDraftId] = useState<string | null>(null);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
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
      other: data.inboxItems.filter((item) => rowKind(item) === "other").length,
    }),
    [data.inboxItems]
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshInbox(options: { syncGmail?: boolean } = {}) {
      try {
        const nextData = await fetchDraftData(undefined, options);

        if (!cancelled) {
          setData(nextData);
        }
      } catch {
        // Keep the current inbox visible if a background refresh misses.
      }
    }

    void refreshInbox({ syncGmail: true });

    const interval = window.setInterval(() => {
      void refreshInbox();
    }, 1400);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function syncGmail() {
    setIsSyncingGmail(true);

    try {
      setData(await fetchDraftData(undefined, { syncGmail: true }));
    } finally {
      setIsSyncingGmail(false);
    }
  }

  async function openReview(item: InboxQueueItem) {
    setLoadState({ message: "", status: "idle" });
    setOpeningDraftId(item.id);

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
      setModalData({
        ...data,
        selectedItem: {
          ...data.selectedItem,
          draftId: null,
          sender: item.sender,
          subject: item.subject,
        },
      });
    } finally {
      setOpeningDraftId(null);
    }
  }

  function handleDraftResolved(draftId: string) {
    setModalData(null);
    setData((current) => ({
      ...current,
      inboxItems: current.inboxItems.filter((item) => item.id !== draftId),
    }));
    void fetchDraftData()
      .then((nextData) => setData(nextData))
      .catch(() => {
        // The optimistic removal keeps the demo moving if a refresh blips.
      });
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-ink text-[30px] font-semibold tracking-[-0.02em]">
            New requests
          </h2>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            iconOnly
            aria-label={isSyncingGmail ? "Checking Gmail" : "Check Gmail"}
            disabled={isSyncingGmail}
            className="mt-1 size-11 p-0"
            onClick={() => void syncGmail()}
          >
            <MealfloIcon name="repeat-arrows" size={24} />
          </Button>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div
            className="border-line inline-grid w-full grid-cols-3 rounded-full border-[1.5px] bg-white p-1 sm:w-[460px]"
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
      </div>

      <Table
        className="w-full min-w-[760px] table-fixed"
        wrapperClassName="min-h-[402px]"
      >
        <colgroup>
          <col className="w-[36%]" />
          <col className="w-[46%]" />
          <col className="w-[12%]" />
          <col className="w-[6%]" />
        </colgroup>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="py-3">Name</TableHeaderCell>
            <TableHeaderCell className="py-3">Note</TableHeaderCell>
            <TableHeaderCell className="py-3">Source</TableHeaderCell>
            <TableHeaderCell
              aria-label="Open"
              className="py-3 text-right"
            />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((item) => {
              const isOpening = openingDraftId === item.id;

              const isOther = rowKind(item) === "other";
              const showAddress = !isOther && Boolean(item.address);
              const rowDisabled = item.isParsing || openingDraftId !== null;
              const openItem = () => {
                if (rowDisabled) {
                  return;
                }
                void openReview(item);
              };

              return (
                <TableRow
                  key={item.id}
                  aria-busy={isOpening}
                  className={cn(
                    "group/row h-[108px] transition-[background-color,border-color] duration-[var(--mf-duration-base)] hover:bg-[rgba(253,248,228,0.48)]",
                    rowDisabled
                      ? "cursor-default opacity-90"
                      : "cursor-pointer focus-within:bg-[rgba(240,243,255,0.6)]"
                  )}
                  onClick={openItem}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openItem();
                    }
                  }}
                  tabIndex={rowDisabled ? -1 : 0}
                  role="button"
                  aria-label={`Open ${item.sender} review`}
                >
                  <TableCell className="py-3.5 align-middle">
                    <p className="text-ink truncate font-semibold">
                      {item.sender}
                    </p>
                    {showAddress ? (
                      <p className="text-muted mt-0.5 truncate text-sm leading-5">
                        {item.address}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-3.5 align-middle">
                    <p className="text-ink truncate font-medium">
                      {item.subject}
                    </p>
                    <p className="text-muted mt-0.5 line-clamp-2 text-sm leading-5">
                      {item.snippet}
                    </p>
                  </TableCell>
                  <TableCell className="py-3.5 align-middle">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-ink font-medium">
                        {sourceLabel(item)}
                      </span>
                      {item.isParsing ? (
                        <span className="text-info-text border-[rgba(120,144,250,0.35)] bg-[var(--mf-color-blue-50)] inline-flex min-h-[28px] items-center gap-2 rounded-full border-[1.5px] px-2.5 text-xs font-semibold">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 animate-pulse rounded-full bg-[var(--mf-color-blue-300)]"
                          />
                          Parsing
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5 pr-3 text-right align-middle">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "border-line text-muted inline-flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] bg-white transition-[transform,background-color,color] duration-[var(--mf-duration-base)] ease-out",
                        rowDisabled
                          ? "opacity-60"
                          : "group-hover/row:border-line-strong group-hover/row:text-ink group-hover/row:translate-x-0.5"
                      )}
                    >
                      {isOpening ? (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--mf-color-blue-300)]" />
                      ) : (
                        <svg
                          aria-hidden="true"
                          fill="none"
                          height="14"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                          width="14"
                        >
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted h-[324px] py-8 text-center align-middle"
              >
                No{" "}
                {activeKind === "request"
                  ? "client"
                  : activeKind === "volunteer"
                    ? "driver"
                    : "manual triage"}{" "}
                requests are waiting.
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
          onResolved={handleDraftResolved}
        />
      ) : null}
    </section>
  );
}
