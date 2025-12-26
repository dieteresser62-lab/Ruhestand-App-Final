

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "prerender": false
};
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.C3K_ie7g.js","_app/immutable/chunks/CArxwV3n.js","_app/immutable/chunks/DK8bGZiz.js","_app/immutable/chunks/CmsKOCeN.js","_app/immutable/chunks/CGTK0Dt_.js"];
export const stylesheets = ["_app/immutable/assets/2.BT0v74Ch.css"];
export const fonts = [];
