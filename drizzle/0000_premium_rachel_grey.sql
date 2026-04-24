CREATE TYPE "public"."availability_source" AS ENUM('seeded', 'public_form', 'admin_entry', 'driver_picker');--> statement-breakpoint
CREATE TYPE "public"."draft_status" AS ENUM('pending', 'approved', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."draft_type" AS ENUM('request', 'volunteer', 'client', 'other');--> statement-breakpoint
CREATE TYPE "public"."driver_session_status" AS ENUM('active', 'completed', 'reset', 'stale');--> statement-breakpoint
CREATE TYPE "public"."due_bucket" AS ENUM('today', 'tomorrow', 'later');--> statement-breakpoint
CREATE TYPE "public"."ingredient_source_type" AS ENUM('donation', 'purchase', 'pantry', 'farm', 'hub_transfer');--> statement-breakpoint
CREATE TYPE "public"."intake_channel" AS ENUM('public_form', 'gmail', 'manual_entry');--> statement-breakpoint
CREATE TYPE "public"."intake_kind" AS ENUM('request', 'volunteer', 'other');--> statement-breakpoint
CREATE TYPE "public"."intake_status" AS ENUM('pending_review', 'draft_ready', 'approved', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."meal_category" AS ENUM('hot_meal', 'frozen_meal', 'soup', 'breakfast', 'hamper', 'snack');--> statement-breakpoint
CREATE TYPE "public"."priority_label" AS ENUM('low', 'normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."request_kind" AS ENUM('meal_delivery', 'grocery_hamper');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('draft', 'approved', 'held', 'assigned', 'out_for_delivery', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('draft', 'planned', 'approved', 'in_progress', 'completed', 'reset');--> statement-breakpoint
CREATE TYPE "public"."route_stop_status" AS ENUM('planned', 'ready', 'delivered', 'could_not_deliver', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('sedan', 'hatchback', 'suv', 'cargo_van', 'refrigerated_van');--> statement-breakpoint
CREATE TYPE "public"."volunteer_role" AS ENUM('volunteer', 'staff');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"source_intake_draft_id" varchar(64),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"phone" text,
	"email" text,
	"municipality" text NOT NULL,
	"neighborhood" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"postal_code" text,
	"latitude" double precision,
	"longitude" double precision,
	"household_size" integer NOT NULL,
	"dietary_tags" text[] NOT NULL,
	"allergen_flags" text[] NOT NULL,
	"access_notes" text,
	"safe_to_leave" boolean DEFAULT false NOT NULL,
	"do_not_enter" boolean DEFAULT false NOT NULL,
	"assistance_at_door" boolean DEFAULT false NOT NULL,
	"requires_two_person" boolean DEFAULT false NOT NULL,
	"uses_wheelchair" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"last_approved_request_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverable_meals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "meal_category" NOT NULL,
	"quantity_available" integer NOT NULL,
	"allergen_flags" text[] NOT NULL,
	"dietary_tags" text[] NOT NULL,
	"refrigerated" boolean DEFAULT false NOT NULL,
	"unit_label" text NOT NULL,
	"source_note" text,
	"low_stock_threshold" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_requests" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"source_intake_draft_id" varchar(64),
	"request_kind" "request_kind" NOT NULL,
	"due_bucket" "due_bucket" NOT NULL,
	"scheduled_date" date NOT NULL,
	"urgency_score" integer NOT NULL,
	"priority_label" "priority_label" NOT NULL,
	"household_size_snapshot" integer NOT NULL,
	"requested_meal_count" integer NOT NULL,
	"approved_meal_count" integer NOT NULL,
	"cold_chain_required" boolean DEFAULT false NOT NULL,
	"dietary_tags_snapshot" text[] NOT NULL,
	"allergen_flags_snapshot" text[] NOT NULL,
	"access_notes" text,
	"original_message_excerpt" text,
	"notes" text,
	"routing_hold_reason" text,
	"status" "request_status" DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp with time zone,
	"assigned_route_id" varchar(64),
	"assigned_stop_sequence" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "depots" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"municipality" text NOT NULL,
	"address_line" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"hours_start" varchar(16) NOT NULL,
	"hours_end" varchar(16) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"route_id" varchar(64) NOT NULL,
	"volunteer_id" varchar(64) NOT NULL,
	"device_fingerprint" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_lat" double precision,
	"current_lng" double precision,
	"delivered_count_local" integer DEFAULT 0 NOT NULL,
	"current_stop_index" integer DEFAULT 0 NOT NULL,
	"is_anchor" boolean DEFAULT false NOT NULL,
	"status" "driver_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"refrigerated" boolean DEFAULT false NOT NULL,
	"perishability_score" integer NOT NULL,
	"perishability_label" text NOT NULL,
	"source_type" "ingredient_source_type" NOT NULL,
	"source_reference" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_drafts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"intake_message_id" varchar(64) NOT NULL,
	"draft_type" "draft_type" NOT NULL,
	"structured_payload" jsonb NOT NULL,
	"confidence_score" integer NOT NULL,
	"low_confidence_fields" text[] NOT NULL,
	"summary" text NOT NULL,
	"parser_version" text NOT NULL,
	"approved_record_type" text,
	"approved_record_id" varchar(64),
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"status" "draft_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_messages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"channel" "intake_channel" NOT NULL,
	"intake_kind" "intake_kind" NOT NULL,
	"sender_name" text,
	"sender_email" text,
	"sender_phone" text,
	"subject" text NOT NULL,
	"raw_body" text NOT NULL,
	"raw_address" text,
	"source_payload" jsonb,
	"status" "intake_status" DEFAULT 'pending_review' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_stop_meal_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"route_stop_id" varchar(64) NOT NULL,
	"meal_id" varchar(64) NOT NULL,
	"meal_name_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"dietary_tags" text[] NOT NULL,
	"allergen_flags" text[] NOT NULL,
	"refrigerated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"route_id" varchar(64) NOT NULL,
	"request_id" varchar(64) NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"sequence" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"address_line" text NOT NULL,
	"eta" timestamp with time zone NOT NULL,
	"meal_summary" text NOT NULL,
	"item_summary" text NOT NULL,
	"access_summary" text NOT NULL,
	"original_message_excerpt" text,
	"due_bucket_origin" "due_bucket" NOT NULL,
	"status" "route_stop_status" DEFAULT 'planned' NOT NULL,
	"delivered_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"route_name" text NOT NULL,
	"area_label" text NOT NULL,
	"service_date" date NOT NULL,
	"volunteer_id" varchar(64) NOT NULL,
	"vehicle_id" varchar(64) NOT NULL,
	"start_depot_id" varchar(64) NOT NULL,
	"status" "route_status" DEFAULT 'draft' NOT NULL,
	"planned_drive_minutes" integer NOT NULL,
	"planned_stop_minutes" integer NOT NULL,
	"planned_total_minutes" integer NOT NULL,
	"stop_count" integer NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"remaining_count" integer DEFAULT 0 NOT NULL,
	"capacity_utilization_percent" integer NOT NULL,
	"route_explanation" text NOT NULL,
	"warnings" text[] NOT NULL,
	"dashboard_anchor_session_id" varchar(64),
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "vehicle_type" NOT NULL,
	"refrigerated" boolean DEFAULT false NOT NULL,
	"wheelchair_lift" boolean DEFAULT false NOT NULL,
	"capacity_meals" integer NOT NULL,
	"home_depot_id" varchar(64) NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteer_availability" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"volunteer_id" varchar(64) NOT NULL,
	"source" "availability_source" NOT NULL,
	"raw_text" text,
	"recurring_rule" text,
	"date" date NOT NULL,
	"window_start" varchar(16) NOT NULL,
	"window_end" varchar(16) NOT NULL,
	"minutes_available" integer NOT NULL,
	"parsed_confidence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volunteers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"source_intake_draft_id" varchar(64),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"email" text,
	"role" "volunteer_role" NOT NULL,
	"home_area" text NOT NULL,
	"home_municipality" text NOT NULL,
	"has_vehicle_access" boolean DEFAULT false NOT NULL,
	"preferred_vehicle_id" varchar(64),
	"can_handle_cold_chain" boolean DEFAULT false NOT NULL,
	"can_handle_wheelchair" boolean DEFAULT false NOT NULL,
	"can_climb_stairs" boolean DEFAULT false NOT NULL,
	"languages" text[] NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_source_intake_draft_id_intake_drafts_id_fk" FOREIGN KEY ("source_intake_draft_id") REFERENCES "public"."intake_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_requests" ADD CONSTRAINT "delivery_requests_source_intake_draft_id_intake_drafts_id_fk" FOREIGN KEY ("source_intake_draft_id") REFERENCES "public"."intake_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_sessions" ADD CONSTRAINT "driver_sessions_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_sessions" ADD CONSTRAINT "driver_sessions_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_drafts" ADD CONSTRAINT "intake_drafts_intake_message_id_intake_messages_id_fk" FOREIGN KEY ("intake_message_id") REFERENCES "public"."intake_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stop_meal_items" ADD CONSTRAINT "route_stop_meal_items_route_stop_id_route_stops_id_fk" FOREIGN KEY ("route_stop_id") REFERENCES "public"."route_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stop_meal_items" ADD CONSTRAINT "route_stop_meal_items_meal_id_deliverable_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."deliverable_meals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_request_id_delivery_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."delivery_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_start_depot_id_depots_id_fk" FOREIGN KEY ("start_depot_id") REFERENCES "public"."depots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_home_depot_id_depots_id_fk" FOREIGN KEY ("home_depot_id") REFERENCES "public"."depots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_availability" ADD CONSTRAINT "volunteer_availability_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteers" ADD CONSTRAINT "volunteers_source_intake_draft_id_intake_drafts_id_fk" FOREIGN KEY ("source_intake_draft_id") REFERENCES "public"."intake_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_municipality_idx" ON "clients" USING btree ("municipality");--> statement-breakpoint
CREATE INDEX "clients_active_idx" ON "clients" USING btree ("active");--> statement-breakpoint
CREATE INDEX "deliverable_meals_category_idx" ON "deliverable_meals" USING btree ("category");--> statement-breakpoint
CREATE INDEX "delivery_requests_client_idx" ON "delivery_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "delivery_requests_status_idx" ON "delivery_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_requests_scheduled_date_idx" ON "delivery_requests" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "delivery_requests_due_bucket_idx" ON "delivery_requests" USING btree ("due_bucket");--> statement-breakpoint
CREATE INDEX "depots_municipality_idx" ON "depots" USING btree ("municipality");--> statement-breakpoint
CREATE INDEX "driver_sessions_route_idx" ON "driver_sessions" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "driver_sessions_status_idx" ON "driver_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "driver_sessions_last_seen_idx" ON "driver_sessions" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "ingredient_items_perishability_idx" ON "ingredient_items" USING btree ("perishability_score");--> statement-breakpoint
CREATE INDEX "intake_drafts_status_idx" ON "intake_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intake_drafts_intake_message_idx" ON "intake_drafts" USING btree ("intake_message_id");--> statement-breakpoint
CREATE INDEX "intake_messages_status_idx" ON "intake_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "intake_messages_received_at_idx" ON "intake_messages" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "route_stop_meal_items_route_stop_idx" ON "route_stop_meal_items" USING btree ("route_stop_id");--> statement-breakpoint
CREATE INDEX "route_stops_route_idx" ON "route_stops" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "route_stops_status_idx" ON "route_stops" USING btree ("status");--> statement-breakpoint
CREATE INDEX "routes_service_date_idx" ON "routes" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "routes_status_idx" ON "routes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "routes_volunteer_idx" ON "routes" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX "vehicles_active_idx" ON "vehicles" USING btree ("active");--> statement-breakpoint
CREATE INDEX "vehicles_home_depot_idx" ON "vehicles" USING btree ("home_depot_id");--> statement-breakpoint
CREATE INDEX "volunteer_availability_volunteer_idx" ON "volunteer_availability" USING btree ("volunteer_id");--> statement-breakpoint
CREATE INDEX "volunteer_availability_date_idx" ON "volunteer_availability" USING btree ("date");--> statement-breakpoint
CREATE INDEX "volunteers_active_idx" ON "volunteers" USING btree ("active");--> statement-breakpoint
CREATE INDEX "volunteers_municipality_idx" ON "volunteers" USING btree ("home_municipality");