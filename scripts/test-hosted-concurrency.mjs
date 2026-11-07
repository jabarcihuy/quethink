import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const env=Object.fromEntries((await readFile('.env.local','utf8')).trim().split('\n').filter(l=>l.includes('=')).map(l=>l.split(/=(.*)/s).slice(0,2)));
const fixture=JSON.parse(await readFile('.secrets/m1-test-fixtures.json','utf8'));
const c=createClient(env.EXPO_PUBLIC_SUPABASE_URL,env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
assert.ifError((await c.auth.signInWithPassword(fixture.accounts.find(a=>a.role==='guesser'))).error);
async function rpc(name,args){const r=await c.rpc('mobile_'+name,args);assert.ifError(r.error);return r.data;}
const learn=(action,payload={})=>rpc('learning',{p_action:action,p_payload:payload});
await rpc('update_my_profile',{p_display_name:'Synthetic Concurrency Student',p_nim:'005'});
assert.ok((await rpc('join_class',{p_code:fixture.classes[0].joinCode})).data);
const starts=await Promise.all([learn('start'),learn('start')]);assert.ok(starts.every(r=>r.data));assert.equal(starts[0].data.id,starts[1].data.id);const id=starts[0].data.id;
const saves=await Promise.all([learn('save',{attemptId:id,revision:0,answers:{table:'a'}}),learn('save',{attemptId:id,revision:0,answers:{table:'b'}})]);
assert.equal(saves.filter(r=>r.data).length,1);assert.equal(saves.filter(r=>r.error?.code==='REVISION_CONFLICT').length,1);
const submissions=await Promise.all([learn('submit',{attemptId:id}),learn('submit',{attemptId:id})]);assert.ok(submissions.every(r=>r.data.id===id&&r.data.status==='grading'));
const workers=await Promise.all([c.functions.invoke('mobile-grade',{body:{attemptId:id}}),c.functions.invoke('mobile-grade',{body:{attemptId:id}})]);
assert.ok(workers.every(r=>!r.error));assert.ok(workers.reduce((n,r)=>n+r.data.data.processed,0)<=1);
let result;
for(let i=0;i<12;i++){result=await learn('result',{attemptId:id});if(result.data)break;await new Promise(r=>setTimeout(r,500));}
assert.equal(result.data?.status,'completed');assert.equal((await learn('start')).data.id,id);
await c.auth.signOut({scope:'local'});
console.log('Hosted concurrency passed: one start, one revision winner, idempotent submissions, one grade commit, no retake.');
