CREATE TABLE "session_factions" (
	"session_id" uuid NOT NULL,
	"faction_id" uuid NOT NULL,
	CONSTRAINT "session_factions_session_id_faction_id_pk" PRIMARY KEY("session_id","faction_id")
);
--> statement-breakpoint
CREATE TABLE "session_npcs" (
	"session_id" uuid NOT NULL,
	"npc_id" uuid NOT NULL,
	"role" text,
	CONSTRAINT "session_npcs_session_id_npc_id_pk" PRIMARY KEY("session_id","npc_id")
);
--> statement-breakpoint
CREATE TABLE "session_playable_characters" (
	"session_id" uuid NOT NULL,
	"playable_character_id" uuid NOT NULL,
	CONSTRAINT "session_playable_characters_session_id_playable_character_id_pk" PRIMARY KEY("session_id","playable_character_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"mastra_thread_id" text,
	"title" text NOT NULL,
	"session_number" integer NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"session_date" date,
	"planning_notes" text,
	"outcome_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_factions" ADD CONSTRAINT "session_factions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_npcs" ADD CONSTRAINT "session_npcs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_playable_characters" ADD CONSTRAINT "session_playable_characters_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;