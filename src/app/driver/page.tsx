import { DriverFrame, DriverLandingView } from "@/views/driver";

export const metadata = {
  title: "Driver route start",
};

export const dynamic = "force-dynamic";

export default function DriverPage() {
  return (
    <DriverFrame>
      <DriverLandingView />
    </DriverFrame>
  );
}
