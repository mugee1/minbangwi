const { chromium } = require('playwright'); const drive = require('./drive');
(async () => {
  const vp = process.argv[2]==='m' ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: vp, hasTouch: process.argv[2]==='m', isMobile: process.argv[2]==='m' });
  const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await p.goto(''+require('path').resolve(__dirname,'..','index.html').replace(/^/,'file://')+''+(process.argv[3]||''));
  let n=0; const pre = process.argv[2]||'d';
  await drive(p, async name => { await p.screenshot({ path: __dirname+`/shots/${pre}_${String(n++).padStart(2,'0')}_${name}.png` }); }).catch(e=>errs.push('DRIVE '+e.message));
  console.log('errs', errs.slice(0,10));
  await b.close();
})();
