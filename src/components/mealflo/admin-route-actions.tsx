"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/mealflo/button";
import { MealfloIcon } from "@/components/mealflo/icon";

export function AdminRouteActions({
  selectedRouteId,
}: {
  selectedRouteId?: string;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [status, setStatus] = useState("Ready for a fresh route pass.");
  const generateRoutes = async () => {
    setIsGenerating(true);
    setStatus("Generating routes from approved demand and driver windows.");

    try {
      const response = await fetch("/api/routes/generate", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: {
          routeCount: number;
          stopCount: number;
        };
        error?: string;
        ok: boolean;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Route generation failed.");
      }

      setStatus(
        `${payload.data.routeCount} routes generated with ${payload.data.stopCount} stops assigned.`
      );
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Route generation failed. Try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };
  const resetRoute = async () => {
    if (!selectedRouteId) {
      setStatus("Choose a route before resetting.");
      return;
    }

    setIsResetting(true);
    setStatus("Resetting the selected route session.");

    try {
      const response = await fetch("/api/driver/session/reset", {
        body: JSON.stringify({
          routeId: selectedRouteId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        ok: boolean;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Route reset failed.");
      }

      setStatus("Route reset to not started.");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Route reset failed. Try again."
      );
    } finally {
      setIsResetting(false);
    }
  };
  const approveSelectedRoute = async () => {
    if (!selectedRouteId) {
      setStatus("Choose a route before approving.");
      return;
    }

    setIsApproving(true);
    setStatus("Approving the selected route for driver pickup.");

    try {
      const response = await fetch(
        `/api/routes/${encodeURIComponent(selectedRouteId)}`,
        {
          method: "POST",
        }
      );
      const payload = (await response.json()) as {
        data?: {
          routeId: string;
          status: string;
        };
        error?: string;
        ok: boolean;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Route approval failed.");
      }

      setStatus("Route approved for driver pickup.");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Route approval failed. Try again."
      );
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="grid justify-items-start gap-2 sm:justify-items-end">
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={isGenerating}
          variant="secondary"
          leading={<MealfloIcon name="repeat-arrows" size={20} />}
          onClick={generateRoutes}
        >
          {isGenerating ? "Generating" : "Generate routes"}
        </Button>
        <Button
          disabled={isResetting}
          variant="secondary"
          leading={<MealfloIcon name="repeat-arrows" size={20} />}
          onClick={resetRoute}
        >
          {isResetting ? "Resetting" : "Reset route"}
        </Button>
        <Button
          disabled={isApproving}
          variant="warm"
          leading={<MealfloIcon name="checkmark-circle" size={20} />}
          onClick={approveSelectedRoute}
        >
          {isApproving ? "Approving" : "Approve route"}
        </Button>
      </div>
      <p role="status" className="text-muted text-sm leading-6">
        {status}
      </p>
    </div>
  );
}
