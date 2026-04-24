import { Badge } from "@/components/mealflo/badge";
import { AdminInboxRowActions } from "@/components/mealflo/admin-inbox-row-actions";
import { AdminInventoryWorkflows } from "@/components/mealflo/admin-inventory-workflows";
import { AdminRouteActions } from "@/components/mealflo/admin-route-actions";
import { ButtonLink } from "@/components/mealflo/button";
import { Card, CardHeader } from "@/components/mealflo/card";
import {
  MetricTile,
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
  type AdminDirectoryRow,
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

const triageBucketConfig: Record<
  TriageBucket,
  { label: string; note: string; tone: "info" | "neutral" | "warning" }
> = {
  later: {
    label: "Later",
    note: "Good candidates when a route has safe extra room.",
    tone: "neutral",
  },
  today: {
    label: "Today",
    note: "Work that should be routed or watched now.",
    tone: "warning",
  },
  tomorrow: {
    label: "Tomorrow",
    note: "Approved requests ready for the next planning pass.",
    tone: "info",
  },
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

function TriageBoard({
  buckets,
  limit,
}: {
  buckets: Record<TriageBucket, TriageRequestCard[]>;
  limit?: number;
}) {
  const orderedBuckets: TriageBucket[] = ["today", "tomorrow", "later"];
  const rows = orderedBuckets.flatMap((bucket) => {
    const requests = limit ? buckets[bucket].slice(0, limit) : buckets[bucket];

    return requests.map((request) => ({ bucket, request }));
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse text-left">
        <thead>
          <tr className="border-line text-muted border-b-[1.5px] text-xs font-semibold tracking-[0.08em] uppercase">
            <th className="py-3 pr-4">Window</th>
            <th className="py-3 pr-4">Name</th>
            <th className="py-3 pr-4">Address</th>
            <th className="py-3 pr-4">Urgency</th>
            <th className="py-3 pr-4">Meals</th>
            <th className="py-3 pr-4">Household</th>
            <th className="py-3 pr-0">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ bucket, request }) => {
            const config = triageBucketConfig[bucket];

            return (
              <tr
                key={request.id}
                className="border-line/70 border-b last:border-b-0"
              >
                <td className="py-3 pr-4">
                  <Badge size="sm" tone={config.tone}>
                    {config.label}
                  </Badge>
                </td>
                <td className="text-ink py-3 pr-4 font-medium">
                  {request.clientName}
                </td>
                <td className="text-muted max-w-[260px] py-3 pr-4 text-sm leading-5">
                  {request.address}
                </td>
                <td className="text-ink py-3 pr-4 font-medium">
                  {request.urgency}
                </td>
                <td className="text-ink py-3 pr-4">{request.mealCount}</td>
                <td className="text-ink py-3 pr-4">{request.householdSize}</td>
                <td className="py-3 pr-0">
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

function ReadyTodayTable({ requests }: { requests: TriageRequestCard[] }) {
  return (
    <div className="min-w-0 overflow-hidden">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-line text-muted border-b-[1.5px] text-xs font-semibold tracking-[0.08em] uppercase">
            <th className="w-[28%] py-3 pr-3">Name</th>
            <th className="w-[44%] py-3 pr-3">Address</th>
            <th className="w-[18%] py-3 pr-3">Urgency</th>
            <th className="w-[10%] py-3 pr-0 text-right">Meals</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr
              key={request.id}
              className="border-line/70 border-b last:border-b-0"
            >
              <td className="text-ink py-3 pr-3 font-medium">
                {request.clientName}
              </td>
              <td className="text-muted py-3 pr-3 text-sm leading-5">
                {request.address}
              </td>
              <td className="text-ink py-3 pr-3 font-medium">
                {request.urgency}
              </td>
              <td className="text-ink py-3 pr-0 text-right">
                {request.mealCount}
              </td>
            </tr>
          ))}
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
  note: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-display text-ink text-[28px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-muted max-w-[44rem] text-sm leading-6">{note}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function dashboardKpiCopy(item: { id: string; label: string; value: string }) {
  switch (item.id) {
    case "new-intake":
      return { metric: `${item.value} intake`, status: "Waiting for review" };
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
    <section className="border-line rounded-[16px] border-[1.5px] bg-white px-4 py-3 sm:px-5">
      <div className="grid divide-y divide-[rgba(24,24,60,0.08)] sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x">
        {items.map((item) => {
          const copy = dashboardKpiCopy(item);

          return (
            <div
              key={item.id}
              className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0 xl:first:pl-0"
            >
              <MealfloIcon name={item.icon as IconName} size={38} />
              <div className="min-w-0">
                <p className="font-display text-ink text-[26px] leading-none font-bold tracking-[-0.02em]">
                  {copy.metric}
                </p>
                <p className="text-muted mt-1 text-sm font-medium">
                  {copy.status}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InboxRequestsTable({
  editHrefFor,
  items,
}: {
  editHrefFor: (draftId: string) => string;
  items: InboxQueueItem[];
}) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Source</TableHeaderCell>
          <TableHeaderCell>Raw request</TableHeaderCell>
          <TableHeaderCell>Parsed suggestion</TableHeaderCell>
          <TableHeaderCell>Confidence</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <div className="min-w-[150px] space-y-1">
                <Badge
                  size="sm"
                  tone={item.channel === "gmail" ? "info" : "neutral"}
                >
                  {item.channel}
                </Badge>
                <p className="text-ink font-medium">{item.sender}</p>
                <p className="text-muted text-xs leading-5">
                  {displayKitchenLabel(item.subject)}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-muted max-w-[320px]">
              {displayKitchenLabel(item.snippet)}
            </TableCell>
            <TableCell>
              <div className="min-w-[220px] space-y-1">
                <p className="text-ink font-medium">{item.address}</p>
                <Badge
                  size="sm"
                  tone={item.status === "low confidence" ? "warning" : "info"}
                >
                  {item.status}
                </Badge>
              </div>
            </TableCell>
            <TableCell className="font-display text-lg font-semibold">
              {item.confidence}
            </TableCell>
            <TableCell>
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

function DirectoryTable({ rows }: { rows: AdminDirectoryRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["All", "Clients", "Drivers", "To do", "Delivered"].map((filter) => (
          <Badge key={filter} tone={filter === "All" ? "primary" : "neutral"}>
            {filter}
          </Badge>
        ))}
      </div>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Badge
                  size="sm"
                  tone={row.role === "driver" ? "info" : "neutral"}
                >
                  {row.role}
                </Badge>
              </TableCell>
              <TableCell className="text-ink font-medium">{row.name}</TableCell>
              <TableCell className="text-muted">{row.location}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell className="text-muted">
                {displayKitchenLabel(row.note)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.36fr)_minmax(0,460px)]">
        <section className="space-y-3">
          <DashboardSectionHeader
            title="Live map"
            note="Only driver phones currently streaming location appear here."
            action={
              <StatusPill
                icon="route-road"
                label={`${activeDriverCount} active`}
                tone="info"
              />
            }
          />
          <MapCanvas
            className="h-[440px]"
            initialView="greater-victoria"
            markers={activeDriverMarkers}
          />
        </section>

        <section className="min-w-0 space-y-3">
          <DashboardSectionHeader
            title="Ready today"
            note="Approved requests that can feed the next route pass."
          />
          <div className="border-line min-w-0 overflow-hidden rounded-[16px] border-[1.5px] bg-white px-5 py-4">
            <ReadyTodayTable requests={data.requestBuckets.today.slice(0, 6)} />
          </div>
        </section>
      </div>

      <DashboardSummaryCard items={data.dashboardKpis} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_380px]">
        <section className="space-y-3">
          <DashboardSectionHeader
            title="Approved requests"
            note="Today, tomorrow, and later stay grouped before routing."
            action={
              <ButtonLink
                href="/admin/routes"
                size="sm"
                variant="secondary"
                leading={<MealfloIcon name="route-road" size={18} />}
              >
                Plan routes
              </ButtonLink>
            }
          />
          <div className="border-line overflow-hidden rounded-[16px] border-[1.5px] bg-white px-5 py-4">
            <TriageBoard buckets={data.requestBuckets} limit={2} />
          </div>
        </section>

        <section className="space-y-3">
          <DashboardSectionHeader
            title="Inventory pressure"
            note="Lowest meal counts and items that need refrigeration affect route choices."
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Meal</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Qty</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.inventoryMeals.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="text-ink font-medium">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-muted">{item.category}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-semibold">
                        {item.quantity}
                      </span>
                      {item.tags.map((tag) => (
                        <Badge key={tag} size="sm">
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
      </div>
    </div>
  );
}

export async function AdminInboxView({
  demoMode = false,
}: {
  demoMode?: boolean;
}) {
  const data = await getAdminInboxData();
  const editHrefFor = (draftId: string) =>
    demoMode
      ? `/demo/admin?view=inbox&draft=${draftId}`
      : `/admin/inbox?draft=${draftId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        note="New food requests and volunteer offers stay in one review table. The directory beside it keeps clients and drivers searchable on one surface."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(520px,0.85fr)]">
        <Card className="space-y-3">
          <CardHeader
            title="New requests"
            note="Raw message, parsed suggestion, and review actions stay together."
            action={
              <Badge tone="warning">{data.inboxItems.length} waiting</Badge>
            }
          />
          <InboxRequestsTable
            editHrefFor={editHrefFor}
            items={data.inboxItems}
          />
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title="Clients and drivers"
            note="Clients, drivers, todo status, and delivered status stay in one compact table."
          />
          <DirectoryTable rows={data.directoryRows} />
        </Card>
      </div>
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
      label: "Estimated hours for today's deliveries",
      minutes: plannedMinutesByBucket.today,
      routeCount: plannedRouteCountsByBucket.today,
      tone: "warning" as const,
    },
    {
      label: "Estimated hours for tomorrow's deliveries",
      minutes: plannedMinutesByBucket.tomorrow,
      routeCount: plannedRouteCountsByBucket.tomorrow,
      tone: "info" as const,
    },
    {
      label: "Estimated hours for rest of week's deliveries",
      minutes: plannedMinutesByBucket.later,
      routeCount: plannedRouteCountsByBucket.later,
      tone: "neutral" as const,
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
        <Card className="space-y-3">
          <CardHeader title="Estimated route hours" />
          <div className="grid gap-3">
            {timeNeededRows.map((row) => (
              <div
                key={row.label}
                className="border-line rounded-[14px] border-[1.5px] bg-white px-4 py-3"
              >
                <p className="font-display text-ink text-[30px] leading-none font-bold">
                  {formatAdminMinutes(row.minutes)}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-muted text-sm leading-5">{row.label}</p>
                  <Badge size="sm" tone={row.tone}>
                    {row.routeCount} routes
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title="Driver availability"
            note="Use availability length, starting area, and vehicle fit before assigning route length."
          />
          <DriverCapacityTable drivers={data.driverCapacity} />
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader
          title="Today's deliveries"
          note="Today stays first and compact."
          action={
            <Badge tone="warning">{data.requestBuckets.today.length}</Badge>
          }
        />
        <RoutedPeopleTable requests={data.requestBuckets.today} />
      </Card>

      <Card className="space-y-4">
        <CardHeader
          title="Later deliveries"
          note="Tomorrow and later stay below today's work."
          action={<Badge tone="info">{laterRequests.length}</Badge>}
        />
        <RoutedPeopleTable requests={laterRequests} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <Card className="space-y-4">
          <CardHeader
            title="Route map"
            note="The selected route uses the same detailed street map as the dashboard."
          />
          <MapCanvas
            className="h-[420px]"
            initialView="greater-victoria"
            markers={data.liveMarkers}
            path={data.routeLine}
          />
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title="Route options"
            note="Inventory and timing stay visible before a driver is assigned."
          />
          <RoutePlansTable plans={data.routePlans} />
        </Card>
      </div>

      <Card className="space-y-4">
        <CardHeader
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
      </Card>
    </div>
  );
}

export async function AdminInventoryView() {
  const data = await getAdminInventoryData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Food readiness"
        note="Deliverable meals are route-ready inventory. Ingredients stay separate, sorted by perishability, and confirmed before they change stock."
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.inventoryKpis.map((item) => (
          <MetricTile
            key={item.id}
            icon={item.icon as IconName}
            label={item.label}
            note={item.note}
            tone={item.tone}
            value={item.value}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
        <Card className="space-y-4">
          <CardHeader
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
        </Card>

        <Card className="space-y-4">
          <CardHeader
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
        </Card>
      </div>

      <AdminInventoryWorkflows
        defaultReceiptText={data.parserFixtureText}
        defaultSourceNote={data.ingredientSourceNote}
      />
    </div>
  );
}
