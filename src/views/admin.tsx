import { Badge } from "@/components/mealflo/badge";
import { AdminDeliveriesToggle } from "@/components/mealflo/admin-deliveries-toggle";
import { AdminDirectoryTable } from "@/components/mealflo/admin-directory-table";
import { AdminInboxWorkbench } from "@/components/mealflo/admin-inbox-workbench";
import { AdminInventoryWorkflows } from "@/components/mealflo/admin-inventory-workflows";
import { TodayRouteList } from "@/components/mealflo/admin-today-routes";
import { ButtonLink } from "@/components/mealflo/button";
import { Card } from "@/components/mealflo/card";
import { PageFrame, PageHeader, TopBar } from "@/components/mealflo/layout";
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
  ensureSeededData,
  type LiveMarker,
  type TriageBucket,
  type TriageRequestCard,
} from "@/server/mealflo/backend";
import { syncConfiguredGmailForAdminInbox } from "@/server/mealflo/gmail-ingest";

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

function requestMarkerTone(request: TriageRequestCard): LiveMarker["tone"] {
  if (request.status === "delivered") {
    return "success";
  }

  if (request.status === "held" || urgencyValue(request.urgency) >= 8) {
    return "warning";
  }

  return "info";
}

function todayDeliveryMarkers(
  requests: readonly TriageRequestCard[],
  driverMarkers: readonly LiveMarker[]
): LiveMarker[] {
  const requestMarkers = requests.map((request) => ({
    description: request.address,
    id: `today-${request.id}`,
    label: request.clientName,
    latitude: request.latitude,
    longitude: request.longitude,
    tone: requestMarkerTone(request),
  }));

  return [...requestMarkers, ...driverMarkers];
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
}: {
  buckets: Record<TriageBucket, TriageRequestCard[]>;
}) {
  const rows = buckets.today;

  return (
    <div className="min-h-0 flex-1 overflow-auto pr-1">
      <table className="w-full min-w-[440px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-line text-muted border-b-[1.5px] text-xs font-semibold tracking-[0.08em] uppercase">
            <th className="py-2.5 pr-3">Client</th>
            <th className="py-2.5 pr-3">Urgency</th>
            <th className="py-2.5 pr-3 text-right">Meals</th>
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
  actionPlacement = "end",
  note,
  title,
}: {
  action?: React.ReactNode;
  actionPlacement?: "end" | "inline";
  note?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-ink text-[28px] font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          {action && actionPlacement === "inline" ? action : null}
        </div>
        {note ? (
          <p className="text-muted max-w-[44rem] text-sm leading-6">{note}</p>
        ) : null}
      </div>
      {action && actionPlacement === "end" ? (
        <div className="shrink-0 self-start sm:self-auto">{action}</div>
      ) : null}
    </div>
  );
}

function MapActivityIndicator({ count }: { count: number }) {
  return (
    <div className="text-info-text inline-flex items-baseline gap-2 text-[17px] leading-none font-semibold">
      <MealfloIcon name="route-road" size={25} className="translate-y-[5px]" />
      <span>{count} active</span>
    </div>
  );
}

function LiveMapHeader({ activeDriverCount }: { activeDriverCount: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline">
      <h2 className="font-display text-ink text-[28px] font-semibold tracking-[-0.02em]">
        Live map
      </h2>
      <div className="min-w-0 sm:justify-self-center">
        <MapLegend />
      </div>
      <div className="sm:justify-self-end">
        <MapActivityIndicator count={activeDriverCount} />
      </div>
    </div>
  );
}

const mapLegendItems = [
  {
    className: "border-[rgba(32,56,192,0.34)] bg-[var(--mf-color-blue-300)]",
    label: "Ready stop",
  },
  {
    className: "border-[rgba(196,125,0,0.36)] bg-[var(--mf-color-amber-300)]",
    label: "High urgency",
  },
  {
    className: "border-[rgba(46,138,80,0.36)] bg-[var(--mf-color-green-300)]",
    label: "Delivered",
  },
] as const;

function MapLegend() {
  return (
    <ul
      aria-label="Map marker legend"
      className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium"
    >
      {mapLegendItems.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`block h-3.5 w-3.5 rounded-full border-[2px] shadow-[0_0_0_2px_rgba(255,255,255,0.92)] ${item.className}`}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
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
      <div
        className={`grid divide-y divide-[rgba(24,24,60,0.08)] sm:grid-cols-2 sm:divide-y-0 xl:divide-x ${
          items.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"
        }`}
      >
        {items.map((item) => {
          return (
            <div
              key={item.id}
              className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 xl:first:pl-0 xl:last:pr-0 sm:[&:nth-child(even)]:pr-0 sm:[&:nth-child(odd)]:pl-0"
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

function compactStatusLabel(status: TriageRequestCard["status"]) {
  if (status === "held") {
    return "Needs dispatch";
  }

  if (status === "approved") {
    return "Ready";
  }

  if (status === "assigned") {
    return "Routed";
  }

  if (status === "out_for_delivery") {
    return "Out";
  }

  return "Done";
}

const todayRouteDisplayOrder = new Map(
  [
    "route-victoria-core",
    "route-esquimalt-loop",
    "route-peninsula-run",
    "route-oak-bay-support",
  ].map((id, index) => [id, index] as const)
);

function RoutedPeopleTable({ requests }: { requests: TriageRequestCard[] }) {
  return (
    <>
      <div className="border-line overflow-hidden rounded-[16px] border-[1.5px] bg-white md:hidden">
        {requests.map((request) => {
          const urgency = urgencyValue(request.urgency);
          const bringNotes = [
            ...request.safetyNotes,
            ...request.dietaryTags,
          ].slice(0, 4);

          return (
            <div
              key={request.id}
              className="border-line/70 space-y-3 border-b p-4 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink font-medium">{request.clientName}</p>
                  <p className="text-muted mt-0.5 text-sm leading-5">
                    {request.address}
                  </p>
                </div>
                <span
                  className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] px-2 text-sm font-semibold ${urgencyTone(urgency)}`}
                  aria-label={`Urgency ${urgency} of 10`}
                >
                  {urgency}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge size="sm" tone={requestStatusTone(request.status)}>
                  {compactStatusLabel(request.status)}
                </Badge>
                <span className="text-muted text-sm">
                  {request.mealCount} meals · {request.householdSize} people
                </span>
                {request.routeName ? (
                  <span className="text-muted text-sm">
                    {request.routeName}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bringNotes.length > 0 ? (
                  bringNotes.map((note) => (
                    <Badge key={note} size="sm" tone="warning">
                      {displayKitchenLabel(note)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted text-sm">Standard bag</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block">
        <Table className="w-full min-w-[860px]">
          <TableHead>
            <TableRow>
              <TableHeaderCell className="py-2.5">Recipient</TableHeaderCell>
              <TableHeaderCell className="py-2.5">Urgency</TableHeaderCell>
              <TableHeaderCell className="py-2.5">Meals</TableHeaderCell>
              <TableHeaderCell className="py-2.5">Status</TableHeaderCell>
              <TableHeaderCell className="py-2.5">
                Bring / watch
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => {
              const urgency = urgencyValue(request.urgency);
              const bringNotes = [
                ...request.safetyNotes,
                ...request.dietaryTags,
              ].slice(0, 4);

              return (
                <TableRow key={request.id}>
                  <TableCell className="py-2.5">
                    <div className="min-w-[250px]">
                      <p className="text-ink font-medium">
                        {request.clientName}
                      </p>
                      <p className="text-muted truncate text-xs leading-5">
                        {request.address}
                        {request.routeName ? ` · ${request.routeName}` : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border-[1.5px] px-2 text-sm font-semibold ${urgencyTone(urgency)}`}
                    >
                      {urgency}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <p className="text-ink font-medium">
                      {request.mealCount} meals
                    </p>
                    <p className="text-muted text-xs leading-5">
                      {request.householdSize} people
                    </p>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge size="sm" tone={requestStatusTone(request.status)}>
                      {compactStatusLabel(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex min-w-[260px] flex-wrap gap-1.5">
                      {bringNotes.length > 0 ? (
                        bringNotes.map((note) => (
                          <Badge key={note} size="sm" tone="warning">
                            {displayKitchenLabel(note)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted text-sm">Standard bag</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
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
  await ensureSeededData();

  const data = await getAdminDashboardData();
  const activeDriverMarkers = data.liveMarkers.filter((marker) =>
    marker.id.startsWith("driver-")
  );
  const activeDriverCount = activeDriverMarkers.length;
  const mapMarkers = todayDeliveryMarkers(
    data.requestBuckets.today,
    activeDriverMarkers
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Today's operations" />

      <DashboardSummaryCard items={data.dashboardKpis} />

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
        <section className="space-y-3">
          <LiveMapHeader activeDriverCount={activeDriverCount} />
          <MapCanvas
            className="h-[640px]"
            initialView="greater-victoria"
            markerStyle="dot"
            markers={mapMarkers}
          />
        </section>

        <section className="flex min-w-0 flex-col space-y-3">
          <DashboardSectionHeader title="Ready today" />
          <div className="border-line flex h-[640px] min-w-0 flex-col overflow-hidden rounded-[16px] border-[1.5px] bg-white px-4 py-3">
            <ReadyRequestsTable buckets={data.requestBuckets} />
            <div className="border-line/70 mt-auto flex border-t pt-3">
              <ButtonLink
                className="h-[58px] text-lg font-semibold"
                fullWidth
                href="/demo/admin?view=routes"
                size="lg"
                variant="primary"
                leading={<MealfloIcon name="route-road" size={42} />}
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
  await ensureSeededData();
  await syncConfiguredGmailForAdminInbox();

  const data = await getAdminInboxData(draftId);
  void demoMode;

  return (
    <div className="space-y-6">
      <PageHeader title="Inbox" />

      <AdminInboxWorkbench initialData={data} />

      <section className="space-y-3">
        <DashboardSectionHeader title="Clients and drivers" />
        <AdminDirectoryTable rows={data.directoryRows} />
      </section>
    </div>
  );
}

export async function AdminRoutesView() {
  await ensureSeededData();

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

  const todayRouteNames = new Set(
    data.requestBuckets.today
      .map((request) => request.routeName)
      .filter(Boolean)
  );
  const todayRouteOptions = data.routeOptions
    .filter((route) => todayRouteNames.has(route.name))
    .sort(
      (left, right) =>
        (todayRouteDisplayOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (todayRouteDisplayOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
        left.name.localeCompare(right.name)
    );
  const todayRouteMinutes = todayRouteOptions.reduce(
    (sum, route) => sum + route.plannedTotalMinutes,
    0
  );
  const restOfWeekMinutes =
    plannedMinutesByBucket.later > 0 ? plannedMinutesByBucket.later : 134;
  const restOfWeekRouteCount =
    plannedRouteCountsByBucket.later > 0 ? plannedRouteCountsByBucket.later : 2;
  const timeNeededRows = [
    {
      label: "Today",
      minutes: todayRouteMinutes,
      routeCount: todayRouteOptions.length,
    },
    {
      label: "Tomorrow",
      minutes: plannedMinutesByBucket.tomorrow,
      routeCount: plannedRouteCountsByBucket.tomorrow,
    },
    {
      label: "Rest of week",
      minutes: restOfWeekMinutes,
      routeCount: restOfWeekRouteCount,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Routes" />

      <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)]">
        <section className="space-y-3">
          <DashboardSectionHeader title="Route hours" />
          <Card className="overflow-hidden p-0">
            <div className="divide-line/70 divide-y">
              {timeNeededRows.map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1 px-2.5 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center xl:grid-cols-1 xl:items-start"
                >
                  <p className="font-display text-ink text-[22px] leading-none font-semibold tracking-[-0.01em]">
                    {row.label}
                  </p>
                  <div className="grid gap-1 sm:justify-items-end xl:justify-items-start">
                    <p className="font-display text-ink text-[34px] leading-none font-bold tracking-[-0.02em]">
                      {formatAdminMinutes(row.minutes)}
                    </p>
                    <p className="text-muted text-base leading-none font-semibold">
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
            actionPlacement="inline"
            title="Today's routes"
            action={<Badge tone="info">{todayRouteOptions.length}</Badge>}
          />
          <TodayRouteList routes={todayRouteOptions} />
        </section>
      </div>

      <section className="space-y-3">
        <DashboardSectionHeader title="Deliveries" />
        <AdminDeliveriesToggle
          laterCount={laterRequests.length}
          laterTable={<RoutedPeopleTable requests={laterRequests} />}
          todayCount={data.requestBuckets.today.length}
          todayTable={
            <RoutedPeopleTable requests={data.requestBuckets.today} />
          }
        />
      </section>
    </div>
  );
}

export async function AdminInventoryView() {
  await ensureSeededData();

  const data = await getAdminInventoryData();
  const inventorySummaryItems = data.inventoryKpis
    .filter((item) => item.id !== "shortage-holds")
    .map((item) => {
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

      return {
        icon: "fridge" as const,
        id: item.id,
        metric: `${item.value} perishables`,
        status: "Use first",
      };
    });
  const dietaryTagOptions = Array.from(
    new Set(data.meals.flatMap((meal) => meal.dietaryTags))
  );
  const allergenFlagOptions = Array.from(
    new Set(data.meals.flatMap((meal) => meal.allergenFlags))
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" />

      <SummaryStatusStrip items={inventorySummaryItems} />

      <AdminInventoryWorkflows
        allergenFlagOptions={allergenFlagOptions}
        defaultReceiptText={data.parserFixtureText}
        defaultSourceNote={data.ingredientSourceNote}
        dietaryTagOptions={dietaryTagOptions}
      />

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
                    <div className="min-w-[220px]">
                      <p className="text-ink text-[17px] font-semibold">
                        {item.name}
                      </p>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {data.ingredients.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="min-w-[220px]">
                      <p className="text-ink text-[17px] font-semibold">
                        {item.name}
                      </p>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
