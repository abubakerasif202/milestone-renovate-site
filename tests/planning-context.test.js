import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sanitizePlanningContext, loadPlanningContext, savePlanningContext, clearPlanningContext } from '../public/js/lib/planning-context.js';
import { initialState, applyPlanningContext, answeredSteps, buildPayload } from '../public/js/lib/wizard.js';
import { enquirySchema } from '../lib/enquiry-schema.js';
import { rowToEnquiry } from '../lib/notification-retry.js';
const storage = () => { const map = new Map(); return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}; };
const planner = { areaInputM2:6, renovationType:'full_refit_layout',finish:'premium',plumbing:'major',access:'apartment',waterproofing:'replace',tiling:'full_height',shower:'walk_in',timeframe:'3_6' };

test('planning context discards personal information, unknown enums and out-of-range measurements',()=>{
 const safe = sanitizePlanningContext({postcode:'2150',name:'Alex',consent:true,planner:{...planner,notes:'Call 0412 999 888',lengthM:Infinity,widthM:100},studio:{room:'kitchen',style:'unknown',email:'a@example.com'}});
 assert.equal(safe.postcode,'2150'); assert.equal(safe.planner.areaInputM2,6);
 assert.deepEqual(safe.studio,{room:'kitchen'});
 for(const secret of ['Alex','consent','Call','Infinity','widthM','email']) assert.ok(!JSON.stringify(safe).includes(secret));
 assert.deepEqual(sanitizePlanningContext({postcode:'0100'}),{version:1});
});
test('storage merges postcode and preferences, reconciles room types and tolerates blocked storage',()=>{
 const store=storage();savePlanningContext(store,{postcode:'2150'});savePlanningContext(store,{planner});
 assert.equal(loadPlanningContext(store).postcode,'2150');assert.deepEqual(loadPlanningContext(store).planner,planner);
 savePlanningContext(store,{studio:{room:'kitchen',palette:'sage-cream'}});assert.equal(loadPlanningContext(store).planner,undefined);
 savePlanningContext(store,{planner});assert.equal(loadPlanningContext(store).studio,undefined);
 clearPlanningContext(store);assert.deepEqual(loadPlanningContext(store),{version:1});
 assert.doesNotThrow(()=>savePlanningContext(null,{planner}));
});
test('planner selections prefill existing answers and retain validated planning in lead JSONB',()=>{
 const state=applyPlanningContext(initialState(),{postcode:'2150',planner});
 assert.equal(state.category,'bathroom');assert.equal(state.roomSize,'medium');assert.equal(state.layoutChange,'major');assert.equal(state.propertyType,'apartment');assert.equal(state.timeline,'3_6_months');
 assert.deepEqual(state.scope,['relocate_plumbing','waterproofing','new_tiling','walk_in_shower','new_layout']);
 assert.deepEqual([...answeredSteps(state)],['category','location','property','scope','size','finish']);
 const payload=buildPayload({...state,name:'Alex Lee',phone:'0412345678',email:'alex@example.com',consent:true},{idempotencyKey:randomUUID(),startedAt:Date.now()-10000});
 assert.equal(enquirySchema.safeParse(payload).success,true);
 assert.deepEqual(payload.wizard.planning.planner,planner);
 assert.equal(enquirySchema.safeParse({...payload,wizard:{...payload.wizard,planning:{version:1,planner:{...planner,email:'secret@example.com'}}}}).success,false);
 assert.deepEqual(rowToEnquiry({wizard_data:payload.wizard}).wizard,payload.wizard);
});
test('studio room maps to category without assigning unsupported finish level or budget',()=>{
 const state=applyPlanningContext(initialState(),{studio:{room:'living',layout:'open-plan',palette:'warm-neutral'}});
 assert.equal(state.category,'whole_home');assert.equal(state.layoutChange,'major');assert.equal(state.finishLevel,'');assert.equal(state.budgetRange,'');
});
import { createEnquiry } from '../lib/enquiry-service.js';
import { createMemoryStore } from '../lib/memory-store.js';

test('validated planning survives durable enquiry storage, staff notification and idempotent retry', async () => {
 const now = new Date();
 const state = applyPlanningContext(initialState(), { postcode:'2150', planner, studio:{room:'bathroom',style:'warm-minimalism'} });
 const body = buildPayload({...state,name:'Alex Lee',phone:'0412345678',email:'alex@example.com',consent:true},{idempotencyKey:randomUUID(),startedAt:now.getTime()-10000,source:'calculator'});
 const store=createMemoryStore();const sent=[];
 const deps={store,ipSecret:'local-test-only',now:()=>now,notifier:{enabled:true,async sendStaffNotification(value){sent.push(value);}}};
 const first=await createEnquiry({body,ip:'203.0.113.1'},deps);
 assert.equal(first.status,201);assert.deepEqual(store.rows[0].wizard_data.planning,body.wizard.planning);
 assert.deepEqual(sent[0].enquiry.wizard.planning,body.wizard.planning);
 const again=await createEnquiry({body,ip:'203.0.113.1'},deps);
 assert.equal(again.body.reference,first.body.reference);assert.equal(store.rows.length,1);assert.equal(sent.length,1);
 const tampered=await createEnquiry({body:{...body,idempotencyKey:randomUUID(),wizard:{planning:{version:1,studio:{room:'bathroom',apiKey:'secret'}}}},ip:'203.0.113.1'},deps);
 assert.equal(tampered.status,422);assert.equal(store.rows.length,1);
});
