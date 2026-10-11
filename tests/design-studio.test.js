import test from 'node:test';
import assert from 'node:assert/strict';
import {activeSteps,cleanDesign,decodeDesign,designRecommendations,designSummary,encodeDesign,visibleOptions,DESIGN_STEPS} from '../public/js/lib/design-studio.js';
test('design config excludes unknown and personal information',()=>{
 assert.deepEqual(cleanDesign({room:'bathroom',style:'monochrome',email:'private@example.com',notes:'Personal notes',floor:'engineered-timber',luxury:'island'}),{room:'bathroom',style:'monochrome'});
});
test('living board omits wet-area surfaces and fittings steps and data',()=>{
 const config=cleanDesign({room:'living',surfaces:'quartz',fixtures:'chrome'});
 assert.deepEqual(config,{room:'living'});
 assert.equal(activeSteps(config).length,12);
 assert.equal(activeSteps({room:'bathroom'}).length,14);
});
test('room adaptation invalidates irrelevant luxury and layout selections',()=>{
 assert.equal(cleanDesign({room:'bathroom',layout:'open-plan',luxury:'island'}).layout,undefined);
 assert.deepEqual(visibleOptions(DESIGN_STEPS.find(s=>s.key==='luxury'),{room:'kitchen'}).map(o=>o.value),['none','island','feature-wall']);
});
test('share URL round trip contains only recognised selections',()=>{
 const config={room:'kitchen',style:'warm-minimalism',palette:'sage-cream',luxury:'island',accessibility:'easy-reach'};
 assert.deepEqual(decodeDesign(encodeDesign(config)),config);
 assert.deepEqual(decodeDesign('room=bathroom&style=%3Cscript%3E&phone=123'),{room:'bathroom'});
});
test('summary is labelled and advice follows practical selections',()=>{
 const config={room:'bathroom',layout:'reconfigure',floor:'stone',accessibility:'step-free'};
 assert.equal(designSummary(config)[0].value,'Bathroom');
 assert.ok(designRecommendations(config).some(s=>s.includes('waterproofing')));
 assert.ok(designRecommendations(config).some(s=>s.includes('approvals')));
 assert.ok(designRecommendations(config).some(s=>s.includes('sealing')));
});
