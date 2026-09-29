import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome=[process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .find(path=>path&&existsSync(path));
if(!chrome)throw new Error('Chrome not found; set CHROME_PATH to the browser executable');
const gpu=process.platform==='darwin'?'metal':process.platform==='win32'?'d3d11':'gl';
const browser=await puppeteer.launch({executablePath:chrome,headless:true,protocolTimeout:0,
  args:['--allow-file-access-from-files',`--use-angle=${gpu}`,'--ignore-gpu-blocklist',
    ...(process.platform==='linux'?['--no-sandbox']:[])]});
try{
  const page=await browser.newPage();
  page.on('pageerror',e=>console.error(e.message));
  await page.goto(pathToFileURL(resolve('studio.html')).href+'?render&bake',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready===true');
  const names=await page.evaluate(()=>Object.keys(QINGTIAN_SETS));
  mkdirSync('assets/rich',{recursive:true});
  for(const name of names){
    const data=await page.evaluate(async key=>{
      window.LOOP=QINGTIAN_SETS[key];await window.renderAt(0);
      // Capture the painting before the paper compositor and captions; grain is applied once in the film.
      return drawingContext.canvas.toDataURL('image/png');
    },name);
    writeFileSync(`assets/rich/${name}.png`,Buffer.from(data.split(',')[1],'base64'));
    console.log(`painted ${name}`);
  }
}finally{await browser.close();}
