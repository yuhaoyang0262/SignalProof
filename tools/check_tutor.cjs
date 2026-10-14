/* Explicitly mocked UI checks by default; TUTOR_LIVE=1 performs one real model call. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.TUTOR_URL||'http://localhost:5080';
  fs.mkdirSync('build/tutor',{recursive:true});
  await page.goto(base); await page.waitForSelector('.step');
  assert.equal(await page.locator('.question').count(),200);
  assert.equal(await page.locator('.step .katex-error').count(),0);
  assert.equal(await page.locator('.step .katex').count(),2);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    await page.screenshot({path:`build/tutor/layout-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#search').fill('no-such-question'); assert.equal(await page.locator('.question').count(),0);
  await page.locator('#search').fill('101'); await page.locator('[data-id="Q101"]').click();
  await page.locator('[data-source="reference"]').click(); assert.equal(await page.locator('[data-source="reference"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-source="attempt"]').click(); await page.locator('[data-step="2"]').click();
  const status=await (await page.request.get(base+'/api/status')).json();
  assert.equal(status.model,'gpt-6-astra');assert.equal(status.reasoningEffort,'high');assert.equal(status.store,false);
  for(const path of ['/.env','/Program.cs','/Content/question-bank.json']) assert.equal((await page.request.get(base+path)).status(),404,path);
  assert.equal((await page.request.post(base+'/api/tutor',{data:{}})).status(),403);
  assert.equal((await page.request.post(base+'/api/tutor',{headers:{'X-SignalProof-Request':'1','Origin':'https://example.invalid'},data:{}})).status(),403);
  assert.equal((await page.request.post(base+'/api/tutor',{headers:{'X-SignalProof-Request':'1'},data:{questionId:'Q101',step:999,mode:'explain',source:'attempt'}})).status(),status.configured?400:503);
  if(status.configured){
    let captured;
    await page.route('**/api/tutor',async route=>{captured=route.request().postDataJSON();await route.fulfill({json:{answer:'测试响应：\\(x(t)\\)\n<img src=x onerror=alert(1)>',model:'mock-only',reasoningEffort:'high',elapsedMs:12}});});
    await page.locator('#explain').click();await page.waitForSelector('#answer-meta:not([hidden])');
    assert.deepEqual(captured,{questionId:'Q101',step:2,mode:'explain',source:'attempt'});
    assert.equal(await page.locator('#answer .katex').count(),1); assert.equal(await page.locator('#answer img').count(),0);
    assert((await page.locator('#answer').textContent()).includes('<img'));
    await page.locator('#hint').click(); await page.waitForFunction(()=>document.querySelector('#answer-meta').hidden===false);
    assert.equal(captured.mode,'hint');
    await page.unroute('**/api/tutor');
    await page.route('**/api/tutor',route=>route.fulfill({status:429,json:{error:'测试限流，请稍后重试。'}}));
    await page.locator('#explain').click();await page.waitForSelector('#answer-error:not([hidden])');
    assert((await page.locator('#answer-error').textContent()).includes('测试限流'));assert(await page.locator('#explain').isEnabled());
    await page.unroute('**/api/tutor');
    let finish;
    await page.route('**/api/tutor',async route=>{await new Promise(r=>finish=r);await route.fulfill({json:{answer:'过期响应',model:'mock-only',reasoningEffort:'high',elapsedMs:10}}).catch(()=>{});});
    await page.locator('#explain').click();await page.waitForSelector('#cancel:not([hidden])');
    await page.locator('#cancel').click();await page.waitForSelector('#cancel[hidden]',{state:'attached'});finish();
    assert((await page.locator('#answer').textContent()).includes('已停止'));await page.unroute('**/api/tutor');
    await page.route('**/api/tutor',async route=>{await new Promise(r=>finish=r);await route.fulfill({json:{answer:'过期响应',model:'mock-only',reasoningEffort:'high',elapsedMs:10}}).catch(()=>{});});
    await page.locator('#explain').click();await page.waitForSelector('#cancel:not([hidden])');
    await page.locator('[data-source="reference"]').click();finish();
    assert(!(await page.locator('#answer').textContent()).includes('过期响应'));await page.unroute('**/api/tutor');
    if(process.env.TUTOR_LIVE==='1'){
      await page.locator('[data-source="attempt"]').click();await page.locator('[data-step="2"]').click();
      await page.locator('#explain').click(); await page.waitForSelector('#answer-meta:not([hidden]),#answer-error:not([hidden])',{timeout:240000});
      assert(await page.locator('#answer-error').isHidden(),await page.locator('#answer-error').textContent());
      assert((await page.locator('#answer-meta').textContent()).includes('gpt-6-astra'));
      assert.equal(await page.locator('#answer .katex-error').count(),0);
      await page.screenshot({path:'build/tutor/live-answer.png',fullPage:true});
      console.log('Live Astra high explanation received through browser → C# → provider.');
    }
  }
  assert.deepEqual(errors,[]);await browser.close();
  console.log('PASS: tutor questions, formulas, responsive layouts, API isolation, request selection, safe output, errors and cancellation.');
})().catch(error=>{console.error(error);process.exit(1);});
