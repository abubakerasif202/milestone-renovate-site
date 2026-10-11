const options = (items) => items.map(([value, label]) => ({ value, label }));
export const DESIGN_STEPS = [
  { key: 'room', title: 'Which space are you imagining?', options: options([['bathroom','Bathroom'],['kitchen','Kitchen'],['living','Living space']]) },
  { key: 'style', title: 'Choose your design direction', options: options([['contemporary-australian','Contemporary Australian'],['warm-minimalism','Warm minimalism'],['modern-luxury','Modern luxury'],['scandinavian','Scandinavian'],['mediterranean','Mediterranean'],['timeless-classic','Timeless classic'],['industrial','Industrial'],['stone-timber','Natural stone & timber'],['monochrome','Architectural monochrome']]) },
  { key: 'palette', title: 'Set the colour story', options: options([['warm-neutral','Warm neutrals'],['sage-cream','Sage & cream'],['stone-charcoal','Stone & charcoal'],['coastal-sand','Coastal sand']]) },
  { key: 'walls', title: 'Consider the wall finish', options: options([['painted','Painted walls'],['porcelain','Porcelain tile'],['textured','Textured finish'],['stone','Natural stone']]) },
  { key: 'floor', title: 'Ground the room', options: options([['porcelain','Porcelain tile'],['timber-look','Timber-look porcelain'],['engineered-timber','Engineered timber'],['stone','Natural stone']]) },
  { key: 'cabinetry', title: 'Shape your joinery', options: options([['timber','Natural timber'],['painted','Painted joinery'],['fluted','Fluted detail'],['none','No new joinery']]) },
  { key: 'surfaces', title: 'Choose your surfaces', options: options([['quartz','Engineered quartz'],['porcelain','Porcelain'],['natural-stone','Natural stone'],['timber','Timber'],['none','No new surfaces']]) },
  { key: 'fixtures', title: 'Finish the details', options: options([['chrome','Polished chrome'],['brushed-nickel','Brushed nickel'],['brass','Brass tones'],['matte-black','Matte black']]) },
  { key: 'lighting', title: 'Create the lighting mood', options: options([['balanced','Balanced & practical'],['warm-layered','Warm & layered'],['task-led','Task-led'],['statement','A statement feature']]) },
  { key: 'layout', title: 'How should the room work?', options: options([['retain','Retain the existing layout'],['reconfigure','Explore a new layout'],['open-plan','Explore an open plan']]) },
  { key: 'storage', title: 'Make room for everyday life', options: options([['essential','Essential storage'],['concealed','Concealed & streamlined'],['generous','Generous storage']]) },
  { key: 'luxury', title: 'Add a personal finishing touch', options: options([['none','Keep it considered'],['heated-floor','Heated flooring'],['freestanding-bath','Freestanding bath'],['island','Kitchen island'],['feature-wall','Feature wall']]) },
  { key: 'accessibility', title: 'Plan for comfortable use', options: options([['standard','Discuss my existing needs'],['step-free','Prioritise step-free access'],['easy-reach','Easy-reach storage & controls'],['future-ready','Plan for changing needs']]) },
  { key: 'summary', title: 'Your design direction', options: [] },
];
export const PALETTES = {
  'warm-neutral': ['#E9DFCE','#AE9278','#554C42'],
  'sage-cream': ['#F4EFE3','#A8B3A0','#304B3F'],
  'stone-charcoal': ['#DFDBD3','#96928C','#393D3C'],
  'coastal-sand': ['#F1E9D9','#CAB99D','#708A8A'],
};
// Bathrooms choose from six photographed directions, shown in this order.
export const BATHROOM_STYLES = ['contemporary-australian','industrial','mediterranean','modern-luxury','timeless-classic','scandinavian'];
export function visibleOptions(step, config) {
  if (step.key === 'style' && config.room === 'bathroom') {
    return BATHROOM_STYLES.map((style) => step.options.find(({ value }) => value === style));
  }
  return step.options.filter(({ value }) => {
    if (step.key === 'floor' && config.room === 'bathroom') return value !== 'engineered-timber';
    if (step.key === 'layout' && config.room === 'bathroom') return value !== 'open-plan';
    if (step.key === 'luxury') return value === 'none' || value === 'feature-wall' || (config.room === 'bathroom' && ['heated-floor','freestanding-bath'].includes(value)) || (config.room === 'kitchen' && value === 'island');
    if (step.key === 'surfaces' && config.room === 'bathroom') return value !== 'timber';
    return true;
  });
}
export function activeSteps(config) {
  return DESIGN_STEPS.filter(({ key }) => !(config.room === 'living' && ['surfaces','fixtures'].includes(key)));
}
export function cleanDesign(input) {
  const source = input && typeof input === 'object' ? input : {};
  const result = {};
  for (const step of DESIGN_STEPS) {
    if (step.key === 'summary') continue;
    if (visibleOptions(step, result).some(({ value }) => value === source[step.key])) result[step.key] = source[step.key];
  }
  if (result.room === 'living') { delete result.surfaces; delete result.fixtures; }
  return result;
}
export function labelFor(key, value) {
  return DESIGN_STEPS.find((step) => step.key === key)?.options.find((option) => option.value === value)?.label ?? '';
}
export function designRecommendations(config) {
  const notes = ['Final material suitability, dimensions and construction details require a site assessment.'];
  if (config.room === 'bathroom') notes.push('Discuss slip resistance, waterproofing and drainage before finalising any wet-area finish.');
  if (config.layout && config.layout !== 'retain') notes.push('Check existing services, walls and approvals before committing to a new layout.');
  if (config.surfaces === 'natural-stone' || config.floor === 'stone') notes.push('Discuss sealing, maintenance and stone variation when selecting samples.');
  if (config.accessibility && config.accessibility !== 'standard') notes.push('Review clearances, threshold transitions and reachable controls together during the assessment.');
  if (config.lighting === 'warm-layered') notes.push('Pair ambient light with practical task lighting around work surfaces.');
  if (config.luxury === 'island') notes.push('Confirm circulation space and appliance clearances before choosing an island.');
  return notes;
}
export function encodeDesign(config) { return new URLSearchParams(cleanDesign(config)).toString(); }
export function decodeDesign(query) { return cleanDesign(Object.fromEntries(new URLSearchParams(query))); }
const SUMMARY_LABELS = {
  room: 'Room', style: 'Design direction', palette: 'Colour palette', walls: 'Wall finish',
  floor: 'Floor material', cabinetry: 'Joinery', surfaces: 'Surfaces', fixtures: 'Fittings',
  lighting: 'Lighting mood', layout: 'Layout', storage: 'Storage', luxury: 'Optional feature',
  accessibility: 'Accessibility priorities',
};
export function designSummary(config) {
  const clean = cleanDesign(config);
  return activeSteps(clean).filter(({key}) => clean[key]).map(({key}) => ({key,title:SUMMARY_LABELS[key],value:labelFor(key,clean[key])}));
}
