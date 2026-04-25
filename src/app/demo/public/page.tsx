import { DemoShell } from "@/components/mealflo/demo-shell";
import {
  PublicFrame,
  PublicLandingView,
  PublicRequestView,
  PublicVolunteerView,
} from "@/views/public";

export const metadata = {
  title: "Public demo",
};

type PublicDemoView = "home" | "request" | "volunteer";

function publicViewFromParam(value?: string | string[]): PublicDemoView {
  const view = Array.isArray(value) ? value[0] : value;

  if (view === "request" || view === "volunteer") {
    return view;
  }

  return "home";
}

function PublicView({ view }: { view: PublicDemoView }) {
  if (view === "request") {
    return <PublicRequestView />;
  }

  if (view === "volunteer") {
    return <PublicVolunteerView />;
  }

  return (
    <PublicLandingView
      requestHref="/demo/public?view=request"
      volunteerHref="/demo/public?view=volunteer"
    />
  );
}

export default async function DemoPublicPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const params = await searchParams;
  const view = publicViewFromParam(params.view);

  return (
    <DemoShell activeRole="public">
      <PublicFrame active={view} demoMode>
        <PublicView view={view} />
      </PublicFrame>
    </DemoShell>
  );
}
