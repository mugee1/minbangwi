// 장면 구성, 조작(클릭·WASD·오른쪽 버튼 회전·터치), HUD, 대피 1세트 흐름
(function () {
  'use strict';
  const CFG = MB.config, A = MB.audio, CH = MB.characters;
  const $ = id => document.getElementById(id);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  document.querySelectorAll('.svc').forEach(e => e.textContent = CFG.SERVICE_NAME);
  document.title = CFG.SERVICE_NAME + ' 대피 연습';

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
  let hatChoice = 'helmet';
  let me = CH.create({ hat: hatChoice }); scene.add(me);
  const guide = CH.create({ shirt: 0x34548A, bottom: 0x2A3F66, hat: 'cap', guide: true, trim: 0xF2994A }); scene.add(guide);
  function rebuildMe() { const p = me.position.clone(), r = me.rotation.y; scene.remove(me); me = CH.create({ hat: hatChoice }); me.position.copy(p); me.rotation.y = r; scene.add(me); }

  /* ---------- 월드 라벨 ---------- */
  const labelsEl = $('labels');
  const labels = [];
  function addLabel(html, cls, getPos, space, id) { const el = document.createElement('div'); el.className = 'tag ' + (cls || ''); el.innerHTML = html; labelsEl.appendChild(el); const L = { el, getPos, space, id, show: true }; labels.push(L); return L; }
  const meTag = addLabel('<i>나</i><span id="meName">침착한 소나무</span>', 'me', () => V3(me.position.x, 1.95 + (me.userData.body.position.y), me.position.z));
  const guideTag = addLabel('안내원', 'npc small', () => V3(guide.position.x, 2.0, guide.position.z));
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
  hotspot('elevator', W.hall, W.hall.elevator, 1.4, () => elevatorFeedback(), true);
  hotspot('stairsDown', W.hall, W.hall.stairs, 1.0, () => goDown());
  hotspot('mat', W.shelter, W.shelter.mat, .8, () => sitDown());
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
  const chipSteps = CFG.STEPS.slice(1);
  function renderChips() {
    chipsEl.innerHTML = chipSteps.map((s, i) => { const idx = i + 1; const cls = idx < S.stepIdx ? 'c done' : idx === S.stepIdx ? 'c on' : 'c'; return (i ? '<em>›</em>' : '') + '<span class="' + cls + '">' + s.chip + '</span>'; }).join('') + '<b>' + (S.step === 'done' ? 1 : 0) + '세트</b>';
    $('barFill').style.width = Math.round((Math.max(0, S.stepIdx - 1) / (CFG.STEPS.length - 1)) * 100) + '%';
  }
  function setStep(i) { S.stepIdx = i; renderChips(); }
  const FLOOR = { home: ['10', 'F'], hall: ['10', 'F'], shelter: ['B1', ''], high: ['12', 'F'] };
  const PPL = { home: '이 장소 2명 · 안내원이 함께 있어요', hall: '이 장소 2명 · 안내원이 함께 있어요', shelter: '이 장소 8명 · 이웃 6명(가상)과 안내원', high: '이 장소 2명 · 안내원이 함께 있어요' };
  function updatePlace() {
    const sp = spaces[S.space];
    $('placeName').textContent = sp.name; $('placeSub').textContent = sp.sub; $('pplLine').textContent = PPL[S.space];
    const f = FLOOR[S.space]; $('bigVal').innerHTML = f[0] + (f[1] ? '<small>' + f[1] + '</small>' : '');
    const y = { home: 41, hall: 41, shelter: 182, high: 27 }[S.space];
    $('mmMe').setAttribute('cy', y); $('mmMeLbl').textContent = '나 · ' + ({ home: '10층', hall: '10층', shelter: '지하 1층', high: '12층' })[S.space];
  }
  const WAVE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/></svg>';
  const EAR = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></svg>';
  function setAlert(kind, title, sub) {
    const a = $('alert');
    if (!kind) { a.hidden = true; $('metaAlert').textContent = '없음'; return; }
    a.hidden = false; a.className = kind; $('alertTitle').textContent = title; $('alertSub').textContent = sub || ''; $('alertIcon').innerHTML = kind === 'alarm' ? WAVE : EAR;
    $('metaAlert').textContent = title;
  }
  function hint(t) { const h = $('hint'); if (!t) { h.hidden = true; return; } h.innerHTML = t; h.hidden = false; }
  let toastT = null;
  function toast(t, ms) { const el = $('toast'); el.innerHTML = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, ms || 3400); }
  let bubbleText = '';
  function say(t) { bubbleText = t; if (!t) bubble.hidden = true; else bubble.innerHTML = '<b class="who">안내원</b>' + t; }
  function need(k) { ['act1', 'act2', 'act3', 'listen'].forEach(id => $(id).classList.remove('need')); const m = { 1: 'act1', 2: 'act2', B: 'listen' }[k]; if (m) $(m).classList.add('need'); }
  function showCard(o) {
    $('cardWho').textContent = o.who || '안내원'; $('cardTitle').textContent = o.title; $('cardBody').innerHTML = o.body; $('cardSrc').textContent = o.src || '';
    $('cardBtn').textContent = o.btn || '알겠어요'; $('cardWrap').hidden = false; S.frozen = true; S.target = null; S.keys = {};
    $('cardBtn').onclick = () => { $('cardWrap').hidden = true; S.frozen = false; A.click(); o.onClose && o.onClose(); };
    setTimeout(() => $('cardBtn').focus(), 60);
  }
  function big(h, p, ms) { $('bigH').textContent = h; $('bigP').textContent = p || ''; $('big').hidden = false; if (ms) setTimeout(() => $('big').hidden = true, ms); }
  const src = p => '출처: ' + CFG.SOURCE + ' ' + p;

  // 우상단 카드 접기(모바일)
  const statCard = $('statCard');
  if (innerWidth < 760) statCard.classList.add('collapsed');
  $('collapse').onclick = () => { const c = statCard.classList.toggle('collapsed'); $('collapse').textContent = c ? '펼치기' : '접기'; $('collapse').setAttribute('aria-expanded', String(!c)); };
  $('collapse').textContent = statCard.classList.contains('collapsed') ? '펼치기' : '접기';
  const toggleSound = () => { A.setMuted(!A.muted); ['soundBtn', 'soundBtn2'].forEach(id => $(id).textContent = A.muted ? '소리 켜기' : '소리 끄기'); };
  $('soundBtn').onclick = toggleSound; $('soundBtn2').onclick = toggleSound;
  $('moreBtn').onclick = () => { if (!S.started) return; $('moreWrap').hidden = false; S.frozen = true; $('moreClose').focus(); };
  $('moreClose').onclick = () => { $('moreWrap').hidden = true; S.frozen = false; };
  $('whyBtn').onclick = () => showCard({ who: '대피 1세트란?', title: '경보 › 지하 › 방송 › 위로 › 밀폐 › 해제', body: '<ul>' + CFG.WHY.map(w => '<li><b>' + w.t + '</b> — ' + w.d + ' <span style="color:var(--faint);font-size:12px">(' + w.p + ')</span></li>').join('') + '</ul>', src: '출처: ' + CFG.SOURCE, btn: '닫기' });
  $('whyGrid').innerHTML = CFG.WHY.map(w => '<div><b>' + w.t + '</b><span>' + w.d + '</span><small>' + w.p + '</small></div>').join('');

  // 로비: 머리 장식
  document.querySelectorAll('#hats button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#hats button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true');
    hatChoice = b.dataset.hat; rebuildMe();
  });

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
    $('meName').textContent = ($('nick').value.trim() || '침착한 소나무').slice(0, 12);
    $('lobby').hidden = true; $('hud').hidden = false;
    A.init();
    S.started = true; S.t0 = performance.now();
    placeIn('home'); setStep(0); setAlert(null);
    say('어서 와요. 바닥을 누르거나 WASD로 집 안을 걸어 보세요.');
    hint(isTouch ? '바닥을 눌러 이동 · 한 손가락으로 끌어 둘러보기' : '바닥을 눌러 이동해 보세요 · 오른쪽 버튼으로 끌어 둘러보기');
    canvas.focus();
    setTimeout(() => { if (S.step === 'calm') startAlarm(); }, 9000);
  }
  function startAlarm() {
    if (S.step !== 'calm') return;
    S.step = 'alarm'; S.alarmT = performance.now(); setStep(1);
    setAlert('alarm', '공습경보', '사이렌 3분 파상음 · 적의 공격이 긴박하거나 진행 중');
    A.sirenStart(); A.speak('공습경보. 공습경보. 지금 즉시 대피하십시오.');
    big('공습경보', '침착하게, 하나씩 해요', 2600);
    say('공습경보예요. 먼저 <b>1번</b>을 눌러 비상 가방을 챙겨요.');
    hint('<b>1 가방 챙기기</b>를 눌러주세요'); need(1);
  }
  function takeBag() {
    if (S.bag) return toast('가방은 이미 챙겼어요');
    if (S.step !== 'alarm') return toast('비상 가방은 경보가 울리면 바로 챙겨요. 평소에 현관 가까이 두면 좋아요 <small>(41쪽)</small>', 4000);
    S.bag = true; me.userData.bag.visible = true; W.home.bagMesh.visible = false; const bl = labelById('bag'); if (bl) bl.show = false;
    $('act1').classList.add('done'); $('act1').querySelector('span').textContent = '가방 챙김'; A.click();
    need(null); S.step = 'toDoor';
    say('좋아요. 이제 현관으로 나가요. 지하로 내려갈 거예요.');
    hint('빛나는 길을 따라 <b>현관</b> 쪽 바닥을 눌러주세요');
    setTarget(HS.door);
  }
  function goDoor() {
    if (S.step !== 'toDoor') return; setTarget(null);
    transition('현관을 나서는 중', ['10F'], () => {
      placeIn('hall'); S.step = 'hall'; setStep(2);
      labelById('downGoal').show = true;
      say('엘리베이터 말고 <b>비상계단</b>으로 가요.');
      hint('복도 끝 <b>비상계단</b> 쪽 바닥을 눌러주세요');
      setTarget(HS.stairsDown); activate([HS.elevator]);
    });
  }
  function elevatorFeedback() {
    if (S.step !== 'hall') return;
    HS.elevator.active = false; S.target = null; S.helps++;
    showCard({ title: '잠깐, 계단으로 가요', body: '<ol><li>정전되면 엘리베이터가 멈춰 안에 갇힐 수 있어요.</li><li>사람이 몰리면 기다리는 동안 대피가 늦어져요.</li></ol>', src: src('12·32쪽'), btn: '비상계단으로 안내받기',
      onClose: () => { walkTo(HS.stairsDown.pos); setTimeout(() => { if (S.step === 'hall') HS.elevator.active = true; }, 4000); } });
  }
  function goDown() {
    if (S.step !== 'hall') return; setTarget(null);
    transition('비상계단으로 내려가는 중', ['10F', '9F', '8F', '7F', '6F', '5F', '4F', '3F', '2F', '1F', 'B1'], () => {
      placeIn('shelter'); S.step = 'shelter';
      if (innerWidth >= 760) $('minimap').hidden = false;
      A.sirenLevel(.025);
      setAlert('alarm', '공습경보', '지하 대피소에 도착했어요');
      say('잘 왔어요. 빈 자리에 앉아서 정부 방송을 기다려요.');
      hint('빛나는 <b>빈 자리</b>를 눌러 앉아주세요');
      setTarget(HS.mat);
    });
  }
  function sitDown() {
    if (S.step !== 'shelter') return; setTarget(null);
    S.sitting = true; S.step = 'listen'; setStep(3);
    me.position.set(W.shelter.ox + W.shelter.mat.x, .08, W.shelter.mat.z); me.rotation.y = Math.PI; me.userData.sit = 1; S.target = null;
    A.sirenStop();
    say('방송에 귀 기울여요. 상황에 따라 해야 할 일이 달라져요.');
    hint('<b>방송 듣기</b>를 눌러주세요'); need('B');
  }
  function listen() {
    if (S.step === 'listen') return broadcastChem();
    if (S.step === 'clearWait') return finishClear();
    toast(S.step === 'calm' ? '평소에 TV·라디오와 재난문자 알림을 켜 두면 좋아요' : '지금은 새 방송이 없어요');
  }
  function broadcastChem() {
    S.step = 'chem'; need(null); setStep(4);
    A.chime(); setTimeout(() => A.speak('화생방 경보. 화학 공격이 확인되었습니다. 코와 입을 가리고, 높은 층 실내로 대피하십시오.'), 900);
    setAlert('chem', '화생방경보', '음성방송 · "화학 공격이 확인되었습니다"');
    S.gasOn = true;
    ['mmGas', 'mmGoal', 'mmArrow'].forEach(id => $(id).setAttribute('visibility', 'visible')); $('mmGasLg').hidden = false; $('mmGoalLg').hidden = false;
    setTimeout(() => {
      big('이번엔 다시 위로', '방금 내려온 길과 반대 방향이에요');
      showCard({ title: '왜 위로 갈까요?', body: '<p>전쟁에 쓰이는 화학 무기는 공기보다 무거워 <b>아래로 가라앉아요.</b> 바깥 공기를 막을 수 있는 <b>높은 층 실내</b>가 더 안전해요.</p>', src: src('20쪽'),
        onClose: () => { $('big').hidden = true; say('올라가기 전에 <b>2번</b>을 눌러 코와 입을 가려요.'); hint('<b>2 코·입 가리기</b>를 눌러주세요'); need(2); S.step = 'mask'; } });
    }, 1800);
  }
  function coverMouth() {
    if (S.mask) return toast('이미 코와 입을 가렸어요');
    if (S.step !== 'mask') return toast('화생방 상황에선 방독면이 없으면 젖은 수건이나 마스크로 코와 입을 가려요 <small>(43쪽)</small>', 4200);
    S.mask = true; me.userData.mask.visible = true; need(null); A.click();
    $('act2').classList.add('done'); $('act2').querySelector('span').textContent = '가림 완료';
    toast('방독면이 없으면 젖은 수건이나 마스크로 대신해요 <small>(43쪽)</small>', 3600);
    S.sitting = false; me.userData.sit = 0; me.position.y = 0; S.step = 'up';
    labelById('upGoal').show = true;
    say('이제 비상계단으로 높은 층까지 올라가요.');
    hint('빛나는 길을 따라 <b>비상계단 · 위로</b>를 눌러주세요');
    setTarget(HS.stairsUp);
  }
  function goUp() {
    if (S.step !== 'up') return; setTarget(null);
    transition('비상계단으로 올라가는 중', ['B1', '1F', '2F', '3F', '4F', '5F', '6F', '7F', '8F', '9F', '10F', '11F', '12F'], () => {
      placeIn('high'); S.step = 'seal'; setStep(5);
      $('checklist').hidden = false;
      say('바깥 공기가 들어오지 않게 막아요. 하나씩 가서 눌러 보세요.');
      hint('빛나는 <b>세 곳</b>을 차례로 눌러주세요');
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
    toast({ window: '창문을 닫았어요', door: '문틈을 테이프로 막았어요', vent: '환풍기를 껐어요. 에어컨과 공기청정기도 꺼요' }[k] + ' <small>(20쪽)</small>');
    if (Object.keys(S.sealed).length === 3) {
      S.step = 'waitClear'; setStep(6);
      say('잘했어요. 이제 정부 방송을 기다려요.'); hint('');
      setTimeout(() => {
        S.step = 'clearWait'; A.chime(); setTimeout(() => A.speak('경보 해제. 공격이 끝났습니다. 계속해서 정부 안내방송을 청취하십시오.'), 900);
        setAlert('clear', '경보해제', '음성방송 · 추가 공격이 예상되지 않을 때');
        say('방송이 나왔어요. 들어 볼까요?');
        hint('<b>방송 듣기</b>를 눌러주세요'); need('B');
      }, 2600);
    }
  }
  function finishClear() {
    need(null); S.step = 'done'; setStep(7); hint(''); say('');
    showCard({ who: '정부 안내방송', title: '경보가 해제됐어요', body: '<p>부상자 구조에 함께하고, 다시 공격이 있을 수 있으니 <b>정부 안내방송을 계속 들어요.</b></p>', src: src('11쪽'), btn: '1세트 마치기', onClose: showFinal });
  }
  function showFinal() {
    const sec = Math.round((performance.now() - (S.alarmT || S.t0)) / 1000);
    $('statTime').textContent = Math.floor(sec / 60) + '분 ' + (sec % 60) + '초';
    $('statHelp').textContent = S.helps + '번';
    $('final').hidden = false; $('hud').hidden = true; bubble.hidden = true; S.frozen = true;
  }
  function crouch() {
    S.crouch = !S.crouch; me.userData.crouch = S.crouch ? 1 : 0;
    $('act3').classList.toggle('done', S.crouch);
    if (S.crouch) toast('대피소로 이동하기 어렵다면 낮은 곳에 최대한 엎드려 몸을 숨겨요 <small>(16쪽)</small>', 4200);
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
    if (p.drag || p.btn !== 0 || !S.started || S.frozen || S.sitting || ptrs.size) return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
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
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
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
    if (S.closeWin) W.high.pane.position.x += (W.high.paneClosedX - W.high.pane.position.x) * Math.min(1, dt * 4);
    if (S.gasOn && W.shelter.gas.material.opacity < .18) W.shelter.gas.material.opacity += dt * .05;
    if (S.gasOn) W.shelter.gas.position.y = .28 + Math.sin(t * 1.2) * .03;
    // 경과 시간
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
    if (S.started && bubbleText && !overlay) {
      const p = V3(guide.position.x, 2.15, guide.position.z).project(camera);
      if (p.z < 1) { bubble.hidden = false; const bw = Math.min(300, Wd * .7) / 2 + 8; bubble.style.left = Math.min(Wd - bw, Math.max(bw, (p.x + 1) / 2 * Wd)) + 'px'; bubble.style.top = Math.min(Hd - 150, Math.max(170, (1 - p.y) / 2 * Hd)) + 'px'; } else bubble.hidden = true;
    } else bubble.hidden = true;
    requestAnimationFrame(loop);
  }
  placeIn('home'); renderChips();
  requestAnimationFrame(loop);

  // 시연 영상 자동 재생용 훅
  window.app = {
    pos() { return [me.position.x.toFixed(2), me.position.z.toFixed(2)]; },
    enter, action, listen, startAlarm, state: S,
    walkHS(name) { walkTo(HS[name].pos); },
    walkLocal(x, z) { const sp = spaces[S.space]; walkTo(V3(sp.ox + x, 0, z)); },
    clickCard() { if (!$('cardWrap').hidden) $('cardBtn').click(); },
    turn(dy) { S.yaw += dy; },
  };
})();
