const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
const source=process.argv[2];
const files={
 'campaign-socks':'exec-63bf28ba-7371-4aaf-9b9b-821af398f2df.png',
 'campaign-box':'exec-653bf03e-9aea-4a89-9982-70d5b1e0b854.png',
 'sock-ivory':'exec-2727c00c-3c72-481f-9c53-6dcd68443d5e.png',
 'sock-espresso':'exec-85744a2c-457a-45a2-be1f-cae7e4968e1d.png',
 'sock-charcoal':'exec-b095339d-883c-4d62-8faf-0eeac8f5eddf.png',
 'collection-editorial':'exec-c6935aa9-cc79-4c9e-8d07-c06adb51d690.png'
};
(async()=>{
 if(!source)throw new Error('Pass the generated asset directory.');
 const destination=path.join(__dirname,'../public/images/pawear-editorial');await fs.mkdir(destination,{recursive:true});
 for(const [name,file] of Object.entries(files)){
  await fs.copyFile(path.join(source,file),path.join(destination,name+'.png'));
  await sharp(path.join(source,file)).webp({quality:84}).toFile(path.join(destination,name+'.webp'));
 }
 console.log('Six generated originals and six optimized WebP assets saved.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
