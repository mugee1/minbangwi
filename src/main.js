// 장면 구성, 조작(클릭·WASD·오른쪽 버튼 회전·터치), HUD, 대피 1세트 흐름
// 표지판 글자를 Pretendard로 그리려고 글꼴을 먼저 불러온 뒤 시작(최대 2초 대기)
// 안내 문구·단계는 content.json에 있어요. 웹 서버로 열면 그 파일을 바로 읽고,
// 더블클릭(file://)으로 열었거나 읽기에 실패하면 src/content.js(같은 내용)를 써요.
(function () {
  const go = () => { if (!window.app) startApp(); };
  const wait = [new Promise(r => setTimeout(r, 2000))];
  const font = document.fonts && document.fonts.load ? document.fonts.load('700 40px "Pretendard Variable"').catch(() => {}) : Promise.resolve();
  const content = /^https?:$/.test(location.protocol)
    ? fetch('content.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j && !window.app) MB.content = j; }).catch(() => {})
    : Promise.resolve();
  Promise.race([Promise.all([font, content])].concat(wait)).then(go, go);
})();
function startApp() {
  'use strict';
  const C = MB.content, F = C.flow, UI = C.ui, AL = C.alerts, A = MB.audio, CH = MB.characters;
  const $ = id => document.getElementById(id);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => k in o ? o[k] : m); // "{n}초" 같은 자리를 채워요
  document.querySelectorAll('.svc').forEach(e => e.textContent = C.service.name);
  document.title = fmt(C.service.docTitle, { name: C.service.name });

  /* ---------- 렌더러 · 장면 ---------- */
  const canvas = $('c');
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const lite = /[?&]lite/.test(location.search); // 저사양 모드: 그림자 끔
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = MB.scene = new THREE.Scene();
  scene.background = new THREE.Color(0xDDEBF6);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2); scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffffff, .4); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = true;
  sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun); scene.add(sun.target);
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 760 ? 62 : 50; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const W = MB.world.build();
  const spaces = W;
  const pickables = Object.values(spaces).map(s => s.floor);

  /* ---------- 캐릭터 ---------- */
  let me = CH.create({ hat: 'helmet', hatColor: 'white', animal: 'tiger', crossBag: true }); scene.add(me); // 사용자: 노란 호랑이(외형 고정)
  const guide = CH.create({ shirt: 0x34548A, bottom: 0x2A3F66, hat: 'cap', guide: true, trim: 0xF2994A }); scene.add(guide);

  /* ---------- 월드 라벨 ---------- */
  const labelsEl = $('labels');
  const labels = [];
  function addLabel(html, cls, getPos, space, id) { const el = document.createElement('div'); el.className = 'tag ' + (cls || ''); el.innerHTML = html; labelsEl.appendChild(el); const L = { el, getPos, space, id, show: true }; labels.push(L); return L; }
  const meTag = addLabel('<i>' + UI.me + '</i><span id="meName"></span>', 'me', () => V3(me.position.x, 1.95 + (me.userData.body.position.y), me.position.z));
  const guideTag = addLabel(UI.guide, 'npc small', () => V3(guide.position.x, 2.0, guide.position.z));
  Object.values(spaces).forEach(sp => sp.labels.forEach(l => { const L = addLabel(l.text, l.cls, () => V3(sp.ox + l.pos.x, l.pos.y, l.pos.z), sp.key, l.id); if (l.id === 'upGoal' || l.id === 'downGoal') L.show = false; }));
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.hidden = true; labelsEl.appendChild(bubble);
  const labelById = id => labels.find(l => l.id === id);

  /* ---------- 목표 지점(빛나는 원) ---------- */
  const ringGeo = new THREE.RingGeometry(.5, .72, 48);
  const glowTex = MB.tex.radial('rgba(47,128,237,.45)', 'rgba(47,128,237,0)');
  const HS = {};
  function hotspot(name, sp, p, r, onEnter, silent) {
    const grp = new THREE.Group(); grp.position.set(sp.ox + p.x, .03, p.z); scene.add(grp); grp.visible = false;
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x2F80ED, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; grp.add(ring);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -.01; grp.add(glow);
    HS[name] = { name, sp, pos: V3(sp.ox + p.x, 0, p.z), r: r || 1, onEnter, active: false, grp, silent };
  }
  hotspot('door', W.home, W.home.door, 1.0, () => goDoor());
  hotspot('elevator', W.hall, W.hall.elevator, 1.2, () => elevatorFeedback());
  hotspot('stairsDown', W.hall, W.hall.stairs, 1.0, () => goDown());
  hotspot('mat', W.shelter, W.shelter.mat, .8, () => sitDown());
  hotspot('radio', W.shelter, W.shelter.radioPos, .01, () => {}); // 표시용 링: 라디오는 클릭이나 B로 켜요
  hotspot('stairsUp', W.shelter, W.shelter.stairs, 1.0, () => goUp());
  hotspot('window', W.high, W.high.window, 1.0, () => seal('window'));
  hotspot('sealDoor', W.high, W.high.sealDoor, 1.0, () => seal('door'));
  hotspot('vent', W.high, W.high.vent, 1.0, () => seal('vent'));
  function setTarget(h) { pathTarget = h ? h.pos : null; Object.values(HS).forEach(x => { x.active = false; x.grp.visible = false; }); if (h) { h.active = true; h.grp.visible = !h.silent; } }
  function activate(list) { list.forEach(h => { h.active = true; h.grp.visible = !h.silent; }); }

  // 길 안내 점
  const dots = []; const dotMat = new THREE.MeshBasicMaterial({ color: 0x5AA6F5, transparent: true, opacity: .95, depthWrite: false });
  for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(.08, 14), dotMat); d.rotation.x = -Math.PI / 2; d.visible = false; scene.add(d); dots.push(d); }
  let pathTarget = null;
  const clickMark = new THREE.Mesh(new THREE.RingGeometry(.22, .3, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  clickMark.rotation.x = -Math.PI / 2; scene.add(clickMark);

  /* ---------- 상태 ---------- */
  const S = { started: false, space: 'home', step: 'calm', moved: 0, alarmT: 0, t0: 0, yaw: .25, pitch: .5, dist: 9, target: null, keys: {}, sitting: false, crouch: false, bag: false, mask: false, sealed: {}, helps: 0, frozen: false, gasOn: false, closeWin: false, fanOn: true, stepIdx: 0 };

  /* ---------- HUD ---------- */
  const chipsEl = $('chips');
  const chipSteps = C.steps.slice(1);
  function renderChips() {
    chipsEl.innerHTML = chipSteps.map((s, i) => { const idx = i + 1; const cls = idx < S.stepIdx ? 'c done' : idx === S.stepIdx ? 'c on' : 'c'; return (i ? '<em>›</em>' : '') + '<span class="' + cls + '">' + s.chip + '</span>'; }).join('') + '<b>' + fmt(UI.sets, { n: S.step === 'done' ? 1 : 0 }) + '</b>';
    $('barFill').style.width = Math.round((Math.max(0, S.stepIdx - 1) / (C.steps.length - 1)) * 100) + '%';
  }
  function setStep(i) { S.stepIdx = i; renderChips(); }
  function updatePlace() {
    const sp = spaces[S.space], P = C.places[S.space];
    $('placeName').textContent = sp.name; $('placeSub').textContent = sp.sub; $('pplLine').textContent = P.people;
    const f = P.floor; $('bigVal').innerHTML = f[0] + (f[1] ? '<small>' + f[1] + '</small>' : '');
    const y = { home: 41, hall: 41, shelter: 182, high: 27 }[S.space];
    $('mmMe').setAttribute('cy', y); $('mmMeLbl').textContent = UI.me + ' · ' + P.map;
  }
  const WAVE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/></svg>';
  const EAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></svg>';
  function setAlert(kind, title, sub) {
    const a = $('alert');
    if (!kind) { a.hidden = true; $('metaAlert').textContent = UI.noAlert; return; }
    a.hidden = false; a.className = kind; $('alertTitle').textContent = title; $('alertSub').textContent = sub || ''; $('alertIcon').innerHTML = kind === 'alarm' ? WAVE : EAR;
    $('metaAlert').textContent = title;
  }
  // 방송을 기다리는 동안 경보 표시에 '다음 방송까지 N초'와 줄어드는 바를 보여요
  let waitEnd = 0, waitMs = 1;
  function waitFor(ms) { waitEnd = ms ? performance.now() + ms : 0; waitMs = ms || 1; $('alertWait').hidden = !ms; }
  let toastT = null;
  function toast(t, ms) { const el = $('toast'); el.innerHTML = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, ms || 3400); }
  let bubbleText = '';
  function say(t) { bubbleText = t; if (!t) bubble.hidden = true; else bubble.innerHTML = '<b class="who">' + UI.guide + '</b>' + t; }
  function need(k) { ['act1', 'act2', 'act3', 'listen'].forEach(id => $(id).classList.remove('need')); const m = { 1: 'act1', 2: 'act2', B: 'listen' }[k]; if (m) $(m).classList.add('need'); }
  function showCard(o) {
    $('cardWho').textContent = o.who || UI.guide; $('cardTitle').textContent = o.title; $('cardBody').innerHTML = o.body; $('cardSrc').textContent = o.src || '';
    $('cardBtn').textContent = o.btn || UI.cardOk; $('cardWrap').hidden = false; S.frozen = true; S.target = null; S.keys = {};
    $('cardBtn').onclick = () => { $('cardWrap').hidden = true; S.frozen = false; A.click(); o.onClose && o.onClose(); };
    setTimeout(() => $('cardBtn').focus(), 60);
  }
  function big(h, p, ms) { $('bigH').textContent = h; $('bigP').textContent = p || ''; $('big').hidden = false; if (ms) setTimeout(() => $('big').hidden = true, ms); }
  const src = p => UI.sourcePrefix + C.service.source + ' ' + p;
  // content.json의 카드 정의({title, body, src: "20쪽", ...})를 showCard 인자로 바꿔요
  const card = (def, more) => Object.assign({}, def, def.src ? { src: src(def.src) } : {}, more);

  // 우상단 카드 접기(모바일)
  const statCard = $('statCard');
  if (innerWidth < 760) statCard.classList.add('collapsed');
  // 좌측 장소 카드(모바일): 평소엔 장소 이름만, 펼치면 인원·안내 문구
  { const pc = $('placeCard'), pb = $('placeMore');
    const sync = () => { const c = pc.classList.contains('collapsed'); pb.textContent = c ? UI.expand : UI.collapse; pb.setAttribute('aria-expanded', String(!c)); };
    if (innerWidth < 760) pc.classList.add('collapsed');
    pb.onclick = () => { pc.classList.toggle('collapsed'); sync(); }; sync(); }
  $('collapse').onclick = () => { const c = statCard.classList.toggle('collapsed'); $('collapse').textContent = c ? UI.expand : UI.collapse; $('collapse').setAttribute('aria-expanded', String(!c)); };
  $('collapse').textContent = statCard.classList.contains('collapsed') ? UI.expand : UI.collapse;
  const toggleSound = () => { A.setMuted(!A.muted); ['soundBtn', 'soundBtn2'].forEach(id => $(id).textContent = A.muted ? UI.soundOn : UI.soundOff); };
  $('soundBtn').onclick = toggleSound; $('soundBtn2').onclick = toggleSound;
  $('moreBtn').onclick = () => { if (!S.started) return; $('moreWrap').hidden = false; S.frozen = true; $('moreClose').focus(); };
  $('moreClose').onclick = () => { $('moreWrap').hidden = true; S.frozen = false; };
  $('whyBtn').onclick = () => showCard({ who: UI.whyCard.who, title: UI.whyCard.title, body: '<ul>' + C.why.map(w => '<li><b>' + w.t + '</b> — ' + w.d + ' <span style="color:var(--faint);font-size:12px">(' + w.p + ')</span></li>').join('') + '</ul>', src: UI.sourcePrefix + C.service.source, btn: UI.whyCard.btn });
  $('whyGrid').innerHTML = C.why.map(w => '<div><b>' + w.t + '</b><span>' + w.d + '</span><small>' + w.p + '</small></div>').join('');

  // 접속할 때마다 이름을 자동으로 붙여요(형용사 + 자연)
  const pick = a => a[Math.floor(Math.random() * a.length)];
  $('meName').textContent = pick(C.nicknames.a) + ' ' + pick(C.nicknames.b);

  /* ---------- 공간 이동 ---------- */
  function placeIn(key) {
    const sp = spaces[key]; S.space = key;
    me.position.set(sp.ox + sp.spawn.x, 0, sp.spawn.z); S.yaw = sp.spawnYaw; S.target = null;
    guide.position.set(sp.ox + sp.guide.x, 0, sp.guide.z);
    const L = sp.light; hemi.color.setHex(L.sky); hemi.groundColor.setHex(L.ground); sun.color.setHex(L.sun); sun.intensity = L.sunI; amb.intensity = L.amb;
    updatePlace(); snapCamera();
  }
  function transition(label, floors, cb) {
    const tr = $('trans'); $('transLbl').textContent = label; $('transFloor').textContent = floors[0]; tr.classList.add('show'); S.frozen = true;
    let i = 0; const iv = setInterval(() => { i++; if (i < floors.length) { $('transFloor').textContent = floors[i]; A.click(); } else { clearInterval(iv); cb(); setTimeout(() => { tr.classList.remove('show'); S.frozen = false; }, 250); } }, 220);
  }

  /* ---------- 대피 1세트 흐름 ---------- */
  function enter() {
    $('lobby').hidden = true; $('hud').hidden = false;
    A.init();
    S.started = true; S.t0 = performance.now(); document.body.classList.add('intro');
    placeIn('home'); setStep(0); setAlert(null);
    say(isTouch ? F.intro.sayTouch : F.intro.sayMouse);
    canvas.focus();
    setTimeout(() => { if (S.step === 'calm') startAlarm(); }, 15000); // 훈련 시작 버튼 뒤 15초(20초 이내) — 그동안 걸으며 조작을 익혀요
  }
  function startAlarm() {
    if (S.step !== 'calm') return;
    S.step = 'alarm'; S.alarmT = performance.now(); S.airCleared = false; setStep(1); document.body.classList.remove('intro');
    setAlert('alarm', AL.alarm, F.alarm.alertSub);
    A.sirenStart(); A.speak(F.alarm.speak);
    big(F.alarm.big[0], F.alarm.big[1], 2600);
    say(F.alarm.say); need(1);
  }
  function takeBag() {
    if (S.bag) return toast(F.bag.already);
    if (S.step !== 'alarm') return toast(F.bag.tooEarly, 4000);
    S.bag = true; me.userData.bag.visible = true; W.home.bagMesh.visible = false; const bl = labelById('bag'); if (bl) bl.show = false;
    $('act1').classList.add('done'); $('act1').querySelector('span').textContent = F.bag.button; A.click();
    need(null); S.step = 'toDoor';
    say(F.bag.say);
    setTarget(HS.door);
  }
  function goDoor() {
    if (S.step !== 'toDoor') return; setTarget(null);
    transition(F.hall.trans, ['10F'], () => {
      placeIn('hall'); S.step = 'hall'; setStep(2);
      labelById('downGoal').show = true;
      say(F.hall.say);
      setTarget(null); activate([HS.elevator, HS.stairsDown]);
    });
  }
  function elevatorFeedback() {
    if (S.step !== 'hall') return;
    HS.elevator.active = false; S.target = null; S.helps++;
    showCard(card(F.elevator.card, {
      onClose: () => { HS.elevator.grp.visible = false; setTarget(HS.stairsDown); walkTo(HS.stairsDown.pos); say(F.elevator.say); } }));
  }
  function goDown() {
    if (S.step !== 'hall') return; setTarget(null);
    if (!S.helps) toast(F.down.correct, 3600);
    transition(F.down.trans, ['10F', '9F', '8F', '7F', '6F', '5F', '4F', '3F', '2F', '1F', 'B1'], () => {
      placeIn('shelter'); S.step = 'shelter';
      if (innerWidth >= 760) $('minimap').hidden = false;
      A.sirenLevel(.025);
      setAlert('alarm', AL.alarm, F.down.alertSub);
      big(F.down.big[0], F.down.big[1], 2800);
      say(''); setTimeout(() => { if (S.step === 'shelter') say(F.down.say); }, 2800);
      setTarget(HS.mat);
    });
  }
  function sitDown() {
    if (S.step !== 'shelter') return; setTarget(null);
    S.sitting = true; S.step = 'radio'; setStep(3);
    me.position.set(W.shelter.ox + W.shelter.mat.x, .08, W.shelter.mat.z); me.rotation.y = Math.PI; me.userData.sit = 1; S.target = null;
    A.sirenStop();
    say(F.sit.say); need('B');
    activate([HS.radio]);
  }
  // 라디오를 켜면 평상 안내방송 → 15초 뒤 공습경보 해제 → 그 뒤 20초 안에 화생방경보
  function radioOn() {
    if (S.step !== 'radio') return;
    S.step = 'radioOn'; need(null); setTarget(null); A.click();
    const R = W.shelter.radio; R.dial.material.emissive.setHex(0xFFD43B); R.dial.material.emissiveIntensity = 1.2; R.glow.intensity = 3;
    const rl = labelById('radio'); if (rl) rl.show = false;
    setTimeout(() => A.speak(F.radio.speak), 400);
    setAlert('alarm', AL.alarm, F.radio.alertSub); waitFor(15000);
    say(F.radio.say);
    setTimeout(() => { if (S.step === 'radioOn') say(F.radio.sayLater); }, 8000);
    setTimeout(() => { if (S.step === 'radioOn') broadcastAirClear(); }, 15000); // 라디오를 켜고 15초 뒤 공습경보 해제
  }
  function broadcastAirClear() {
    S.step = 'airClear'; S.airCleared = true; // 붉은 깜빡임도 여기서 꺼져요
    A.chime(); setTimeout(() => A.speak(F.airClear.speak), 900);
    setAlert('clear', AL.airClear, F.airClear.alertSub); waitFor(18000);
    toast(F.airClear.toast);
    say(F.airClear.say);
    setTimeout(() => { if (S.step === 'airClear') broadcastChem(); }, 18000); // 해제 뒤 20초 안에 화생방경보
  }
  function listen() {
    if (S.step === 'radio') return radioOn();
    if (S.step === 'radioOn' || S.step === 'airClear') return toast(F.listen.listening);
    if (S.step === 'clearWait') return finishClear();
    toast(S.step === 'calm' ? F.listen.calm : F.listen.none);
  }
  function broadcastChem() {
    S.step = 'chem'; need(null); setStep(4); waitFor(0);
    A.warnTone(); setTimeout(() => A.speak(F.chem.speak), 1700);
    setAlert('chem', AL.chem, F.chem.alertSub);
    S.gasOn = true;
    ['mmGas', 'mmGoal', 'mmArrow'].forEach(id => $(id).setAttribute('visibility', 'visible')); $('mmGasLg').hidden = false; $('mmGoalLg').hidden = false;
    setTimeout(() => {
      big(F.chem.big[0], F.chem.big[1]);
      showCard(card(F.chem.card, {
        onClose: () => { $('big').hidden = true; say(F.chem.say); need(2); S.step = 'mask'; } }));
    }, 1800);
  }
  function coverMouth() {
    if (S.mask) return toast(F.mask.already);
    if (S.step !== 'mask') return toast(F.mask.tooEarly, 4200);
    S.mask = true; me.userData.mask.visible = true; need(null); A.click();
    $('act2').classList.add('done'); $('act2').querySelector('span').textContent = F.mask.button;
    toast(F.mask.toast, 3600);
    S.sitting = false; me.userData.sit = 0; me.position.y = 0; S.step = 'up';
    labelById('upGoal').show = true;
    say(F.mask.say);
    setTarget(HS.stairsUp);
  }
  function goUp() {
    if (S.step !== 'up') return; setTarget(null);
    transition(F.up.trans, ['B1', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', '11F', '12F'], () => {
      placeIn('high'); S.step = 'seal'; setStep(5);
      $('checklist').hidden = false;
      say(F.up.say);
      setTarget(null); activate([HS.window, HS.sealDoor, HS.vent]);
    });
  }
  function seal(k) {
    if (S.step !== 'seal' || S.sealed[k]) return;
    S.sealed[k] = true; S.target = null; A.click();
    const h = { window: HS.window, door: HS.sealDoor, vent: HS.vent }[k]; h.active = false; h.grp.visible = false;
    const row = document.querySelector('#checklist div[data-k="' + k + '"]'); row.classList.add('ok'); row.querySelector('i').textContent = '✓';
    if (k === 'window') S.closeWin = true;
    if (k === 'door') { W.high.tape.visible = true; W.high.gap.visible = false; }
    if (k === 'vent') S.fanOn = false;
    toast(F.seal.toast[k]);
    if (Object.keys(S.sealed).length === 3) {
      S.step = 'waitClear'; setStep(6);
      say(F.seal.say);
      setTimeout(() => {
        S.step = 'clearWait'; A.chime(); setTimeout(() => A.speak(F.clear.speak), 900);
        setAlert('clear', AL.clear, F.clear.alertSub);
        say(F.clear.say); need('B');
      }, 2600);
    }
  }
  function finishClear() {
    need(null); S.step = 'done'; setStep(7); say('');
    showCard(card(F.done.card, { onClose: showFinal }));
  }
  function showFinal() {
    const sec = Math.round((performance.now() - (S.alarmT || S.t0)) / 1000);
    $('statTime').textContent = fmt(UI.time, { m: Math.floor(sec / 60), s: sec % 60 });
    $('statHelp').textContent = fmt(UI.helps, { n: S.helps });
    $('final').hidden = false; $('hud').hidden = true; bubble.hidden = true; S.frozen = true;
  }
  function crouch() {
    S.crouch = !S.crouch; me.userData.crouch = S.crouch ? 1 : 0;
    $('act3').classList.toggle('done', S.crouch);
    if (S.crouch) toast(F.crouch.toast, 4200);
  }
  function action(a) { if (!S.started || S.frozen) return; if (a === 1) takeBag(); else if (a === 2) coverMouth(); else if (a === 3) crouch(); }
  document.querySelectorAll('.act[data-a]').forEach(b => b.addEventListener('click', () => action(+b.dataset.a)));
  $('listen').onclick = () => { if (S.started && !S.frozen) listen(); };
  $('enterBtn').onclick = enter;
  $('exitBtn').onclick = () => location.reload();
  $('againBtn').onclick = () => location.reload();

  /* ---------- 입력: 클릭 이동 · 오른쪽 버튼/드래그 회전 · 핀치 확대 ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, drag: e.button === 2, type: e.pointerType });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = S.dist; }
  });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) S.dist = Math.min(15, Math.max(4.5, dist0 * pinch0 / d)); p.drag = true; return; }
    if (!p.drag && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 8) p.drag = true;
    if (p.drag) { S.yaw -= dx * .006; S.pitch = Math.min(1.15, Math.max(.2, S.pitch + dy * .004)); }
  });
  function endPtr(e) {
    const p = ptrs.get(e.pointerId); if (!p) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
    if (p.drag || p.btn !== 0 || !S.started || S.frozen || ptrs.size) return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (S.step === 'radio' && ray.intersectObject(W.shelter.radio.grp, true).length) return radioOn();
    // 선반 위 비상 가방을 직접 눌러도 챙겨요(PC 클릭 · 휴대폰 터치)
    if (S.space === 'home' && !S.bag && ray.intersectObject(W.home.bagMesh.parent, true).length) return takeBag();
    if (S.sitting) return;
    const hit = ray.intersectObjects(pickables.filter(f => f.userData.space === S.space), false)[0];
    if (hit) { walkTo(hit.point); clickMark.position.set(hit.point.x, .04, hit.point.z); clickMark.material.opacity = .9; clickMark.scale.setScalar(1); }
  }
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', e => ptrs.delete(e.pointerId));
  canvas.addEventListener('wheel', e => { e.preventDefault(); S.dist = Math.min(15, Math.max(4.5, S.dist + e.deltaY * .01)); }, { passive: false });
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Enter' && !S.started) enter(); return; }
    if (!S.started) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (!$('moreWrap').hidden) $('moreClose').click(); return; }
    if (k === '1' || k === '2' || k === '3') action(+k);
    else if (k === 'b') { if (!S.frozen) listen(); }
    else if ('wasd'.includes(k) || k.startsWith('arrow')) { S.keys[k] = true; if (!S.frozen && !S.sitting) S.target = null; if (k.startsWith('arrow')) e.preventDefault(); }
  });
  addEventListener('keyup', e => { S.keys[e.key.toLowerCase()] = false; });
  function walkTo(p) { if (!S.sitting) S.target = V3(p.x, 0, p.z); }

  /* ---------- 카메라 ---------- */
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3(), bagV = new THREE.Vector3();
  const mobileQ = matchMedia('(max-width:760px)'); // style.css 모바일 구간과 같은 기준
  function desired(out) { const d = S.dist, h = Math.sin(S.pitch) * d, r = Math.cos(S.pitch) * d; return out.set(me.position.x + Math.sin(S.yaw) * r, 1 + h, me.position.z + Math.cos(S.yaw) * r); }
  function snapCamera() { desired(camPos); camLook.set(me.position.x, 1, me.position.z); camera.position.copy(camPos); camera.lookAt(camLook); }

  function blocked(sp, x, z) {
    const lx = x - sp.ox;
    for (const o of sp.obstacles) if (lx > o.x0 - .3 && lx < o.x1 + .3 && z > o.z0 - .3 && z < o.z1 + .3) return true;
    return false;
  }

  /* ---------- 루프 ---------- */
  const clock = new THREE.Clock(); let t = 0;
  const maxDt = /[?&]test/.test(location.search) ? .3 : .05; // 자동 테스트용
  function loop() {
    const dt = Math.min(maxDt, clock.getDelta()); t += dt;
    const sp = spaces[S.space];
    let moving = false;
    if (!S.started) {
      const a = t * .1; camera.position.set(Math.sin(a) * 12, 7.5, Math.cos(a) * 10); camera.lookAt(0, .8, -.8);
      me.position.set(.5, 0, 1.6); me.rotation.y = Math.sin(t * .5) * .4; guide.position.set(3.4, 0, 1.0); guide.rotation.y = -.6;
    } else {
      let mx = 0, mz = 0; const K = S.keys;
      if (!S.frozen && !S.sitting) {
        const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw), rx = -fz, rz = fx;
        if (K.w || K.arrowup) { mx += fx; mz += fz; } if (K.s || K.arrowdown) { mx -= fx; mz -= fz; }
        if (K.d || K.arrowright) { mx += rx; mz += rz; } if (K.a || K.arrowleft) { mx -= rx; mz -= rz; }
        if (!mx && !mz && S.target) { const dx = S.target.x - me.position.x, dz = S.target.z - me.position.z, L = Math.hypot(dx, dz); if (L < .08) S.target = null; else { mx = dx / L; mz = dz / L; } }
      }
      const L = Math.hypot(mx, mz);
      if (L > 0) {
        mx /= L; mz /= L; const step = (S.crouch ? 2 : 3.6) * dt;
        const bx = sp.bounds;
        let nx = Math.min(sp.ox + bx.maxX, Math.max(sp.ox + bx.minX, me.position.x + mx * step));
        let nz = Math.min(bx.maxZ, Math.max(bx.minZ, me.position.z + mz * step));
        if (blocked(sp, nx, nz)) { if (!blocked(sp, nx, me.position.z)) nz = me.position.z; else if (!blocked(sp, me.position.x, nz)) nx = me.position.x; else { nx = me.position.x; nz = me.position.z; } }
        const moved = Math.hypot(nx - me.position.x, nz - me.position.z);
        if (S.target && moved < 1e-4) S.target = null;
        S.moved += moved; me.position.x = nx; me.position.z = nz; moving = moved > 1e-4;
        const want = Math.atan2(mx, mz); let df = want - me.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); me.rotation.y += df * Math.min(1, dt * 12);
      }
      if (S.step === 'calm' && S.moved > 6) { S.moved = -999; setTimeout(startAlarm, 1200); }
      for (const h of Object.values(HS)) { if (!h.active || h.sp !== sp) continue; if (Math.hypot(me.position.x - h.pos.x, me.position.z - h.pos.z) < h.r) h.onEnter(); }
      desired(tmp); camPos.lerp(tmp, Math.min(1, dt * 6)); camLook.lerp(V3(me.position.x, 1, me.position.z), Math.min(1, dt * 8));
      camera.position.copy(camPos); camera.lookAt(camLook);
      guide.rotation.y = Math.atan2(me.position.x - guide.position.x, me.position.z - guide.position.z);
    }
    CH.animate(me, dt, moving, t); CH.animate(guide, dt, false, t + 1);
    sp.npcs.forEach(n => CH.animate(n, dt, false, t));
    // 그림자용 빛이 플레이어를 따라감
    sun.position.set(me.position.x + 6, 14, me.position.z + 8); sun.target.position.set(me.position.x, 0, me.position.z);
    A.tick(t);
    Object.values(HS).forEach(h => { if (h.grp.visible) { const s = 1 + .1 * Math.sin(t * 4); h.grp.children[0].scale.setScalar(s); h.grp.children[0].material.opacity = .6 + .3 * Math.sin(t * 4); } });
    dots.forEach(d => d.visible = false);
    if (S.started && pathTarget && !S.frozen) {
      const ax = me.position.x, az = me.position.z, bx = pathTarget.x, bz = pathTarget.z, Ld = Math.hypot(bx - ax, bz - az), n = Math.min(dots.length, Math.floor(Ld / .65));
      for (let i = 1; i < n; i++) { const f = i / n, d = dots[i]; d.visible = true; d.position.set(ax + (bx - ax) * f, .035, az + (bz - az) * f); const ph = ((t * 1.6 - f * 3) % 1 + 1) % 1; d.scale.setScalar(.75 + .6 * Math.max(0, Math.sin(ph * Math.PI))); }
    }
    if (clickMark.material.opacity > 0) { clickMark.material.opacity -= dt * 1.6; clickMark.scale.multiplyScalar(1 + dt * 1.2); }
    if (S.fanOn) W.high.fan.rotation.x += dt * 9;
    // 공습경보 중 창밖 붉은 경고등(2.4초 주기로 천천히) — 공습경보 해제 방송 전까지 계속
    { const alarmOn = S.alarmT && !S.airCleared, k = .5 + .5 * Math.sin(t * Math.PI * 2 / 2.4);
      ['home', 'hall', 'shelter', 'high'].forEach(key => W[key].alarmFx.set(alarmOn && S.space === key, k)); }
    if (S.closeWin) W.high.pane.position.x += (W.high.paneClosedX - W.high.pane.position.x) * Math.min(1, dt * 4);
    if (S.gasOn && W.shelter.gas.material.opacity < .18) W.shelter.gas.material.opacity += dt * .05;
    if (S.gasOn) W.shelter.gas.position.y = .28 + Math.sin(t * 1.2) * .03;
    // 경과 시간
    if (waitEnd) { const r = Math.max(0, waitEnd - performance.now()); $('waitTxt').textContent = fmt(UI.wait, { n: Math.ceil(r / 1000) }); $('waitFill').style.width = (r / waitMs * 100) + '%'; if (!r) waitFor(0); }
    if (S.alarmT && S.step !== 'done') { const s = Math.floor((performance.now() - S.alarmT) / 1000); $('metaTime').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
    renderer.render(scene, camera);
    // 라벨 위치
    const Wd = innerWidth, Hd = innerHeight;
    const overlay = !$('cardWrap').hidden || !$('final').hidden || !$('moreWrap').hidden || $('trans').classList.contains('show');
    labels.forEach(L => {
      const show = S.started && !overlay && L.show && (!L.space || L.space === S.space) && !(L === guideTag && bubbleText);
      if (!show) { L.el.style.display = 'none'; return; }
      const p = L.getPos().project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) { L.el.style.display = 'none'; return; }
      L.el.style.display = ''; L.el.style.left = ((p.x + 1) / 2 * Wd) + 'px'; L.el.style.top = ((1 - p.y) / 2 * Hd) + 'px';
    });
    if (S.started && bubbleText && !overlay && mobileQ.matches) {
      // 모바일: 동작 바 위 같은 자리에 고정해서, 찾아야 할 목표를 가리지 않아요(체크리스트는 그 위로)
      bubble.hidden = false; bubble.classList.add('dock'); bubble.style.left = bubble.style.top = '';
      document.documentElement.style.setProperty('--dock-h', bubble.offsetHeight + 'px');
    } else if (S.started && bubbleText && !overlay) {
      bubble.classList.remove('dock');
      const p = V3(guide.position.x, 2.15, guide.position.z).project(camera);
      if (p.z < 1) {
        bubble.hidden = false;
        const bw = bubble.offsetWidth, bh = bubble.offsetHeight, m = 12;
        const gx = (p.x + 1) / 2 * Wd, gy = Math.min(Hd - 150, Math.max(bh + 96, (1 - p.y) / 2 * Hd));
        // 내 캐릭터 화면 영역(이름표 ~ 발)
        const hd = V3(me.position.x, 2.2, me.position.z).project(camera), ft = V3(me.position.x, 0, me.position.z).project(camera);
        const mx = (hd.x + 1) / 2 * Wd, mTop = (1 - hd.y) / 2 * Hd, mBot = (1 - ft.y) / 2 * Hd, mw = Math.max(70, (mBot - mTop) * .45);
        let left = Math.min(Wd - bw - m, Math.max(m, gx - bw / 2)), top = gy;
        // 화면 패널(장소·상태·단면도·체크리스트)과 겹치면 그 아래로 내려요
        for (const id of ['placeCard', 'statCard', 'minimap', 'checklist', 'toast']) {
          const el = $(id); if (el.hidden || !el.getClientRects().length) continue; const r = el.getBoundingClientRect();
          if (left < r.right && left + bw > r.left && top - bh < r.bottom && top > r.top) top = r.bottom + m + bh > Hd - 150 ? r.top - m : r.bottom + m + bh; // 아래 자리가 없으면 위로
        }
        // 내 캐릭터를 가리면 안내원 쪽 옆으로 비켜요
        const overlaps = l => l < mx + mw && l + bw > mx - mw && top - bh < mBot && top > mTop;
        if (overlaps(left)) left = Math.min(Wd - bw - m, Math.max(m, gx <= mx ? mx - mw - bw - m : mx + mw + m));
        if (overlaps(left)) top = Math.max(bh + 96, mTop - m); // 양옆에 자리가 없으면 머리 위로
        // 지금 눌러야 할 비상 가방을 가리면 옆(자리가 없으면 위아래)으로 비켜요
        if (S.step === 'alarm' && S.space === 'home') {
          const b = W.home.bagMesh.getWorldPosition(bagV).project(camera), bx = (b.x + 1) / 2 * Wd, by = (1 - b.y) / 2 * Hd, pad = 34;
          if (bx > left - pad && bx < left + bw + pad && by > top - bh - pad && by < top + pad) {
            const l2 = bx > Wd / 2 ? bx - pad - bw : bx + pad;
            if (l2 >= m && l2 + bw <= Wd - m) left = l2; else top = by + pad + bh <= Hd - 150 ? by + pad + bh : Math.max(bh + 96, by - pad);
          }
        }
        bubble.style.left = left + 'px'; bubble.style.top = top + 'px';
        bubble.style.setProperty('--tail', Math.min(bw - 22, Math.max(22, gx - left)) + 'px');
      } else bubble.hidden = true;
    } else bubble.hidden = true;
    requestAnimationFrame(loop);
  }
  placeIn('home'); renderChips();
  requestAnimationFrame(loop);

  // 시연 영상 자동 재생용 훅
  window.app = {
    pos() { return [me.position.x.toFixed(2), me.position.z.toFixed(2)]; },
    enter, action, listen, startAlarm, radioOn, state: S,
    walkHS(name) { walkTo(HS[name].pos); },
    walkLocal(x, z) { const sp = spaces[S.space]; walkTo(V3(sp.ox + x, 0, z)); },
    clickCard() { if (!$('cardWrap').hidden) $('cardBtn').click(); },
    bagScreen() { const p = W.home.bagMesh.getWorldPosition(V3(0, 0, 0)).project(camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; },
    turn(dy) { S.yaw += dy; },
  };
}
