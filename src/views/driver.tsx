import { Suspense } from "react";

import { Badge } from "@/components/mealflo/badge";
import { DriverMobileFlow } from "@/components/mealflo/driver-mobile-flow";
import { MealfloLogo } from "@/components/mealflo/logo";
import { PersonaLabel } from "@/components/mealflo/persona-label";
import { cn } from "@/lib/utils";
import { getDriverOfferData } from "@/server/mealflo/backend";

function DriverTopBar() {
  return (
    <div className="mf-enter flex shrink-0 items-center justify-between gap-3 px-1">
      <MealfloLogo iconSize={42} showSubtitle={false} swatchSize={58} />
      <Badge tone="info">
        <Suspense fallback="Rosa">
          <PersonaLabel display="name" role="driver" />
        </Suspense>
      </Badge>
    </div>
  );
}

export function DriverFrame({
  bounded = false,
  children,
}: {
  bounded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className={cn(
        "bg-bg flex min-h-0 overflow-hidden px-3 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-4",
        bounded ? "h-full" : "h-dvh min-h-dvh"
      )}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[430px] flex-col gap-3">
        <DriverTopBar />
        {children}
      </div>
    </main>
  );
}

export async function DriverLandingView() {
  const data = await getDriverOfferData();

  return <DriverMobileFlow data={data} />;
}

export async function DriverActiveView({ routeId }: { routeId?: string }) {
  const data = await getDriverOfferData();

  return (
    <DriverMobileFlow
      data={data}
      initialRouteId={routeId}
      initialScreen="active"
    />
  );
}
