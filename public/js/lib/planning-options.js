// Legacy non-price scope choices retained for saved planning briefs. No pricing engine.
export const RENOVATION_TYPES = ['refresh', 'full_refit', 'full_refit_layout'];
export const FINISH_LEVELS = ['essential', 'mid_range', 'premium'];
export const PLUMBING_CHANGES = ['none', 'minor', 'major'];
export const SITE_FLAGS = ['accessibility', 'strata', 'olderHome', 'limitedAccess'];
export const PLANNER_CHOICES = Object.freeze({
  floorConstruction: ['concrete', 'timber', 'unknown'], access: ['ground', 'upper', 'apartment'],
  structural: ['none', 'wall_removal', 'structural', 'unknown'], shower: ['retain', 'new', 'walk_in'],
  bath: ['none', 'retain', 'new', 'freestanding'], vanity: ['retain', 'single', 'double', 'custom'],
  toilet: ['retain', 'new', 'concealed'], waterproofing: ['assess', 'replace'],
  tiling: ['retain', 'floor', 'wet_zones', 'full_height'], timeframe: ['exploring', '0_3', '3_6', '6_12', '12_plus'],
});
export const PLANNER_FLAGS = [...SITE_FLAGS, 'underfloorHeating', 'featureLighting', 'customStorage'];
