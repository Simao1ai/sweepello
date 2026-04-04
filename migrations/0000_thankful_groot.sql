CREATE TABLE "ai_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"admin_user_id" varchar,
	"model" text DEFAULT 'gpt-4o' NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 8) DEFAULT '0' NOT NULL,
	"rounds" integer DEFAULT 1 NOT NULL,
	"user_message" text
);
--> statement-breakpoint
CREATE TABLE "cleaner_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cleaner_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text DEFAULT '08:00' NOT NULL,
	"end_time" text DEFAULT '18:00' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"pay_rate" integer DEFAULT 70 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"status_note" text,
	"rating" numeric(3, 2) DEFAULT '5.00',
	"on_time_percent" integer DEFAULT 100,
	"total_jobs" integer DEFAULT 0,
	"total_revenue" numeric(10, 2) DEFAULT '0.00',
	"service_area" text,
	"zip_codes" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"admin_note" text,
	"is_online" boolean DEFAULT false NOT NULL,
	"current_lat" numeric(10, 7),
	"current_lng" numeric(10, 7),
	"last_seen_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"property_address" text NOT NULL,
	"property_type" text DEFAULT 'airbnb' NOT NULL,
	"city" text,
	"zip_code" text,
	"bedrooms" integer,
	"bathrooms" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_vip" boolean DEFAULT false NOT NULL,
	"admin_note" text,
	"client_rating" numeric(3, 2),
	"client_rating_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "contractor_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"zip_code" text NOT NULL,
	"service_zip_codes" text NOT NULL,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"cleaning_types" text NOT NULL,
	"is_insured" boolean DEFAULT false NOT NULL,
	"has_own_supplies" boolean DEFAULT false NOT NULL,
	"references" text,
	"available_days" text NOT NULL,
	"available_hours" text NOT NULL,
	"agreement_acknowledged" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contractor_onboarding" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"full_name" text NOT NULL,
	"business_name" text,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text DEFAULT 'NJ' NOT NULL,
	"zip_code" text NOT NULL,
	"service_zip_codes" text,
	"agreement_signed" boolean DEFAULT false NOT NULL,
	"agreement_signed_at" timestamp,
	"agreement_signature_name" text,
	"agreement_declined" boolean DEFAULT false NOT NULL,
	"w9_signed" boolean DEFAULT false NOT NULL,
	"w9_signed_at" timestamp,
	"w9_signature_name" text,
	"insurance_provider" text,
	"insurance_policy_number" text,
	"insurance_expiration_date" text,
	"has_insurance" boolean DEFAULT false NOT NULL,
	"stripe_account_id" text,
	"stripe_onboarding_complete" boolean DEFAULT false NOT NULL,
	"onboarding_status" text DEFAULT 'incomplete' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "contractor_onboarding_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" varchar,
	"job_id" varchar,
	"reported_by_user_id" varchar NOT NULL,
	"client_id" varchar,
	"cleaner_id" varchar,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"admin_note" text,
	"resolution_note" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "job_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" varchar NOT NULL,
	"cleaner_id" varchar NOT NULL,
	"status" text DEFAULT 'offered' NOT NULL,
	"priority_rank" integer DEFAULT 0 NOT NULL,
	"offered_at" timestamp DEFAULT now(),
	"responded_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"uploaded_by_user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"cleaner_id" varchar,
	"property_address" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"cleaner_pay" numeric(10, 2),
	"profit" numeric(10, 2),
	"service_request_id" varchar,
	"notes" text,
	"client_rating" integer,
	"client_rating_note" text,
	"tip_amount" numeric(10, 2),
	"tip_stripe_intent_id" text,
	"tip_paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_role" text NOT NULL,
	"sender_name" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'job_assigned' NOT NULL,
	"job_id" varchar,
	"service_request_id" varchar,
	"job_offer_id" varchar,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"cleaner_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"type" text DEFAULT 'incoming' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"stripe_payment_intent_id" text
);
--> statement-breakpoint
CREATE TABLE "recurring_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"property_address" text NOT NULL,
	"city" text,
	"zip_code" text,
	"service_type" text DEFAULT 'standard' NOT NULL,
	"frequency" text NOT NULL,
	"day_of_week" integer,
	"preferred_time" text,
	"bedrooms" integer DEFAULT 2,
	"bathrooms" integer DEFAULT 1,
	"square_footage" integer DEFAULT 1000,
	"basement" boolean DEFAULT false,
	"preferred_cleaner_id" varchar,
	"special_instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_service_date" timestamp,
	"last_service_date" timestamp,
	"estimated_price" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"cleaner_id" varchar NOT NULL,
	"user_id" varchar,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now(),
	"moderation_status" text DEFAULT 'approved' NOT NULL,
	"admin_note" text,
	"admin_modified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"property_address" text NOT NULL,
	"city" text,
	"zip_code" text,
	"property_type" text DEFAULT 'airbnb' NOT NULL,
	"service_type" text DEFAULT 'standard' NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"basement" boolean DEFAULT false,
	"requested_date" timestamp NOT NULL,
	"preferred_time" text,
	"special_instructions" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"estimated_price" numeric(10, 2),
	"subcontractor_cost" numeric(10, 2),
	"assigned_cleaner_id" varchar,
	"preferred_cleaner_id" varchar,
	"job_id" varchar,
	"square_footage" integer,
	"is_on_demand" boolean DEFAULT false NOT NULL,
	"surge_multiplier" numeric(4, 2) DEFAULT '1.00',
	"payment_status" text DEFAULT 'pending',
	"canceled_at" timestamp,
	"cancellation_fee_charged" boolean DEFAULT false NOT NULL,
	"confirmed_arrival_time" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"phone" text,
	"address" text,
	"city" text,
	"zip_code" text,
	"approval_status" text,
	"stripe_customer_id" text,
	"stripe_payment_method_id" text,
	"stripe_card_brand" text,
	"stripe_card_last4" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "ai_logs_created_at_idx" ON "ai_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_logs_admin_user_id_idx" ON "ai_usage_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "cleaner_avail_cleaner_id_idx" ON "cleaner_availability" USING btree ("cleaner_id");--> statement-breakpoint
CREATE INDEX "cleaner_avail_cleaner_day_idx" ON "cleaner_availability" USING btree ("cleaner_id","day_of_week");--> statement-breakpoint
CREATE INDEX "cleaners_user_id_idx" ON "cleaners" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cleaners_status_idx" ON "cleaners" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cleaners_featured_idx" ON "cleaners" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "cleaners_online_idx" ON "cleaners" USING btree ("is_online");--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_zip_code_idx" ON "clients" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "clients_is_active_idx" ON "clients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "contractor_apps_status_idx" ON "contractor_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contractor_apps_email_idx" ON "contractor_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contractor_apps_created_at_idx" ON "contractor_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disputes_job_id_idx" ON "disputes" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "disputes_reported_by_idx" ON "disputes" USING btree ("reported_by_user_id");--> statement-breakpoint
CREATE INDEX "disputes_client_id_idx" ON "disputes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "job_offers_sr_id_idx" ON "job_offers" USING btree ("service_request_id");--> statement-breakpoint
CREATE INDEX "job_offers_cleaner_id_idx" ON "job_offers" USING btree ("cleaner_id");--> statement-breakpoint
CREATE INDEX "job_offers_status_idx" ON "job_offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_offers_expires_at_idx" ON "job_offers" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "job_photos_job_id_idx" ON "job_photos" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_photos_type_idx" ON "job_photos" USING btree ("job_id","type");--> statement-breakpoint
CREATE INDEX "jobs_client_id_idx" ON "jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "jobs_cleaner_id_idx" ON "jobs" USING btree ("cleaner_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_service_request_id_idx" ON "jobs" USING btree ("service_request_id");--> statement-breakpoint
CREATE INDEX "jobs_scheduled_date_idx" ON "jobs" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "messages_job_id_idx" ON "messages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_job_unread_idx" ON "messages" USING btree ("job_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_job_id_idx" ON "payments" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "payments_cleaner_id_idx" ON "payments" USING btree ("cleaner_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recurring_bookings_user_id_idx" ON "recurring_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_bookings_is_active_idx" ON "recurring_bookings" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "recurring_bookings_next_service_idx" ON "recurring_bookings" USING btree ("next_service_date");--> statement-breakpoint
CREATE INDEX "reviews_job_id_idx" ON "reviews" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "reviews_cleaner_id_idx" ON "reviews" USING btree ("cleaner_id");--> statement-breakpoint
CREATE INDEX "reviews_client_id_idx" ON "reviews" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "reviews_moderation_status_idx" ON "reviews" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "sr_user_id_idx" ON "service_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sr_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sr_assigned_cleaner_idx" ON "service_requests" USING btree ("assigned_cleaner_id");--> statement-breakpoint
CREATE INDEX "sr_requested_date_idx" ON "service_requests" USING btree ("requested_date");--> statement-breakpoint
CREATE INDEX "sr_created_at_idx" ON "service_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sr_zip_code_idx" ON "service_requests" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "user_profiles_role_idx" ON "user_profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");