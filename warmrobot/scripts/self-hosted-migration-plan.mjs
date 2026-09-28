/**
 * Tables containing application data for a self-hosted PostgreSQL export.
 * Account credentials and active sessions are managed separately by the
 * application's own authentication tables.
 */
export const SELF_HOSTED_DATA_TABLES = Object.freeze([
  "public.materials",
  "public.categories",
  "public.thicknesses",
  "public.size_labels",
  "public.clothing_templates",
  "public.product_catalog",
  "public.category_product_links",
  "public.garment_variants",
  "public.category_style_guides",
  "public.category_guide_contents",
  "public.guide_visual_assets",
  "public.advice_tip_tags",
  "public.users",
  "public.roles",
  "public.user_roles",
  "public.user_day_permissions",
  "public.day_teacher_assignments",
  "public.lessons",
  "public.admin_user_info_records",
  "public.profiles",
  "public.login_identities",
  "public.babies",
  "public.baby_warmth_preferences",
  "public.clothing_items",
  "public.outfit_recommendations",
  "public.outfit_recommendation_items",
  "public.dressing_records",
  "public.home_daily_briefs",
  "public.url_parse_jobs",
  "public.wardrobe_scan_jobs",
  "public.weather_cache",
  "public.analytics_events",
]);

export function buildSelfHostedTablePlan() {
  return [...SELF_HOSTED_DATA_TABLES];
}
