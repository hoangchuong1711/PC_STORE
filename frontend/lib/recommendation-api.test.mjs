import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecommendationApi } from './recommendation-api.ts';
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('submits answers without client criteria or a user identity',async()=>{
  let sent;
  const api=createRecommendationApi(async(url,options)=>{sent={url,options};return response({requestId:7,status:'QUEUED'},202);});
  const input={pcBudget:20000000,purposes:['GAMING'],purposeNotes:'',softwareText:'Browser',gamesText:'',targetResolution:null,targetFps:null,minStorageGb:500};
  assert.equal((await api.create(input)).requestId,7);
  assert.equal(sent.url,'/api/customer/recommendations');
  assert.deepEqual(JSON.parse(sent.options.body),input);
  assert.equal(sent.options.credentials,'same-origin');
});
test('propagates quota and unavailable errors instead of showing a fake build',async()=>{
  const api=createRecommendationApi(async()=>response({code:'AI_NOT_CONFIGURED',message:'Chưa bật AI'},503));
  await assert.rejects(api.get(1),e=>e.code==='AI_NOT_CONFIGURED' && e.status===503);
});
test('rejects malformed successful result',async()=>{
  const api=createRecommendationApi(async()=>response({requestId:1,status:'SUCCEEDED',result:null}));
  await assert.rejects(api.get(1),e=>e.code==='INVALID_RESPONSE');
});
