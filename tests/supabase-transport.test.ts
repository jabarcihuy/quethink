import test from 'node:test';
import assert from 'node:assert/strict';
import {withRequestTimeout} from '../src/lib/supabase/transport';
test('Supabase transport bounds stalled requests and respects caller cancellation',async()=>{
 const waiting:typeof fetch=async(_input,init)=>new Promise((_resolve,reject)=>{const fail=()=>reject(init?.signal?.reason??new Error('ABORTED'));if(init?.signal?.aborted)fail();else init?.signal?.addEventListener('abort',fail,{once:true});});
 await assert.rejects(withRequestTimeout(waiting,10)('https://example.invalid'),/REQUEST_TIMEOUT/);
 const parent=new AbortController();const request=withRequestTimeout(waiting,1000)('https://example.invalid',{signal:parent.signal});parent.abort(new Error('CALLER_CANCELLED'));await assert.rejects(request,/CALLER_CANCELLED/);
 const response=await withRequestTimeout(async()=>new Response('ok'),10)('https://example.invalid');assert.equal(await response.text(),'ok');
});
