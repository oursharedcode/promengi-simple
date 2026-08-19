// ─── Site configuration ──────────────────────────────────────────────────────
// The only file you need to edit after registering with Google AdSense and a
// visitor-map provider. Leave a value empty ("") and the page shows a neutral
// placeholder in its spot instead.

export const CONFIG = {
  // Google AdSense publisher ID, e.g. "ca-pub-1234567890123456".
  // Get it at https://adsense.google.com after your site is approved.
  // Also update public/ads.txt with the same ID (without the "ca-" prefix).
  adsenseClient: "",

  // AdSense ad-unit slot ID for the vertical ad, e.g. "1234567890".
  // Create a "Display ad" unit (vertical) in AdSense → Ads → By ad unit.
  adsenseSlot: "",

  // Visitor-map widget script URL from https://mapmyvisitors.com or
  // https://clustrmaps.com (free tier). After registering the page URL, copy
  // the `src` of the embed <script> they give you, e.g.
  // "https://mapmyvisitors.com/map.js?d=AbCdEfGh...&cl=ffffff&w=a".
  visitorMapSrc: "",
};
