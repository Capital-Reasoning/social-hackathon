import {
  DriverActiveView,
  DriverFrame,
  DriverLandingView,
} from "@/views/driver";

export const metadata = {
  title: "Driver active route",
};

export const dynamic = "force-dynamic";

export default async function DriverActivePage({
  searchParams,
}: {
  searchParams: Promise<{ route?: string | string[] }>;
}) {
  const params = await searchParams;
  const route = Array.isArray(params.route) ? params.route[0] : params.route;

  return (
    <DriverFrame>
      {route ? <DriverActiveView routeId={route} /> : <DriverLandingView />}
    </DriverFrame>
  );
}
