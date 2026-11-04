import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=ts.transpileModule(await fs.readFile(new URL('../lib/model-settings.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {generationSettings,validateSettings}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const models=[{id:'gemini-2.5-flash',image:false,maxTemperature:2,temperatureSupported:true},{id:'gemini-2.5-flash-image',image:true,maxTemperature:1,temperatureSupported:true},{id:'gemini-4-flash',image:false,maxTemperature:1,temperatureSupported:false}];
const defaults={text:'gemini-2.5-flash',image:'gemini-2.5-flash-image'};
const step={id:'a',name:'A',kind:'text',prompt:'Hello'};
test('old chains keep workspace defaults and provider temperature',()=>{
 const value=generationSettings(step,defaults,models);
 assert.equal(value.model,defaults.text);
 assert.equal('temperature' in value.generationConfig,false);
});
test('each step uses its selected model and temperature including zero',()=>{
 const value=generationSettings({...step,model:defaults.text,temperature:0},defaults,models);
 assert.equal(value.generationConfig.temperature,0);
 assert.equal(value.model,defaults.text);
});
test('image steps preserve image output config',()=>{
 const value=generationSettings({...step,kind:'image',temperature:0.7},defaults,models);
 assert.equal(value.model,defaults.image);
 assert.deepEqual(value.generationConfig.responseModalities,['TEXT','IMAGE']);
 assert.equal(value.generationConfig.temperature,0.7);
});
test('rejects unavailable and incompatible models before running',()=>{
 for(const model of ['gemini-missing',defaults.image]) assert.throws(()=>generationSettings({...step,model},defaults,models),/unavailable|incompatible/);
});
test('rejects malformed IDs and invalid temperatures',()=>{
 for(const temperature of [-1,NaN,Infinity,2.1,'1']) assert.throws(()=>validateSettings({...step,temperature}),/Temperature/);
 assert.throws(()=>validateSettings({...step,model:'../invalid'}),/model/);
 assert.throws(()=>generationSettings({...step,kind:'image',temperature:2},defaults,models),/at most 1/);
});
test('fixed-sampling models omit custom temperature',()=>{
 const value=generationSettings({...step,model:'gemini-4-flash',temperature:0.3},defaults,models);
 assert.equal('temperature' in value.generationConfig,false);
});
