import {admin,db} from '@/lib/server';
import { listModels } from '@/lib/gemini-models';
import { generationSettings, validateSettings } from '@/lib/model-settings';
import type {Step} from '@/lib/types';
export const maxDuration=300;
const fail=(e:unknown,status=400)=>Response.json({error:e instanceof Error?e.message:'Request failed.'},{status});
export async function GET(){try{const {client}=await admin();const [chains,runs]=await Promise.all([client.from('studio_chains').select('*').order('updated_at',{ascending:false}),client.from('studio_runs').select('*').order('created_at',{ascending:false}).limit(50)]);if(chains.error||runs.error)throw new Error('Workspace tables are unavailable. Apply supabase/schema.sql.');let models:Awaited<ReturnType<typeof listModels>>=[];let modelError='';try{models=await listModels()}catch(e){modelError=e instanceof Error?e.message:'Could not load models.'}return Response.json({chains:chains.data,runs:runs.data,models,modelError,defaults:{text:process.env.GEMINI_MODEL||'',image:process.env.GEMINI_IMAGE_MODEL||''}})}catch(e){return fail(e,403)}}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return fail(new Error('Invalid origin.'),403);
 try{if(Number(request.headers.get('content-length'))>4500000)throw new Error('Request too large.');const body=await request.json();
 if(body.action==='login'){const client=await db();const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('/auth/callback',request.url).href}});if(error)throw error;return Response.json({url:data.url})}
 const {client,user}=await admin();
 if(body.action==='logout'){await client.auth.signOut();return Response.json({ok:true})}
 if(body.action==='save'){
 const c=body.chain;if(typeof c.name!=='string'||!c.name.trim()||c.name.length>100||typeof c.description!=='string'||c.description.length>1000||!Array.isArray(c.steps)||c.steps.length>12)throw new Error('Use a name under 100 characters and at most 12 steps.');
 const ids=new Set();for(const s of c.steps){if(typeof s.id!=='string'||ids.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>100||!['text','vision','image'].includes(s.kind)||typeof s.prompt!=='string'||!s.prompt.trim()||s.prompt.length>12000)throw new Error('Each step needs a unique ID, name, and prompt (up to 12,000 characters).');validateSettings(s);ids.add(s.id)}
 const {error}=await client.from('studio_chains').upsert({id:c.id,name:c.name.trim(),description:c.description,steps:c.steps,updated_at:new Date().toISOString()});if(error)throw new Error('Could not save the chain.');return Response.json({ok:true})}
 if(body.action==='delete'){const {error}=await client.from('studio_chains').delete().eq('id',body.id);if(error)throw new Error('Could not delete the chain.');return Response.json({ok:true})}
 if(body.action!=='run')throw new Error('Unknown action.');
 const {data:chain,error}=await client.from('studio_chains').select('*').eq('id',body.id).single();if(error||!chain?.steps.length)throw new Error('Save a chain with at least one step first.');
 if(typeof body.input!=='string'||body.input.length>12000)throw new Error('Input must be under 12,000 characters.');
 if(body.image&&(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image)||body.image.length>4000000))throw new Error('Choose a PNG, JPG, or WebP image under 3 MB.');
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('Configure GEMINI_API_KEY to generate media.');
 const models=await listModels();
 const resolved=(chain.steps as Step[]).map(step=>({...step,...generationSettings(step,{text:process.env.GEMINI_MODEL,image:process.env.GEMINI_IMAGE_MODEL},models)}));
 const {data:run,error:runError}=await client.from('studio_runs').insert({chain_id:chain.id,chain_name:chain.name,user_id:user.id,snapshot:resolved,input_image:body.image||null,status:'running'}).select('id').single();if(runError)throw new Error('Could not start run.');
 const outputs:{name:string;text:string;image?:string}[]=[];let previous=body.input;
 try{for(const step of resolved){const prompt=step.prompt.replace(/\{\{(input|previous|step\d+)\}\}/g,(_,k)=>k==='input'?body.input:k==='previous'?previous:outputs[Number(k.slice(4))-1]?.text||'');const image=step.kind==='vision'?body.image:undefined;
 const model=step.model;
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt},...(image?[{inlineData:{mimeType:image.split(';')[0].slice(5),data:image.split(',')[1]}}]:[])]}],generationConfig:step.generationConfig}),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error(`Generation failed at “${step.name}” (${response.status}).`);const data=await response.json();const parts=data.candidates?.[0]?.content?.parts||[];const text=parts.filter((p:{text?:string})=>p.text).map((p:{text:string})=>p.text).join('\n');const binary=parts.find((p:{inlineData?:unknown})=>p.inlineData)?.inlineData;if(step.kind==='image'&&!binary)throw new Error(`No image returned from “${step.name}”.`);if(!text&&!binary)throw new Error(`No output from “${step.name}”.`);if(binary&&!['image/png','image/jpeg','image/webp'].includes(binary.mimeType))throw new Error('Unsupported generated image type.');outputs.push({name:step.name,text,...(binary?{image:`data:${binary.mimeType};base64,${binary.data}`}:{})});previous=text;
 }
 const {error:saveError}=await client.from('studio_runs').update({status:'completed',outputs}).eq('id',run.id);if(saveError)throw new Error('Could not save generated output.');return Response.json({ok:true});
 }catch(e){await client.from('studio_runs').update({status:'failed',outputs,error:e instanceof Error?e.message:'Generation failed.'}).eq('id',run.id);throw e}
 }catch(e){return fail(e)}}
