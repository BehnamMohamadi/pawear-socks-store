// Optimize user-supplied brand exports without cropping or recoloring originals.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const source=process.argv[2];
if(!source)throw new Error('Pass the path to PAWEAR_PW_final_pack.');
const target=path.resolve(__dirname,'../public/images/pawear-brand');
const names=['01_logo_dark','02_logo_light','05_PW_dark','06_PW_light','07_PW_green','08_lifestyle_sock','09_woven_label','10_packaging','11_sock_bundle','12_hang_tag','13_PW_on_sock'];
(async()=>{
 fs.mkdirSync(target,{recursive:true});
 const manifest=[];
 for(const name of names){
  const input=path.join(source,name+'.png');
  const meta=await sharp(input).metadata();
  const output=path.join(target,name+'.webp');
  await sharp(input).webp({quality:92,effort:6}).toFile(output);
  manifest.push({source:name+'.png',asset:'/images/pawear-brand/'+name+'.webp',width:meta.width,height:meta.height,bytes:fs.statSync(output).size});
 }
 fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(manifest.length+' supplied brand assets optimized; originals unchanged.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
