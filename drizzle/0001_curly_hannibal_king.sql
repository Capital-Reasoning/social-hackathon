ALTER TABLE "routes" ADD COLUMN "route_geometry" jsonb;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "route_directions" jsonb;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "route_distance_meters" integer;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "route_duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "route_fallback_reason" text;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "routed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "routing_provider" text;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "routing_waypoint_hash" text;