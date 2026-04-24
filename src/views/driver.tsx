import { DriverMobileFlow } from "@/components/mealflo/driver-mobile-flow";
import { MealfloLogo } from "@/components/mealflo/logo";
import { cn } from "@/lib/utils";
import { getDriverOfferData } from "@/server/mealflo/backend";

function DriverTopBar() {
  return (
    <div className="mf-enter flex w-full shrink-0 items-center px-1 py-1">
      <MealfloLogo
        className="mx-auto gap-2.5"
        iconSize={34}
        showSubtitle={false}
        swatchClassName="bg-transparent border-transparent"
        swatchSize={38}
        textClassName="text-[26px] leading-none tracking-[-0.025em]"
      />
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
