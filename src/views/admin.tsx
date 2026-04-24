import { Badge } from "@/components/mealflo/badge";
import { AdminDirectoryTable } from "@/components/mealflo/admin-directory-table";
import { AdminInboxRowActions } from "@/components/mealflo/admin-inbox-row-actions";
import { AdminInboxReview } from "@/components/mealflo/admin-inbox-review";
import { AdminInventoryWorkflows } from "@/components/mealflo/admin-inventory-workflows";
import { AdminRouteActions } from "@/components/mealflo/admin-route-actions";
import { ButtonLink } from "@/components/mealflo/button";
import { Card } from "@/components/mealflo/card";
import {
  PageFrame,
  PageHeader,
  StatusPill,
  TopBar,
} from "@/components/mealflo/layout";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/mealflo/table";
import {
  getAdminDashboardData,
  getAdminInboxData,
  getAdminInventoryData,
  getAdminRoutesData,
  type DriverCapacityCard,
  type InboxQueueItem,
  type RoutePlanCard,
  type RouteSummaryCard,
  type TriageBucket,
  type TriageRequestCard,
} from "@/server/mealflo/backend";

import { MealfloIcon, type IconName } from "@/components/mealflo/icon";

export type AdminNavKey = "dashboard" | "inbox" | "routes" | "inventory";

const adminNav = [
  { key: "dashboard", label: "Dashboard", icon: "home-house" },
  {
    key: "inbox",
    label: "Inbox",
    icon: "notification-bell",
  },
  { key: "routes", label: "Routes", icon: "route-road" },
  {
    key: "inventory",
    label: "Inventory",
    icon: "fridge",
  },
] as const satisfies readonly {
  icon: IconName;
  key: AdminNavKey;
  label: string;
}[];

const routeStatusConfig = {
  attention: { label: "Needs attention", tone: "warning" as const },
  "on-track": { label: "On track", tone: "success" as const },
  ready: { label: "Ready to assign", tone: "info" as const },
};

function RouteStatusBadge({ status }: { status: RouteSummaryCard["status"] }) {
  const config = routeStatusConfig[status];

  return <Badge tone={config.tone}>{config.label}</Badge>;
}

function requestStatusTone(status: TriageRequestCard["status"]) {
  if (status === "held") {
    return "warning" as const;
  }

  if (status === "delivered") {
    return "success" as const;
  }

  if (status === "assigned" || status === "out_for_delivery") {
    return "info" as const;
  }

  return "primary" as const;
}

function displayKitchenLabel(value: string) {
  return value
    .replace(/cold-chain/gi, "needs refrigeration")
    .replace(/Cold chain/g, "Needs refrigeration")
    .replace(/Fridge/g, "Needs refrigeration");
}

function urgencyValue(value: string) {
  const numeric = Number.parseInt(value, 10);

  if (!Number.isFinite(numeric)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.round(numeric / 10)));
}

function urgencyTone(value: number) {
  if (value >= 9) {
    return "border-[rgba(224,80,80,0.24)] bg-[var(--mf-color-red-50)] text-error-text";
  }

  if (value >= 8) {
    return "border-[rgba(240,168,48,0.3)] bg-[var(--mf-color-amber-50)] text-warning-text";
  }

  return "border-[rgba(24,24,60,0.12)] bg-[rgba(255,255,255,0.76)] text-muted";
}

function formatAdminMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function adminHref(key: AdminNavKey, demoMode: boolean) {
  if (demoMode) {
    return key === "dashboard" ? "/demo/admin" : `/demo/admin?view=${key}`;
  }

  if (key === "dashboard") {
    return "/admin";
  }

  return `/admin/${key}`;
}

function AdminTopBar({
  active,
  demoMode,
}: {
  active: AdminNavKey;
  demoMode: boolean;
}) {
  return (
    <TopBar
      activeKey={active}
      nav={adminNav.map((item) => ({
        ...item,
        href: adminHref(item.key, demoMode),
      }))}
    />
  );
}

function ReadyRequestsTable({
  buckets,
  limit = 8,
}: {
  buckets: Record<TriageBucket, TriageRequestCard[]>;
  limit?: number;
}) {
  const rows = buckets.today.slice(0, limit);

  return (
    <div className="min-w-0 overflow-hidden">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-line text-muted border-b-[1.5px] text-xs font-semibold tracking-[0.08em] uppercase">
            <th className="py-2.5 pr-3">Neighbor</th>
            <th className="py-2.5 pr-3">Urgency</th>
            <th className="py-2.5 pr-3 text-right">Meals</th>
            <th className="py-2.5 pr-0">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((request) => {
            const urgency = urgencyValue(request.urgency);

            return (
            <tr
              key={request.id}
              className="border-line/70 border-b last:border-b-0"
            >
              <td className="py-2.5 pr-3">
                <p className="text-ink font-medium">{request.clientName}</p>
                <p className="text-muted mt-0.5 truncate text-sm leading-5">
                  {request.address}
                </p>
              </td>
              <td className="py-2.5 pr-3">
                <span
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border-[1.5px] px-2 text-sm font-semibold ${urgencyTone(urgency)}`}
                >
                  {urgency}
                </span>
              </td>
              <td className="text-ink py-2.5 pr-3 text-right font-medium">
                {request.mealCount}
              </td>
              <td className="py-2.5 pr-0">
                <Badge size="sm" tone={requestStatusTone(request.status)}>
                  {request.statusLabel}
                </Badge>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DashboardSectionHeader({
  action,
  note,
  title,
}: {
  action?: React.ReactNode;
  note?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-display text-ink text-[28px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        {note ? (
          <p className="text-muted max-w-[44rem] text-sm leading-6">{note}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function dashboardKpiCopy(item: { id: string; label: string; value: string }) {
  switch (item.id) {
    case "new-intake":
      return { metric: `${item.value} items`, status: "Waiting for review" };
    case "ready-today":
      return { metric: `${item.value} requests`, status: "Ready today" };
    case "routes-ready":
      return { metric: `${item.value} routes`, status: "Ready to assign" };
    case "meals-staged":
      return { metric: `${item.value} meals`, status: "Ready for delivery" };
    default:
      return { metric: `${item.value} ${item.label}`, status: item.label };
  }
}

function SummaryStatusStrip({
  items,
}: {
  items: Array<{
    icon: IconName;
    id: string;
    metric: string;
    status: string;
  }>;
}) {
  return (
    <section className="border-line rounded-[16px] border-[1.5px] bg-white px-4 py-3 sm:px-5">
      <div className="grid divide-y divide-[rgba(24,24,60,0.08)] sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        {items.map((item) => {
          return (
            <div
              key={item.id}
              className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0 xl:first:pl-0"
            >
              <MealfloIcon name={item.icon} size={38} />
              <div className="min-w-0">
                <p className="font-display text-ink text-[26px] leading-none font-bold tracking-[-0.02em]">
                  {item.metric}
                </p>
                <p className="text-muted mt-1 text-sm font-medium">
                  {item.status}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DashboardSummaryCard({
  items,
}: {
  items: Array<{
    icon: string;
    id: string;
    label: string;
    value: string;
  }>;
}) {
  return (
    <SummaryStatusStrip
      items={items.map((item) => {
        const copy = dashboardKpiCopy(item);

        return {
          icon: item.icon as IconName,
          id: item.id,
          metric: copy.metric,
          status: copy.status,
        };
      })}
    />
  );
}

function InboxRequestsTable({
  editHrefFor,
  selectedDraftId,
  items,
}: {
  editHrefFor: (draftId: string) => string;
  selectedDraftId?: string | null;
  items: InboxQueueItem[];
}) {
  return (
    <Table className="min-w-[860px]">
      <TableHead>
        <TableRow>
          <TableHeaderCell className="w-[16%] py-2.5">Source</TableHeaderCell>
          <TableHeaderCell className="w-[27%] py-2.5">Request</TableHeaderCell>
          <TableHeaderCell className="w-[29%] py-2.5">
            Parsed details
          </TableHeaderCell>
          <TableHeaderCell className="w-[10%] py-2.5">
            Confidence
          </TableHeaderCell>
          <TableHeaderCell className="w-[18%] py-2.5">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className={
              item.id === selectedDraftId
                ? "bg-[rgba(240,243,255,0.46)]"
                : undefined
            }
          >
            <TableCell className="py-2.5 align-top">
              <div className="space-y-1">
                <Badge
                  size="sm"
                  tone={item.channel === "gmail" ? "info" : "neutral"}
                >
                  {item.channel === "gmail" ? "Gmail" : "Form"}
                </Badge>
                <p className="text-muted text-xs leading-5">
                  {item.draftType === "volunteer"
                    ? "Volunteer"
                    : item.draftType === "request"
                      ? "Request"
                      : "Other"}
                </p>
              </div>
            </TableCell>
            <TableCell className="py-2.5 align-top">
              <div className="space-y-1">
                <p className="text-ink font-medium">{item.sender}</p>
                <p className="text-muted text-xs leading-5">
                  {displayKitchenLabel(item.subject)}
                </p>
              </div>
            </TableCell>
            <TableCell className="py-2.5 align-top">
              <div className="space-y-1">
                <p className="text-ink font-medium">{item.address}</p>
                <p className="text-muted line-clamp-2 text-xs leading-5">
                  {displayKitchenLabel(item.snippet)}
                </p>
              </div>
            </TableCell>
            <TableCell className="py-2.5 align-top">
              <div className="space-y-1">
                <p className="font-display text-ink text-lg leading-none font-semibold">
                  {item.confidence}
                </p>
                <Badge
                  size="sm"
                  tone={item.status === "low confidence" ? "warning" : "info"}
                >
                  {item.status}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="py-2.5 align-top">
              <AdminInboxRowActions
                draftId={item.id}
                editHref={editHrefFor(item.id)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DriverCapacityTable({ drivers }: { drivers: DriverCapacityCard[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Driver</TableHeaderCell>
          <TableHeaderCell>Availability</TableHeaderCell>
          <TableHeaderCell>Start area</TableHeaderCell>
          <TableHeaderCell>Vehicle</TableHeaderCell>
          <TableHeaderCell>Fit</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {drivers.map((driver) => (
          <TableRow key={driver.id}>
            <TableCell className="text-ink font-medium">
              {driver.name}
            </TableCell>
            <TableCell>
              <Badge size="sm" tone="info">
                {driver.availability}
              </Badge>
              <span className="text-muted ml-2">{driver.window}</span>
            </TableCell>
            <TableCell className="text-muted">{driver.startArea}</TableCell>
            <TableCell>{driver.vehicle}</TableCell>
            <TableCell>
              <div className="flex min-w-[220px] flex-wrap gap-2">
                {driver.tags.map((tag) => (
                  <Badge
                    key={tag}
                    size="sm"
                    tone={/cooler|lift/i.test(tag) ? "warning" : "neutral"}
                  >
                    {displayKitchenLabel(tag)}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RoutePlansTable({ plans }: { plans: RoutePlanCard[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Route</TableHeaderCell>
          <TableHeaderCell>Driver</TableHeaderCell>
          <TableHeaderCell>Time</TableHeaderCell>
          <TableHeaderCell>Stops</TableHeaderCell>
          <TableHeaderCell>Inventory fit</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell>
              <div className="min-w-[220px] space-y-1">
                <RouteStatusBadge status={plan.status} />
                <p className="text-ink font-medium">{plan.name}</p>
                <p className="text-muted text-xs leading-5">
                  {displayKitchenLabel(plan.reason)}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <p className="text-ink font-medium">{plan.driver}</p>
              <p className="text-muted text-xs leading-5">{plan.vehicle}</p>
            </TableCell>
            <TableCell>
              <p className="font-display text-lg font-semibold">
                {plan.totalPlannedTime}
              </p>
              <p className="text-muted text-xs leading-5">
                {plan.driveTime} drive
              </p>
            </TableCell>
            <TableCell>{plan.stopCount}</TableCell>
            <TableCell>
              <div className="flex min-w-[180px] flex-wrap gap-2">
                <Badge size="sm" tone="success">
                  {plan.utilization} capacity
                </Badge>
                {plan.warnings.map((warning) => (
                  <Badge key={warning} size="sm" tone="warning">
                    {displayKitchenLabel(warning)}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RoutedPeopleTable({ requests }: { requests: TriageRequestCard[] }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Address</TableHeaderCell>
          <TableHeaderCell>Urgency</TableHeaderCell>
          <TableHeaderCell>Meals</TableHeaderCell>
          <TableHeaderCell>Household</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Bring / watch</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="text-ink font-medium">
              {request.clientName}
            </TableCell>
            <TableCell className="text-muted">{request.address}</TableCell>
            <TableCell className="font-medium">{request.urgency}</TableCell>
            <TableCell>{request.mealCount}</TableCell>
            <TableCell>{request.householdSize}</TableCell>
            <TableCell>
              <Badge size="sm" tone={requestStatusTone(request.status)}>
                {request.statusLabel}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex min-w-[180px] flex-wrap gap-2">
                {request.safetyNotes.length > 0 ? (
                  request.safetyNotes.map((note) => (
                    <Badge key={note} size="sm" tone="warning">
                      {displayKitchenLabel(note)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted text-sm">Standard meal bag</span>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AdminFrame({
  active,
  children,
  demoMode = false,
}: {
  active: AdminNavKey;
  children: React.ReactNode;
  demoMode?: boolean;
}) {
  return (
    <div className="bg-bg min-h-screen">
      <AdminTopBar active={active} demoMode={demoMode} />
      <PageFrame>{children}</PageFrame>
    </div>
  );
}

export async function AdminDashboardView() {
  const data = await getAdminDashboardData();
  const activeDriverMarkers = data.liveMarkers.filter((marker) =>
    marker.id.startsWith("driver-")
  );
  const activeDriverCount = activeDriverMarkers.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's operations"
        note="New intake, approved stops, live driver movement, and meal pressure stay visible in one pass."
      />

      <DashboardSummaryCard items={data.dashboardKpis} />

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
        <section className="space-y-3">
          <DashboardSectionHeader
            title="Live map"
            action={
              <StatusPill
                icon="route-road"
                label={`${activeDriverCount} active`}
                tone="info"
              />
            }
          />
          <MapCanvas
            className="h-[640px]"
            initialView="greater-victoria"
            markers={activeDriverMarkers}
          />
        </section>

        <section className="flex min-w-0 flex-col space-y-3">
          <DashboardSectionHeader title="Ready today" />
          <div className="border-line flex h-[640px] min-w-0 flex-col overflow-hidden rounded-[16px] border-[1.5px] bg-white px-4 py-3">
            <ReadyRequestsTable buckets={data.requestBuckets} />
            <div className="border-line/70 mt-auto flex border-t pt-3">
              <ButtonLink
                className="h-[58px] text-lg"
                fullWidth
                href="/demo/admin?view=routes"
                size="lg"
                variant="primary"
                leading={<MealfloIcon name="route-road" size={34} />}
              >
                View all
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export async function AdminInboxView({
  demoMode = false,
  draftId,
}: {
  demoMode?: boolean;
  draftId?: string | null;
}) {
  const data = await getAdminInboxData(draftId);
  const editHrefFor = (draftId: string) =>
    demoMode
      ? `/demo/admin?view=inbox&draft=${draftId}`
      : `/admin/inbox?draft=${draftId}`;
  const selectedDraftId = data.selectedItem.draftId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        note="Review parsed requests, approve the clean ones, and keep the people directory close."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,430px)]">
        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader
            title="New requests"
            note="Source, summary, parsed destination, confidence, and actions stay visible."
            action={
              <Badge tone="warning">{data.inboxItems.length} waiting</Badge>
            }
          />
          <InboxRequestsTable
            editHrefFor={editHrefFor}
            selectedDraftId={selectedDraftId}
            items={data.inboxItems}
          />
        </section>

        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader
            title="Review details"
            note="Use edit from the queue to choose a draft."
          />
          <div className="border-line min-w-0 overflow-hidden rounded-[16px] border-[1.5px] bg-white p-4">
            {selectedDraftId ? (
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-ink font-medium">
                      {data.selectedItem.sender}
                    </p>
                    <p className="text-muted text-sm leading-5">
                      {data.selectedItem.subject}
                    </p>
                  </div>
                  <Badge
                    size="sm"
                    tone={
                      data.selectedItem.parserConfidence.startsWith("9") ||
                      data.selectedItem.parserConfidence === "100%"
                        ? "success"
                        : "warning"
                    }
                  >
                    {data.selectedItem.parserConfidence}
                  </Badge>
                </div>
                <div className="border-line bg-surface-tint rounded-[12px] border-[1.5px] p-3">
                  <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
                    Source text
                  </p>
                  <p className="text-ink mt-1 text-sm leading-6">
                    {displayKitchenLabel(
                      data.selectedItem.rawParagraphs[0] ??
                        data.selectedItem.summary
                    )}
                  </p>
                </div>
              </div>
            ) : null}
            <AdminInboxReview
              key={data.selectedItem.draftId ?? "empty"}
              inboxFields={data.inboxFields}
              selectedItem={data.selectedItem}
            />
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <DashboardSectionHeader
          title="Clients and drivers"
          note="Filter the active directory without leaving the inbox."
        />
        <AdminDirectoryTable rows={data.directoryRows} />
      </section>
    </div>
  );
}

export async function AdminRoutesView() {
  const data = await getAdminRoutesData();
  const laterRequests = [
    ...data.requestBuckets.tomorrow,
    ...data.requestBuckets.later,
  ];
  const plannedMinutesByBucket = {
    later: 0,
    today: 0,
    tomorrow: 0,
  } satisfies Record<TriageBucket, number>;
  const plannedRouteCountsByBucket = {
    later: 0,
    today: 0,
    tomorrow: 0,
  } satisfies Record<TriageBucket, number>;

  for (const plan of data.routePlans) {
    plannedMinutesByBucket[plan.serviceBucket] += plan.plannedTotalMinutes;
    plannedRouteCountsByBucket[plan.serviceBucket] += 1;
  }

  const timeNeededRows = [
    {
      label: "Today",
      minutes: plannedMinutesByBucket.today,
      routeCount: plannedRouteCountsByBucket.today,
    },
    {
      label: "Tomorrow",
      minutes: plannedMinutesByBucket.tomorrow,
      routeCount: plannedRouteCountsByBucket.tomorrow,
    },
    {
      label: "Rest of week",
      minutes: plannedMinutesByBucket.later,
      routeCount: plannedRouteCountsByBucket.later,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan routes"
        note="Driver availability and route length sit above the request tables so assignment stays practical."
        actions={<AdminRouteActions selectedRouteId={data.selectedRoute.id} />}
      />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-3">
          <DashboardSectionHeader
            title="Estimated route hours"
            note="Plan route length before assigning drivers."
          />
          <Card className="overflow-hidden p-0">
            <div className="divide-line/70 divide-y">
              {timeNeededRows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-2 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center xl:grid-cols-1 xl:items-start"
                >
                  <p className="font-display text-ink text-[22px] leading-none font-semibold tracking-[-0.01em]">
                    {row.label}
                  </p>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:justify-end xl:justify-start">
                    <p className="font-display text-ink text-[34px] leading-none font-bold tracking-[-0.02em]">
                      {formatAdminMinutes(row.minutes)}
                    </p>
                    <p className="text-muted text-sm font-medium">
                      {row.routeCount}{" "}
                      {row.routeCount === 1 ? "route" : "routes"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader
            title="Driver availability"
            note="Use availability length, starting area, and vehicle fit before assigning route length."
          />
          <DriverCapacityTable drivers={data.driverCapacity} />
        </section>
      </div>

      <section className="space-y-3">
        <DashboardSectionHeader
          title="Today's deliveries"
          note="Today stays first and compact."
          action={
            <Badge tone="warning">{data.requestBuckets.today.length}</Badge>
          }
        />
        <RoutedPeopleTable requests={data.requestBuckets.today} />
      </section>

      <section className="space-y-3">
        <DashboardSectionHeader
          title="Later deliveries"
          note="Tomorrow and later stay below today's work."
          action={<Badge tone="info">{laterRequests.length}</Badge>}
        />
        <RoutedPeopleTable requests={laterRequests} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="space-y-3">
          <DashboardSectionHeader
            title="Route map"
            note="The selected route uses the same detailed street map as the dashboard."
          />
          <MapCanvas
            className="h-[420px]"
            initialView="greater-victoria"
            markers={data.liveMarkers}
            path={data.routeLine}
          />
        </section>

        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader
            title="Route options"
            note="Inventory and timing stay visible before a driver is assigned."
          />
          <RoutePlansTable plans={data.routePlans} />
        </section>
      </div>

      <section className="space-y-3">
        <DashboardSectionHeader
          title="Bring from inventory"
          note="Driver loadout is named per stop so the food handoff is clear."
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Stop</TableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell>Bring from inventory</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.stopRows.map((stop) => (
              <TableRow key={stop.id}>
                <TableCell className="text-ink font-medium">
                  {stop.name}
                </TableCell>
                <TableCell className="text-muted">{stop.address}</TableCell>
                <TableCell>
                  <div className="min-w-[240px] space-y-2">
                    <p>{displayKitchenLabel(stop.items)}</p>
                    {stop.warnings.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {stop.warnings.map((warning) => (
                          <Badge
                            key={warning}
                            size="sm"
                            tone={
                              /refrigeration|fridge|allergy/i.test(warning)
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {displayKitchenLabel(warning)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    size="sm"
                    tone={stop.status === "Now" ? "warning" : "info"}
                  >
                    {stop.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

export async function AdminInventoryView() {
  const data = await getAdminInventoryData();
  const inventorySummaryItems = data.inventoryKpis.map((item) => {
    if (item.id === "route-ready-meals") {
      return {
        icon: "meal-container" as const,
        id: item.id,
        metric: `${item.value} meals`,
        status: "Route-ready",
      };
    }

    if (item.id === "refrigerated-meals") {
      return {
        icon: "snowflake" as const,
        id: item.id,
        metric: `${item.value} chilled`,
        status: "Need cooler capacity",
      };
    }

    if (item.id === "shortage-holds") {
      return {
        icon: "warning-alert" as const,
        id: item.id,
        metric: `${item.value} holds`,
        status: "Shortage review",
      };
    }

    return {
      icon: "fridge" as const,
      id: item.id,
      metric: `${item.value} perishables`,
      status: "Use first",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" />

      <SummaryStatusStrip items={inventorySummaryItems} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
        <section className="space-y-3">
          <DashboardSectionHeader
            title="Deliverable meals"
            note="Named meal items are the only food layer used by route allocation and drivers."
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Meal</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Quantity</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.meals.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex min-w-[220px] items-start gap-3">
                      <MealfloIcon name="meal-container" size={30} />
                      <div className="space-y-1">
                        <p className="text-ink font-medium">{item.name}</p>
                        {item.sourceNote ? (
                          <p className="text-muted text-sm leading-6">
                            {displayKitchenLabel(item.sourceNote)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted">{item.category}</TableCell>
                  <TableCell className="font-display text-lg font-semibold">
                    {item.quantity}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        size="sm"
                        tone={item.status === "low" ? "warning" : "success"}
                      >
                        {item.status === "low" ? "Low" : "Ready"}
                      </Badge>
                      {item.tags.map((tag) => (
                        <Badge
                          key={tag}
                          size="sm"
                          tone={
                            /fridge|refrigeration/i.test(tag)
                              ? "info"
                              : "neutral"
                          }
                        >
                          {displayKitchenLabel(tag)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="space-y-3">
          <DashboardSectionHeader
            title="Ingredients"
            note="Ingredient stock stays out of driver loadouts and sorts by confirmed perishability."
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Ingredient</TableHeaderCell>
                <TableHeaderCell>Quantity</TableHeaderCell>
                <TableHeaderCell>Storage</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Confidence</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.ingredients.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex min-w-[220px] items-start gap-3">
                      <MealfloIcon
                        name={item.refrigerated ? "snowflake" : "fridge"}
                        size={30}
                      />
                      <div className="space-y-1">
                        <p className="text-ink font-medium">{item.name}</p>
                        {item.notes ? (
                          <p className="text-muted text-sm leading-6">
                            {displayKitchenLabel(item.notes)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <Badge
                      size="sm"
                      tone={
                        item.perishability === "Use today" || item.refrigerated
                          ? "warning"
                          : "success"
                      }
                    >
                      {displayKitchenLabel(item.perishability)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted">{item.source}</TableCell>
                  <TableCell>{item.suggestionConfidence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>

      <AdminInventoryWorkflows
        defaultReceiptText={data.parserFixtureText}
        defaultSourceNote={data.ingredientSourceNote}
      />
    </div>
  );
}
