// Encode supplied banners as WebP without changing their composition or dimensions.
const fs=require('node:fs/promises');
const path=require('node:path');
const sharp=require('sharp');
(async()=>{
 let original=0,optimized=0;
 for(const name of ['hero-01','hero-02','hero-03']){
  const source=path.join(__dirname,'../public/images/hero',name+'.png');
  const destination=source.replace(/\.png$/,'.webp');
  const result=await sharp(source).webp({quality:82}).toFile(destination);
  original+=(await fs.stat(source)).size;optimized+=result.size;
 }
 console.log(`Hero banners: ${original} bytes PNG -> ${optimized} bytes WebP.`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
