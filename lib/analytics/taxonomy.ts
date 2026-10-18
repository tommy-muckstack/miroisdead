// Analytics taxonomy for the shared IsDead PostHog project 666931 (contract: yourappisdead/ANALYTICS.md, see docs/ANALYTICS.md).
// Super properties: product (this app's slug), surface ("landing" = logged-out marketing pages, "app" = the working product
// and anything it publishes), platform ("web"). Page views are PostHog's built-in $pageview.
// Events are `app_<object>_<action>` (or `landing_<object>_<action>` for marketing CTAs); the product name lives in
// `product`, never in an event name. Never send user content (titles, URLs, emails, text) as properties.
export const APP = "miroisdead" as const;
export type Surface = "landing" | "app";
export const EVENTS = {
  // ---- account ----
  app_auth_started: "app_auth_started",     // method ("password" | "google" | "demo"), mode ("signin" | "signup")
  app_auth_failed: "app_auth_failed",       // method, mode, reason (Firebase error code only)
  app_signed_up: "app_signed_up",           // method ("password" | "google")
  app_signed_in: "app_signed_in",           // method ("password" | "google" | "demo")
  app_signed_out: "app_signed_out",
  app_onboarding_completed: "app_onboarding_completed", // use ("product" | … | "unset"), team_size, skipped (bool)
  // ---- dashboard ----
  app_board_created: "app_board_created",   // template, origin ("strip" | "create_menu" | "templates_modal" | "custom_template" | "import"), in_space (bool)
  app_board_opened: "app_board_opened",     // origin ("recents" | "starred" | "browse" | "space")
  app_board_renamed: "app_board_renamed",
  app_board_duplicated: "app_board_duplicated",
  app_board_deleted: "app_board_deleted",
  app_board_exported: "app_board_exported", // format ("json" | "pdf" | "png" | "csv" | "template" | "scene_json"), origin ("dashboard" | "editor"), area, quality
  app_board_starred: "app_board_starred",   // starred (bool)
  app_space_created: "app_space_created",
  app_templates_modal_opened: "app_templates_modal_opened",
  app_template_filter_changed: "app_template_filter_changed", // filter (template category)
  app_shared: "app_shared",                 // object ("board" | "invite"), method ("share_sheet" | "clipboard"), via ("invite_form" | "copy_button" | "row_menu" | "header"), access, result
  // ---- board editor ----
  app_board_object_created: "app_board_object_created",   // object_type, count, remote (bool)
  app_board_tool_selected: "app_board_tool_selected",     // tool
  app_board_template_inserted: "app_board_template_inserted", // template, objects (count)
  app_board_share_opened: "app_board_share_opened",       // tab
  app_board_share_access_changed: "app_board_share_access_changed", // access ("none" | "view" | "edit")
  app_board_comment_posted: "app_board_comment_posted",   // reply (bool)
  app_board_timer_started: "app_board_timer_started",     // minutes
  app_board_voting_started: "app_board_voting_started",   // votes_per_person
  app_board_voting_ended: "app_board_voting_ended",       // votes_cast
  app_board_reaction_sent: "app_board_reaction_sent",     // emoji
  app_board_present_started: "app_board_present_started", // frames
  app_board_command_run: "app_board_command_run",         // command (id)
  app_board_group_changed: "app_board_group_changed",     // action ("group" | "ungroup"), count
  app_board_live_peer_connected: "app_board_live_peer_connected", // peers
  app_board_guest_viewed: "app_board_guest_viewed",       // access ("view" | "edit"), embed (bool)
  // ---- marketing site ----
  landing_cta_clicked: "landing_cta_clicked",   // target ("nav_get_started" | "nav_go_to_dashboard" | "hero_form" | "platform_explore" | "use_case_<id>")
  landing_nav_clicked: "landing_nav_clicked",   // menu, item (menu labels, not user content)
  landing_use_case_tab_selected: "landing_use_case_tab_selected", // tab
  landing_cookie_choice_made: "landing_cookie_choice_made",       // choice ("accept" | "reject" | "settings")
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export const EVENT_PREFIXES = ["app_", "landing_"] as const;
/** Super properties every event carries (yourappisdead/ANALYTICS.md §1). */
export const superProps = (surface: Surface) => ({ product: APP, surface, platform: "web" as const });
/** Super properties older IsDead taxonomies persisted in the shared yourappisdead.com cookie. Unregistered at boot. */
export const LEGACY_PROPS = ["app", "app_family", "base_path", "suite_id", "app_id", "schema_version", "source", "site_id", "environment", "ads_blocked", "account_type"] as const;
