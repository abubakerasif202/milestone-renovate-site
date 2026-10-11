import { PLANNER_CHOICES, PLANNER_FLAGS, RENOVATION_TYPES, FINISH_LEVELS, PLUMBING_CHANGES } from './estimate.js';

export const PLANNER_OPTIONS = { ...PLANNER_CHOICES, renovationType: RENOVATION_TYPES, finish: FINISH_LEVELS, plumbing: PLUMBING_CHANGES };
export const STUDIO_OPTIONS = {
 room: ['bathroom','kitchen','living'], style: ['contemporary-australian','warm-minimalism','modern-luxury','scandinavian','mediterranean','timeless-classic','industrial','stone-timber','monochrome'],
 palette: ['warm-neutral','sage-cream','stone-charcoal','coastal-sand'], walls: ['painted','porcelain','textured','stone'], floor: ['porcelain','timber-look','engineered-timber','stone'],
 cabinetry: ['timber','painted','fluted','none'], surfaces: ['quartz','porcelain','natural-stone','timber','none'], fixtures: ['chrome','brushed-nickel','brass','matte-black','none'],
 lighting: ['balanced','warm-layered','task-led','statement'], layout: ['retain','reconfigure','open-plan'], storage: ['essential','concealed','generous'],
 luxury: ['none','heated-floor','freestanding-bath','island','feature-wall'], accessibility: ['standard','step-free','easy-reach','future-ready'],
};
export { PLANNER_FLAGS };
const KEY = 'mr-planning-context-v1';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function choices(input, options) {
 const result = {};
 if (!object(input)) return result;
 for (const [key, values] of Object.entries(options)) if (values.includes(input[key])) result[key] = input[key];
 return result;
}
/** Finite choices only: never retain contact, consent, addresses or free-text notes. */
export function sanitizePlanningContext(input) {
 const result = { version: 1 };
 if (!object(input)) return result;
 if (/^\d{4}$/.test(input.postcode ?? '') && Number(input.postcode) >= 200) result.postcode = input.postcode;
 if (object(input.planner)) {
  const planner = choices(input.planner, PLANNER_OPTIONS);
  for (const key of PLANNER_FLAGS) if (typeof input.planner[key] === 'boolean') planner[key] = input.planner[key];
  for (const [key, max] of [['lengthM',10],['widthM',10],['areaInputM2',100]]) {
   const value = input.planner[key];
   if (typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= max) planner[key] = value;
  }
  if (Object.keys(planner).length) result.planner = planner;
 }
 const studio = choices(input.studio, STUDIO_OPTIONS);
 if (Object.keys(studio).length) result.studio = studio;
 return result;
}
export function loadPlanningContext(storage) {
 try { const saved = JSON.parse(storage.getItem(KEY)); return saved?.version === 1 ? sanitizePlanningContext(saved) : { version: 1 }; } catch { return { version: 1 }; }
}
export function savePlanningContext(storage, patch) {
 const previous = loadPlanningContext(storage);
 const merged = { ...previous, ...patch };
 if (patch?.studio?.room && patch.studio.room !== 'bathroom') delete merged.planner;
 if (patch?.planner && merged.studio?.room && merged.studio.room !== 'bathroom') delete merged.studio;
 const next = sanitizePlanningContext(merged);
 try { storage.setItem(KEY, JSON.stringify(next)); } catch { /* Planning remains usable when storage is unavailable. */ }
 return next;
}
export function clearPlanningContext(storage) { try { storage.removeItem(KEY); } catch { /* Storage unavailable. */ } }
const FIELD_LABELS = {
 areaInputM2: 'Floor area (m²)', lengthM: 'Length (m)', widthM: 'Width (m)', renovationType: 'Renovation type', finish: 'Finish level', plumbing: 'Plumbing changes', floorConstruction: 'Floor construction', access: 'Site access', structural: 'Wall and structural changes', shower: 'Shower', bath: 'Bath', vanity: 'Vanity', toilet: 'Toilet', waterproofing: 'Waterproofing', tiling: 'Tiling', timeframe: 'Intended start', accessibility: 'Accessibility', strata: 'Strata considerations', olderHome: 'Older property', limitedAccess: 'Limited site access', underfloorHeating: 'Underfloor heating', featureLighting: 'Feature lighting', customStorage: 'Custom storage',
 room: 'Room', style: 'Design direction', palette: 'Colour palette', walls: 'Wall finish', floor: 'Floor material', cabinetry: 'Cabinetry', surfaces: 'Surfaces', fixtures: 'Fixtures', lighting: 'Lighting mood', layout: 'Layout', storage: 'Storage', luxury: 'Optional feature',
};
const VALUE_LABELS = {
 full_refit: 'Full renovation', full_refit_layout: 'Full renovation with layout change', mid_range: 'Contemporary', unknown: 'To be assessed', assess: 'Assessment required', '0_3': 'Within 3 months', '3_6': 'In 3–6 months', '6_12': 'In 6–12 months', '12_plus': 'In 12+ months', exploring: 'Exploring options',
};
const readable = value => {
 const text = VALUE_LABELS[value] ?? String(value).replace(/[_-]/g, ' ');
 return text.charAt(0).toUpperCase() + text.slice(1);
};
export function planningEntries(context) {
 const clean = sanitizePlanningContext(context);
 return Object.entries(clean).flatMap(([section, values]) => section === 'planner' || section === 'studio'
  ? Object.entries(values).map(([key,value]) => [`${section === 'planner' ? 'Bathroom' : 'Design'} · ${FIELD_LABELS[key] ?? key}`, typeof value === 'boolean' ? (value ? 'Yes' : 'No') : readable(value)]) : []);
}
