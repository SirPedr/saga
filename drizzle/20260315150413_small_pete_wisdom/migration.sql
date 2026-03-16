CREATE TABLE "npc_attribute_values" (
	"npc_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	CONSTRAINT "npc_attribute_values_npc_id_key_pk" PRIMARY KEY("npc_id","key")
);
--> statement-breakpoint
CREATE TABLE "npc_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "npc_templates_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "npcs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"portrait_url" text,
	"token_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "npc_attribute_values" ADD CONSTRAINT "npc_attribute_values_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_templates" ADD CONSTRAINT "npc_templates_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npcs" ADD CONSTRAINT "npcs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_npcs" ADD CONSTRAINT "session_npcs_npc_id_npcs_id_fk" FOREIGN KEY ("npc_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;