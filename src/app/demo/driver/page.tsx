import { DemoShell } from "@/components/mealflo/demo-shell";
import {
  DriverActiveView,
  DriverFrame,
  DriverLandingView,
} from "@/views/driver";

export const metadata = {
  title: "Driver demo",
};

export const dynamic = "force-dynamic";

export default async function DemoDriverPage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string | string[] }>;
}) {
  const params = await searchParams;
  const route = Array.isArray(params.route) ? params.route[0] : params.route;

  return (
    <DemoShell activeRole="driver" phoneViewport>
      <DriverFrame bounded>
        {route ? <DriverActiveView routeId={route} /> : <DriverLandingView />}
      </DriverFrame>
    </DemoShell>
  );
}
