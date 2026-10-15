// Analytics taxonomy shared by every IsDead sub-app (one PostHog project for the family).
//
// Conventions (keep these identical across sub-apps so one dashboard can cover all of them):
// - Every event carries super properties: `app` (which sub-app, e.g. "miroisdead"), `app_family` ("yourappisdead"),
//   `surface` ("site" = logged-out marketing pages, "app" = the signed-in product), `base_path`, `env`.
// - Event names are snake_case with a domain prefix: `site_*` (marketing website), `auth_*` (sign in / up),
//   `app_*` (dashboard / workspace), `board_*` (the editor; other sub-apps use their own product noun, e.g. `form_*`).
// - Property names are snake_case; never put raw user content (sticky text, emails, board titles) in properties.
// - Identify signed-in users by their Firebase uid (shared across the family) with `account_type` = "firebase" | "demo" | "guest" (guests stay anonymous, never identified).
export const APP = "miroisdead" as const;
export const APP_FAMILY = "yourappisdead" as const;
export type Surface = "hub" | "site" | "app"; // "hub" is sent by yourappisdead.com itself

export const EVENTS = {
  // ---- marketing site (logged out) ----
  site_page_viewed: "site_page_viewed",            // path, surface
  site_cta_clicked: "site_cta_clicked",            // cta ("nav_get_started" | "hero_form" | "join_bar" | …), path
  site_nav_clicked: "site_nav_clicked",            // menu ("Product" | …), item
  site_use_case_tab_selected: "site_use_case_tab_selected", // tab
  site_cookie_choice: "site_cookie_choice",        // choice ("accept" | "reject" | "settings")
  // ---- auth ----
  auth_started: "auth_started",                    // method ("email" | "google" | "demo"), mode ("signin" | "signup")
  auth_completed: "auth_completed",                // method, mode
  auth_failed: "auth_failed",                      // method, mode, reason (error code only)
  auth_signed_out: "auth_signed_out",
  // ---- workspace / dashboard ----
  app_page_viewed: "app_page_viewed",              // path
  app_board_created: "app_board_created",          // template, source ("strip" | "create_menu" | "templates_modal" | "custom_template" | "import")
  app_invite_shared: "app_invite_shared",          // method ("share_sheet" | "clipboard"), source ("header")
  app_board_opened: "app_board_opened",            // source ("recents" | "starred" | "space" | "new")
  app_board_renamed: "app_board_renamed",
  app_board_duplicated: "app_board_duplicated",
  app_board_deleted: "app_board_deleted",
  app_board_exported: "app_board_exported",        // format ("json")
  app_board_starred: "app_board_starred",          // starred (bool)
  app_space_created: "app_space_created",
  app_templates_modal_opened: "app_templates_modal_opened",
  // ---- board editor ----
  board_object_created: "board_object_created",    // object_type, count
  board_tool_selected: "board_tool_selected",      // tool
  board_exported: "board_exported",                // format ("pdf" | "png" | "csv" | "json" | "template" | "scene_json")
  board_share_access_changed: "board_share_access_changed", // access ("none" | "view" | "edit")
  board_share_opened: "board_share_opened",        // tab
  board_link_shared: "board_link_shared",          // method ("share_sheet" | "clipboard"), via ("invite_form" | "copy_button" | "row_menu"), access
  board_comment_posted: "board_comment_posted",    // reply (bool)
  board_timer_started: "board_timer_started",      // minutes
  board_voting_started: "board_voting_started",    // votes_per_person
  board_voting_ended: "board_voting_ended",        // votes_cast
  board_reaction_sent: "board_reaction_sent",      // emoji
  board_present_started: "board_present_started",  // frames
  board_command_run: "board_command_run",          // command
  board_group_changed: "board_group_changed",      // action ("group" | "ungroup")
  board_live_peer_connected: "board_live_peer_connected", // peers
  board_guest_viewed: "board_guest_viewed",        // access
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
export const EVENT_PREFIXES = ["site_", "auth_", "app_", "board_"] as const;
