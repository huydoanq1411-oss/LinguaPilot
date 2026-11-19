async page => {
  await page.route('**/app-config.json', route => route.fulfill({json:{apiUrl:'http://127.0.0.1:3099/api'}}));
  const tokens=await page.evaluate(async()=>{
    const a=await (await fetch('http://127.0.0.1:3099/fixture/token/1')).json();
    const b=await (await fetch('http://127.0.0.1:3099/fixture/token/2')).json();
    localStorage.clear();
    localStorage.setItem('linguapilot_token',a.token);
    localStorage.setItem('done_bai2','1');
    return {a:a.token,b:b.token};
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:5173/jp/phan01.html');
  await page.locator('.lesson-done-toggle').first().click();
  const lessonA=await page.evaluate(()=>({done:window.LinguaPilotProgress.getItem('done_bai1'),count:window.LinguaPilotProgress.completedCount()}));
  await page.goto('http://127.0.0.1:5173/jp/index.html');
  await page.locator('.lp-legacy-progress button').waitFor();
  const beforeImport=await page.locator('#myProgressBar').innerText();
  await page.screenshot({path:'.playwright-cli/progress-import.png'});
  await Promise.all([page.waitForEvent('load'), page.locator('.lp-legacy-progress button').click()]);
  await page.waitForFunction(()=>window.LinguaPilotProgress?.completedCount()===2);
  await page.waitForFunction(()=>document.getElementById('myProgressBar')?.textContent.includes('2/382')); await page.locator('.idx-check').first().click();
  const imported=await page.evaluate(()=>({count:window.LinguaPilotProgress.completedCount(),chapter:window.LinguaPilotProgress.getItem('ch_done_0'),legacy:localStorage.getItem('done_bai2')}));
  await page.evaluate(token=>localStorage.setItem('linguapilot_token',token),tokens.b);
  await page.goto('http://127.0.0.1:5173/jp/index.html');
  await page.waitForFunction(()=>!!window.LinguaPilotProgress);
  const accountB=await page.evaluate(()=>({count:window.LinguaPilotProgress.completedCount(),chapter:window.LinguaPilotProgress.getItem('ch_done_0')}));
  await page.evaluate(token=>localStorage.setItem('linguapilot_token',token),tokens.a);
  await page.goto('http://127.0.0.1:5173/jp/index.html');
  await page.waitForFunction(()=>!!window.LinguaPilotProgress);
  const returnedA=await page.evaluate(()=>({count:window.LinguaPilotProgress.completedCount(),chapter:window.LinguaPilotProgress.getItem('ch_done_0')}));
  if(lessonA.done!=='1'||lessonA.count!==1||imported.count!==2||imported.chapter!=='1'||imported.legacy!=='1'||accountB.count!==0||accountB.chapter!==null||returnedA.count!==2||returnedA.chapter!=='1')throw Error(JSON.stringify({lessonA,imported,accountB,returnedA}));
  await page.evaluate(()=>localStorage.clear());
  await page.unroute('**/app-config.json');
  await page.goto('http://127.0.0.1:5173/');
  return {lessonA,beforeImport,imported,accountB,returnedA,fixture:'real lesson API and browser; mocked users, no database'};
}
