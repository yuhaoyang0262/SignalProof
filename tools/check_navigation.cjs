// Optional browser regression: requires Playwright and a running preview server.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const output=process.env.UI_ARTIFACT_DIR||path.resolve(__dirname,'../build/navigation');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const base=process.env.SIGNALPROOF_URL||'http://127.0.0.1:8080/';
 await page.goto(base);await page.locator('.mac-dock').waitFor();
 await page.waitForTimeout(400);await page.screenshot({animations:'disabled',path:path.join(output,'signalproof-mac-home.png'),fullPage:true});
 assert.equal(await page.locator('canvas[data-flow]').count(),2);
 await page.locator('[data-menu="work"]').hover();await page.locator('#mac-mega').waitFor();
 assert.equal(await page.locator('.mac-mega-links a').count(),3);
 await page.locator('[data-menu="reference"]').hover();
 assert.equal(await page.locator('.mac-mega-links a').count(),2);
 assert.equal(await page.locator('#mac-mega').isVisible(),true);
 await page.screenshot({animations:'disabled',path:path.join(output,'signalproof-mac-mega.png'),fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#mac-mega').isVisible(),false);
 await page.goto(base+'lab.html?case=ft-shift#verify');
 await page.waitForFunction(()=>state.ready&&state.example&&!state.busy,null,{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('[data-indicator="tests"] .mac-number').textContent==='200');
 assert.equal(await page.locator('.mac-group-toggle[aria-expanded=true]').count(),1);
 await page.locator('[aria-controls="mac-group-reference"]').click();
 assert.equal(await page.locator('.mac-group-toggle[aria-expanded=true]').count(),1);
 await page.locator('#mac-group-work').waitFor({state:'hidden'});
 await page.locator('.mac-tree [data-route="rules"]').click();
 assert.equal(await page.locator('#rules-view').isVisible(),true);
 await page.waitForFunction(()=>document.querySelector('[data-indicator="rules"]').hidden);
 await page.locator('.mac-dock [data-route="verify"]').click();
 await page.locator('#verify-btn').click();await page.waitForFunction(()=>state.result&&!state.busy);
 assert.deepEqual(await page.evaluate(()=>[state.result.status,state.result.firstError]),['wrong',2]);
 await page.locator('#repair-btn').click();await page.waitForFunction(()=>state.result&&!state.busy);
 assert.equal(await page.evaluate(()=>state.result.firstError),3);
 await page.waitForFunction(()=>document.querySelectorAll('.editor-preview .katex').length===3);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>[...document.querySelectorAll('#mac-group-work .mac-side-link')].every(e=>getComputedStyle(e).opacity==='1'));await page.waitForTimeout(350);await page.screenshot({animations:'disabled',path:path.join(output,'signalproof-mac-lab.png'),fullPage:true});
 await page.locator('.mac-search-trigger').click();
 await page.locator('#mac-command-input').fill('变换');
 assert(await page.locator('#mac-command-results mark').count()>0);
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowUp');
 await page.keyboard.press('Enter');assert.equal(await page.locator('.mac-command').isVisible(),false);
 await page.keyboard.press('Control+k');await page.locator('#mac-command-input').fill('题库');
 await page.screenshot({animations:'disabled',path:path.join(output,'signalproof-mac-command.png')});
 await page.keyboard.press('Enter');assert.equal(await page.locator('#tests-view').isVisible(),true);
 await page.waitForFunction(()=>document.querySelector('[data-indicator="tests"]').hidden);
 assert.equal(await page.locator('.mac-dock [aria-current=page]').getAttribute('data-route'),'tests');
 await page.keyboard.press('Control+k');await page.locator('#mac-command-input').fill('<invalid>');
 assert.equal(await page.locator('.mac-command-empty').isVisible(),true);await page.keyboard.press('Enter');assert.equal(await page.locator('.mac-command').isVisible(),true);
 await page.keyboard.press('Escape');
 await page.locator('.mac-dock [data-route="tests"]').hover();
 assert(parseFloat(await page.locator('.mac-dock [data-route="tests"]').evaluate(e=>e.style.getPropertyValue('--zoom')))>1.3);
 assert(parseFloat(await page.locator('.mac-dock [data-route="cases"]').evaluate(e=>e.style.getPropertyValue('--zoom')))>1);
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:900});
  for(const id of ['tests','transforms','verify']){
   await page.locator(`.mac-dock [data-route="${id}"]`).click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width} ${id}`);
  }
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(350);await page.screenshot({animations:'disabled',path:path.join(output,`signalproof-mac-lab-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({animations:'disabled',path:path.join(output,'signalproof-mac-home-mobile.png'),fullPage:true});
 await page.locator('[data-menu="work"]').click();assert(await page.locator('#mac-mega').isVisible());
 await page.locator('.mac-mega-links [data-route="tests"]').click();await page.locator('#tests-view.active').waitFor();
 await page.keyboard.press('Control+k');await page.keyboard.press('Tab');
 assert(await page.evaluate(()=>document.querySelector('.mac-command').contains(document.activeElement)));
 await page.keyboard.press('Escape');
 const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(base);await reduced.locator('.mac-dock').waitFor();
 assert.equal(await reduced.locator('.mac-dock-icon').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await mobile.goto(base);await mobile.locator('[data-menu="work"]').tap();assert(await mobile.locator('#mac-mega').isVisible());await mobile.locator('[data-menu="work"]').tap();assert.equal(await mobile.locator('#mac-mega').isVisible(),false);await mobile.locator('[data-menu="reference"]').tap();await mobile.locator('.mac-mega-links [data-route="rules"]').tap();await mobile.locator('#rules-view.active').waitFor();
 await page.goto(base+'lab.html#tests');await page.waitForFunction(()=>document.querySelector('[data-indicator="tests"] .mac-number').textContent==='200');assert.equal(await page.locator('[data-indicator="tests"]').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({navigation:'six interactions passed',worker:'ready, first error 2, repair advances to 3',formulas:'3 editor formulas rendered',responsive:[390,768,1024,1440],command:'filter, match highlight, arrows, Enter, Escape, focus trap, empty state',reducedMotion:'passed',pageErrors:errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
