// shared driver: plays the full set with state-based waits
module.exports = async function drive(p, shot){
  const W = ms => p.waitForTimeout(ms);
  const until = async (fn, ms=60000) => { const t=Date.now(); while(Date.now()-t<ms){ if (await p.evaluate(fn)) return true; await W(150);} throw new Error('timeout '+fn); };
  const step = s => until(new Function('return app.state.step==='+JSON.stringify(s)+' && !app.state.frozen'));
  await W(2500); await shot('lobby');
  await p.click('#enterBtn'); await W(1500);
  await p.evaluate(()=>app.walkLocal(-1.5,-1.2)); await W(2200); await p.evaluate(()=>app.turn(-0.5)); await W(1200);
  await shot('calm');
  await p.evaluate(()=>app.startAlarm()); await W(2800); await shot('alarm');
  await p.keyboard.press('1'); await W(1500); await shot('bag');
  await p.evaluate(()=>app.walkHS('door')); await step('hall'); await W(1500); await shot('hall');
  await p.evaluate(()=>app.walkHS('elevator')); await until(()=>!document.getElementById('cardWrap').classList.contains('hidden')); await W(2500); await shot('elevator');
  await p.evaluate(()=>app.clickCard()); await step('shelter'); await W(1800); await shot('shelter');
  await p.evaluate(()=>app.walkHS('mat')); await step('listen'); await W(1800); await shot('listen');
  await p.keyboard.press('b'); await until(()=>!document.getElementById('cardWrap').classList.contains('hidden')); await W(2800); await shot('chem');
  await p.evaluate(()=>app.clickCard()); await W(1500);
  await p.keyboard.press('2'); await W(2000); await shot('mask');
  await p.evaluate(()=>app.walkHS('stairsUp')); await step('seal'); await W(1800); await shot('seal');
  for (const h of ['window','sealDoor','vent']) { await p.evaluate(h=>app.walkHS(h), h); await until(new Function('return !!app.state.sealed['+JSON.stringify(h==='sealDoor'?'door':h)+']')); await W(1300); }
  await shot('sealed');
  await step('clearWait'); await W(1500); await shot('clear');
  await p.keyboard.press('b'); await W(2500); await shot('clearcard');
  await p.evaluate(()=>app.clickCard()); await W(3500); await shot('final');
};
