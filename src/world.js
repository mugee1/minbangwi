// 네 개의 공간: 우리 집(10층) · 10층 복도 · 지하 대피소(B1) · 12층 실내
(function () {
  const T = MB.tex;
  const C = MB.characters;
  const cache = {};
  function std(color, extra) {
    const k = String(color) + (extra ? JSON.stringify(Object.keys(extra)) + (extra.map ? extra.map.uuid : '') : '');
    if (!cache[k]) cache[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .85, metalness: 0 }, extra || {}));
    return cache[k];
  }
  function add(parent, geo, mat, x, y, z, o) {
    const me = new THREE.Mesh(geo, mat); me.position.set(x || 0, y || 0, z || 0);
    me.castShadow = !(o && o.noCast); me.receiveShadow = true; parent.add(me); return me;
  }
  // 바닥에 놓인 상자(y는 바닥 기준)
  function box(p, w, h, d, mat, x, y, z, o) { return add(p, new THREE.BoxGeometry(w, h, d), typeof mat === 'number' ? std(mat) : mat, x, y + h / 2, z, o); }
  function cyl(p, rt, rb, h, mat, x, y, z, seg) { return add(p, new THREE.CylinderGeometry(rt, rb, h, seg || 20), typeof mat === 'number' ? std(mat) : mat, x, y + h / 2, z); }
  function plane(p, w, h, mat, x, y, z, ry, rx) {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, 0); me.receiveShadow = true; p.add(me); return me;
  }
  function basic(map, extra) { return new THREE.MeshBasicMaterial(Object.assign({ map, toneMapped: false }, extra || {})); }

  // 벽: 창문 구멍이 있는 벽(dollhouse 방식으로 바깥쪽 면은 보이지 않음)
  function wallWithWindow(g, wallMat, len, h, opening, pos, ry) {
    // opening: {x, w, y0, y1} 벽 로컬 좌표
    const grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = ry; g.add(grp);
    const L = -len / 2, R = len / 2;
    const seg = (x0, x1, y0, y1) => { const w = x1 - x0, hh = y1 - y0; if (w <= 0 || hh <= 0) return; const pl = plane(grp, w, hh, wallMat, (x0 + x1) / 2, (y0 + y1) / 2, 0); pl.material = wallMat; };
    if (!opening) { seg(L, R, 0, h); return grp; }
    const ox0 = opening.x - opening.w / 2, ox1 = opening.x + opening.w / 2;
    seg(L, ox0, 0, h); seg(ox1, R, 0, h); seg(ox0, ox1, 0, opening.y0); seg(ox0, ox1, opening.y1, h);
    return grp;
  }
  function frameWindow(grp, op, frameMat, sky, depth) {
    const cx = op.x, cy = (op.y0 + op.y1) / 2, w = op.w, h = op.y1 - op.y0, t = 0.08;
    add(grp, new THREE.BoxGeometry(w + t * 2, t, depth), frameMat, cx, op.y0 - t / 2 + .02, -depth / 2 + .02);
    add(grp, new THREE.BoxGeometry(w + t * 2, t, depth), frameMat, cx, op.y1 + t / 2, -depth / 2 + .02);
    add(grp, new THREE.BoxGeometry(t, h, depth), frameMat, cx - w / 2 - t / 2, cy, -depth / 2 + .02);
    add(grp, new THREE.BoxGeometry(t, h, depth), frameMat, cx + w / 2 + t / 2, cy, -depth / 2 + .02);
    add(grp, new THREE.BoxGeometry(t * .7, h, t * .7), frameMat, cx, cy, -0.05);
    // 창틀(실내 쪽 선반)
    add(grp, new THREE.BoxGeometry(w + .3, .06, .28), frameMat, cx, op.y0 - .02, .1);
    // 바깥 풍경
    const back = plane(grp, w * 4.5, 9, basic(sky), cx, cy + .6, -5.5);
    back.receiveShadow = false;
  }

  // 창밖 붉은 경고등: 하늘 위에 겹치는 붉은 판 + 창 안쪽으로 비치는 붉은 빛
  function alarmFx(g, x, y, skyZ, lightZ) {
    const redSky = plane(g, 30, 9, new THREE.MeshBasicMaterial({ color: 0xFF3B2F, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), x, y, skyZ);
    redSky.receiveShadow = false;
    const redLight = new THREE.PointLight(0xFF4A3A, 0, 11, 1.6); redLight.position.set(x, y, lightZ); g.add(redLight);
    return { set(on, k) { redSky.material.opacity = on ? .18 + .3 * k : 0; redLight.intensity = on ? 2 + 6 * k : 0; } };
  }
  // 창이 없는 곳(지하)용 벽 경광등: 붉은 등 + 주변을 물들이는 붉은 빛. spots = [[x, y, z, 벽 방향 회전]]
  function alarmLamps(g, spots) {
    const lens = new THREE.MeshStandardMaterial({ color: 0x7A1E16, emissive: 0xFF3B2F, emissiveIntensity: 0, roughness: .3 });
    const lights = spots.map(([x, y, z, ry]) => {
      const lamp = new THREE.Group(); lamp.position.set(x, y, z); lamp.rotation.y = ry; g.add(lamp);
      add(lamp, new THREE.BoxGeometry(.34, .1, .12), std(0x4A4F57), 0, -.12, .06, { noCast: true });
      const dome = add(lamp, new THREE.SphereGeometry(.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), lens, 0, -.07, .12, { noCast: true });
      dome.rotation.x = Math.PI / 2;
      const l = new THREE.PointLight(0xFF4A3A, 0, 9, 1.6); l.position.set(0, -.1, .6); lamp.add(l);
      return l;
    });
    return { set(on, k) { lens.emissiveIntensity = on ? .4 + 2.2 * k : 0; lights.forEach(l => l.intensity = on ? 1.5 + 5 * k : 0); } };
  }

  function room(key, o) {
    const g = new THREE.Group(); g.position.x = o.ox; MB.scene.add(g);
    const W = o.w, D = o.d, H = o.h;
    const floor = plane(g, W, D, std(0xffffff, { map: o.floorTex, roughness: o.floorRough || .8 }), 0, 0, 0, 0, -Math.PI / 2);
    floor.userData.space = key;
    const wallMat = std(0xffffff, { map: o.wallTex, roughness: .95 });
    const walls = {};
    walls.back = wallWithWindow(g, wallMat, W, H, o.backWindow, new THREE.Vector3(0, 0, -D / 2), 0);
    walls.left = wallWithWindow(g, wallMat, D, H, o.leftWindow, new THREE.Vector3(-W / 2, 0, 0), Math.PI / 2);
    walls.right = wallWithWindow(g, wallMat, D, H, null, new THREE.Vector3(W / 2, 0, 0), -Math.PI / 2);
    walls.front = wallWithWindow(g, wallMat, W, H, null, new THREE.Vector3(0, 0, D / 2), Math.PI);
    // 걸레받이
    const base = std(o.baseColor || 0x7A6553);
    [[0, -D / 2 + .03, W, 0], [0, D / 2 - .03, W, Math.PI], [-W / 2 + .03, 0, D, Math.PI / 2], [W / 2 - .03, 0, D, -Math.PI / 2]].forEach(([x, z, l, r]) => { const b = box(g, l, .12, .05, base, x, 0, z); b.rotation.y = r; });
    const sp = { key, name: o.name, sub: o.sub, ox: o.ox, g, floor, walls, bounds: { minX: -W / 2 + .55, maxX: W / 2 - .55, minZ: -D / 2 + .55, maxZ: D / 2 - .55 }, light: o.light, labels: [], hotspots: {}, npcs: [], obstacles: [] };
    return sp;
  }
  // 이동을 막는 사각형 장애물(로컬 좌표)
  function block(sp, x0, z0, x1, z1) { sp.obstacles.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1) }); }

  function build() {
    const S = {};
    const skyDay = T.sky('day');

    /* ---------- 우리 집 · 10층 거실 ---------- */
    const home = S.home = room('home', {
      ox: 0, w: 14, d: 10, h: 3.2, name: '우리 집', sub: '10층 거실',
      floorTex: T.wood('#C29A6E', 2.4, 2.2), floorRough: .55, wallTex: T.wall('#F1EDE6', 6, 2), baseColor: 0xEDE7DE,
      backWindow: { x: -1.6, w: 6.4, y0: .45, y1: 2.8 },
      light: { sky: 0xFFF8EE, ground: 0x7A6450, sun: 0xFFF0DC, sunI: 2.3, amb: .55 },
    });
    frameWindow(home.walls.back, { x: -1.6, w: 6.4, y0: .45, y1: 2.8 }, std(0xF4F1EC), skyDay, .35);
    // 공습경보 때 창밖이 붉게 깜빡여요(평소엔 꺼져 있음, 경보해제까지 유지)
    home.alarmFx = alarmFx(home.g, -1.6, 2.2, -10.3, -4.2);
    (() => {
      const g = home.g;
      // 러그
      const rug = plane(g, 5.2, 3.6, std(0xffffff, { map: T.tile('#B65A45', '#AA5240', 28, 1, 1), roughness: .95 }), -2, .012, -1.4, 0, -Math.PI / 2);
      // 커튼(얇은 시폰) · 거실창 양옆
      const sheer = std(0xE9E5DD, { transparent: true, opacity: .85, roughness: 1 });
      [-5.25, 1.75].forEach(x => box(g, .9, 2.75, .08, sheer, x, .05, -4.9, { noCast: true }));
      // 소파
      const fab = std(0xEDE6D9), fab2 = std(0xE2DACB);
      box(g, 3.4, .42, 1.1, fab, -2, 0, -3.25); box(g, 3.4, .9, .3, fab2, -2, 0, -3.85);
      box(g, .32, .66, 1.1, fab2, -3.86, 0, -3.25); box(g, .32, .66, 1.1, fab2, -.14, 0, -3.25);
      [-2.8, -1.2].forEach(x => box(g, 1.4, .18, .9, std(0xF4EFE6), x, .42, -3.2));
      box(g, .5, .45, .18, std(0xB86A45), -3.3, .55, -3.6).rotation.z = .2;
      block(home, -4.05, -4.1, .05, -2.65);
      // 테이블
      box(g, 1.7, .08, .9, std(0x4B3426, { roughness: .6 }), -2, .36, -1.3); [[-2.7, -1.65], [-1.3, -1.65], [-2.7, -.95], [-1.3, -.95]].forEach(([x, z]) => cyl(g, .07, .07, .36, 0x3F2B1F, x, 0, z));
      cyl(g, .08, .07, .16, 0xF4F1EA, -1.7, .44, -1.2); box(g, .3, .03, .22, std(0xE8E2D6), -2.3, .44, -1.35);
      block(home, -2.9, -1.8, -1.1, -.8);
      // TV장 + TV
      box(g, .55, .5, 2.6, std(0x5A3F2E), -6.4, 0, -1.4); box(g, .07, 1.05, 1.9, std(0x1B1D20, { roughness: .3 }), -6.55, .72, -1.4);
      block(home, -6.9, -2.8, -6.0, 0);
      // 스탠드
      cyl(g, .03, .03, 1.55, 0x1E1E20, -4.7, 0, -3.7); cyl(g, .22, .32, .38, std(0xFFE3B0, { emissive: 0xFFC77A, emissiveIntensity: .6 }), -4.7, 1.5, -3.7);
      const pl = new THREE.PointLight(0xFFC98A, 4, 6, 1.6); pl.position.set(-4.7, 1.8, -3.5); g.add(pl);
      // 화분
      cyl(g, .26, .2, .44, 0xB97A55, 5.7, 0, -4.2); add(g, new THREE.IcosahedronGeometry(.5, 1), std(0x6E9A63), 5.7, .95, -4.2); add(g, new THREE.IcosahedronGeometry(.34, 1), std(0x7FAE72), 5.5, 1.3, -4.0);
      block(home, 5.3, -4.6, 6.1, -3.8);
      // 책장
      box(g, 1.8, 2.0, .4, std(0xCDAB80), 3.2, 0, -4.75);
      for (let i = 0; i < 4; i++) box(g, 1.7, .04, .36, std(0xB8936A), 3.2, .4 + i * .45, -4.72);
      const bookC = [0xC8665A, 0x6E8FB5, 0xE6C35C, 0x7FA06E, 0xB58BB0];
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(g, .16, .3 + (i % 3) * .04, .26, std(bookC[(i + r) % 5]), 2.55 + i * .2, .45 + r * .45, -4.7);
      block(home, 2.2, -5, 4.2, -4.4);
      // 현관(오른쪽 벽): 문 + 신발장
      box(g, .5, 1.0, 1.3, std(0xE8E1D6), 6.7, 0, -2.2); block(home, 6.3, -2.9, 7, -1.5);
      box(g, .1, 2.2, 1.2, std(0xB9946C), 6.96, 0, .7);
      add(g, new THREE.SphereGeometry(.05, 10, 8), std(0xD9C29A, { metalness: .6, roughness: .3 }), 6.88, 1.05, 1.15);
      const mat = plane(g, 1.4, 1.6, std(0x9A8C7C), 6.25, .013, .7, 0, -Math.PI / 2);
      // 비상 가방 (선반 위)
      const bagG = new THREE.Group(); bagG.position.set(1.3, 0, -3.9); g.add(bagG);
      box(bagG, .9, .5, .5, std(0xD8C4A6), 0, 0, 0);
      const bag = box(bagG, .5, .55, .28, std(0x5E7050), 0, .5, 0); box(bagG, .3, .2, .06, std(0x6F8460), 0, .58, .16);
      home.bagMesh = bag;
      home.bagPos = new THREE.Vector3(1.3, 1.3, -3.9);
      home.spawn = new THREE.Vector3(0.5, 0, 1.6); home.spawnYaw = 0.25;
      home.guide = new THREE.Vector3(3.4, 0, 1.0);
      home.door = new THREE.Vector3(6.0, 0, .7);
      home.labels.push({ text: '비상 가방', cls: 'obj', pos: new THREE.Vector3(1.3, 1.45, -3.9), id: 'bag' });
      home.labels.push({ text: '현관', cls: 'obj', pos: new THREE.Vector3(6.6, 2.5, .7) });
    })();

    /* ---------- 10층 복도 ---------- */
    const hall = S.hall = room('hall', {
      ox: 40, w: 18, d: 4.8, h: 3.0, name: '10층 복도', sub: '엘리베이터 · 비상계단',
      floorTex: T.tile('#C9C3B8', '#A69F94', 4, 9, 2.4), floorRough: .5, wallTex: T.wall('#E4DDD1', 8, 2), baseColor: 0x8C8578,
      light: { sky: 0xF4F6F8, ground: 0x5A554E, sun: 0xFFFFFF, sunI: 1.6, amb: .55 },
    });
    (() => {
      const g = hall.g;
      // 정면 벽 한 장면에 엘리베이터(왼쪽)와 비상계단(오른쪽)이 함께 보이게 배치
      [[-6.6, '1001'], [6.6, '1002']].forEach(([x, n]) => {
        box(g, 1.15, 2.2, .1, std(0x8C6C52), x, 0, -2.36);
        add(g, new THREE.SphereGeometry(.05, 10, 8), std(0xD9C29A, { metalness: .6, roughness: .3 }), x + .42, 1.05, -2.28);
        plane(g, .42, .16, basic(T.sign([n], '#F2EEE6', '#3A2E25', 256, 96)), x, 2.42, -2.39);
      });
      // 엘리베이터(정면 왼쪽)
      box(g, 2.2, 2.6, .12, std(0x9DA2A8, { metalness: .5, roughness: .35 }), -2.6, 0, -2.36);
      box(g, .9, 2.2, .14, std(0xBFC4C9, { metalness: .6, roughness: .25 }), -3.06, 0, -2.3);
      box(g, .9, 2.2, .14, std(0xBFC4C9, { metalness: .6, roughness: .25 }), -2.14, 0, -2.3);
      plane(g, .9, .3, basic(T.sign(['정전 · 운행 중지'], '#2B1414', '#FF8A85', 512, 160)), -2.6, 2.45, -2.28);
      box(g, .16, .3, .06, std(0x8C9196), -1.25, 1.0, -2.36);
      // 비상계단 문(정면 오른쪽)
      box(g, 1.3, 2.2, .12, std(0x587A62), 2.6, 0, -2.36);
      add(g, new THREE.BoxGeometry(.5, .05, .06), std(0xC9CCD0, { metalness: .6, roughness: .3 }), 2.15, 1.05, -2.27);
      plane(g, 1.3, .46, basic(T.exitSign('비상계단')), 2.6, 2.55, -2.29);
      // 소화기함
      box(g, .5, .7, .18, std(0xC63B3B), -4.8, .7, -2.3); plane(g, .36, .16, basic(T.sign(['소화기'], '#C63B3B', '#FFFFFF', 256, 96)), -4.8, 1.25, -2.2);
      // 천장 조명 띠
      [-4.8, 0, 4.8].forEach(x => box(g, 1.2, .04, .24, new THREE.MeshBasicMaterial({ color: 0xF5F7FA }), x, 2.95, 0, { noCast: true }));
      // 공습경보 경광등(정면 가운데 · 양쪽 끝 벽)
      hall.alarmFx = alarmLamps(g, [[0, 2.75, -2.35, 0], [-8.95, 2.6, 0, Math.PI / 2], [8.95, 2.6, 0, -Math.PI / 2]]);
      hall.spawn = new THREE.Vector3(0, 0, 1.3); hall.spawnYaw = 0;
      hall.guide = new THREE.Vector3(-1.7, 0, 2.5);
      hall.elevator = new THREE.Vector3(-2.6, 0, -1.4);
      hall.stairs = new THREE.Vector3(2.6, 0, -1.4);
      hall.labels.push({ text: '엘리베이터', cls: 'obj', pos: new THREE.Vector3(-2.6, 3.0, -2.2) });
      hall.labels.push({ text: '비상계단', cls: 'obj', pos: new THREE.Vector3(2.6, 3.1, -2.2), id: 'downGoal' });
    })();

    /* ---------- 지하 대피소 B1 ---------- */
    const shelter = S.shelter = room('shelter', {
      ox: 80, w: 24, d: 16, h: 3.2, name: '지하 대피소', sub: 'B1 · 민방위 대피시설',
      floorTex: T.concrete('#8D8F91', 5, 3.4), floorRough: .9, wallTex: T.concrete('#B4B6B8', 6, 1), baseColor: 0xD3B03A,
      light: { sky: 0xE8F0F8, ground: 0x3A3D41, sun: 0xF2F6FA, sunI: 1.3, amb: .6 },
    });
    (() => {
      const g = shelter.g;
      // 주차선
      for (let i = -4; i <= 4; i++) plane(g, .1, 4.4, new THREE.MeshBasicMaterial({ color: 0xE9E4D4 }), i * 2.6, .014, -5.5, 0, -Math.PI / 2);
      // 기둥(노랑·검정 띠)
      const stripe = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#E2B93B'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#2C2C2C'; for (let i = -64; i < 128; i += 24) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 12, 64); x.lineTo(i + 76, 0); x.lineTo(i + 64, 0); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; })();
      [[-7, -2.4], [0, -2.4], [7, -2.4], [-7, 3.6], [7, 3.6]].forEach(([x, z]) => {
        box(g, .8, 3.2, .8, std(0xC9CBCD), x, 0, z); box(g, .82, .55, .82, std(0xffffff, { map: stripe }), x, .05, z);
        block(shelter, x - .55, z - .55, x + .55, z + .55);
      });
      // 형광등
      [-8, -3, 2, 7].forEach(x => [-4, 2].forEach(z => box(g, 1.7, .05, .22, new THREE.MeshBasicMaterial({ color: 0xF0F6FA }), x, 3.1, z, { noCast: true })));
      // 대피소 표지 + 안내 현수막
      plane(g, 1.2, 1.5, basic(T.shelterSign()), -2.2, 2.1, -7.96);
      plane(g, 4.2, .9, basic(T.sign(['민방위 대피시설', '수용 인원 1,200명 · 지하 1층'], '#1E3F6E', '#FFFFFF', 1024, 220)), 1.6, 2.2, -7.96);
      // 비상 물품 선반
      box(g, 2.6, 1.6, .5, std(0x7C8288, { metalness: .4, roughness: .5 }), -9.5, 0, -7.4);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) box(g, .4, .32, .35, std([0xC9A777, 0x6E8FB5, 0xE8E3D8][i]), -10.5 + j * .5, .1 + i * .52, -7.35);
      block(shelter, -10.9, -7.8, -8.1, -6.9);
      // 매트와 앉아 있는 이웃(가상)
      const shirts = [0x9DB98A, 0x8DB3D6, 0xE7A07E, 0xC7A6D6, 0xE9C46A, 0x9FC9C0];
      const names = ['라디오 챙긴 이웃', '손전등 담당', '물병 나눔', '조용한 102호', '계단 지킴이', '담요 두 장'];
      const hats = ['beanie', 'none', 'helmet', 'none', 'hood', 'none'];
      // 이웃은 동물 모습(옷·모자는 그대로). 종마다 귀·주둥이·꼬리가 달라요
      const animals = ['bear', 'cat', 'dog', 'panda', 'rabbit', 'fox'], widths = [1.08, .97, 1.02, 1.08, .96, 1]; // 두건 자리는 귀가 빠져나오는 토끼
      let n = 0;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const x = -4.5 + c * 2.4, z = .4 + r * 2.4;
        box(g, 1.25, .08, 1.45, std(r ? 0x5B6F8A : 0x6A7F5C), x, 0, z);
        const mine = (r === 1 && c === 2), empty = mine || (r === 0 && c === 3);
        if (mine) { shelter.mat = new THREE.Vector3(x, 0, z); continue; }
        if (empty) continue;
        const p = C.create({ shirt: shirts[n % 6], bottom: 0x7E6A58, hat: hats[n % 6], scale: .95, animal: animals[n % 6], width: widths[n % 6] });
        p.position.set(x, .08, z); p.rotation.y = Math.PI + (n % 2 ? .3 : -.2); p.userData.sit = 1; p.userData.phase = n;
        g.add(p); shelter.npcs.push(p);
        shelter.labels.push({ text: names[n % 6], cls: 'small', pos: new THREE.Vector3(x, 1.65, z) });
        box(g, .14, .26, .14, std(0x8EC3E6, { transparent: true, opacity: .8 }), x + .45, .08, z + .45, { noCast: true });
        n++;
      }
      // 라디오
      box(g, .5, .3, .2, std(0xD95C4A), -4.5 + 2.4 * 3 + .1, .08, .4 + .55);
      // 내 자리 옆 라디오(켜면 정부 방송이 나와요)
      const radio = new THREE.Group(); radio.position.set(1.3, .08, 2.25); radio.rotation.y = -.5; g.add(radio);
      box(radio, .62, .36, .24, std(0xE06A4E, { roughness: .6 }), 0, 0, 0);
      add(radio, new THREE.CircleGeometry(.11, 20), std(0x3A2E2A), -.14, .18, .121);
      const dial = add(radio, new THREE.BoxGeometry(.2, .08, .02), new THREE.MeshStandardMaterial({ color: 0x4A4F57, emissive: 0x000000, roughness: .4 }), .14, .2, .125);
      add(radio, new THREE.CylinderGeometry(.03, .03, .05, 12), std(0xF2EEE6), .14, .08, .13).rotation.x = Math.PI / 2;
      const ant = add(radio, new THREE.CylinderGeometry(.008, .008, .5, 6), std(0xC9CCD0, { metalness: .7, roughness: .3 }), .22, .55, -.05); ant.rotation.z = -.35;
      const glow = new THREE.PointLight(0xFFD43B, 0, 2.2, 2); glow.position.set(0, .5, .3); radio.add(glow);
      shelter.radio = { grp: radio, dial, glow };
      shelter.radioPos = new THREE.Vector3(1.3, 0, 2.25);
      shelter.labels.push({ text: '라디오', cls: 'obj', pos: new THREE.Vector3(1.3, .95, 2.25), id: 'radio' });
      // 비상계단(오른쪽 벽)
      box(g, .12, 2.2, 1.3, std(0x587A62), 11.94, 0, 5.2);
      plane(g, 1.3, .46, basic(T.exitSign('비상계단')), 11.86, 2.55, 5.2, -Math.PI / 2);
      // 공습경보 경광등(경보해제 전까지 붉게 깜빡여요)
      shelter.alarmFx = alarmLamps(g, [[-6, 2.75, -7.95, 0], [5.5, 2.75, -7.95, 0], [11.95, 2.75, 2.6, -Math.PI / 2], [-11.95, 2.75, 0, Math.PI / 2]]);
      // 가스층(방송 전에는 보이지 않음)
      const gas = new THREE.Mesh(new THREE.BoxGeometry(23.6, .55, 15.6), new THREE.MeshBasicMaterial({ color: 0x6FD0AE, transparent: true, opacity: 0, depthWrite: false }));
      gas.position.set(0, .28, 0); g.add(gas); shelter.gas = gas;
      shelter.spawn = new THREE.Vector3(10.2, 0, 5.2); shelter.spawnYaw = 0.9;
      shelter.guide = new THREE.Vector3(8.6, 0, 2.2); // 기둥(7, 3.6)과 계단→매트 길을 피한 자리
      shelter.stairs = new THREE.Vector3(10.6, 0, 5.2);
      shelter.labels.push({ text: '비상계단 · 위로', cls: 'goal', pos: new THREE.Vector3(11.6, 3.05, 5.2), id: 'upGoal' });
    })();

    /* ---------- 12층 실내 ---------- */
    const high = S.high = room('high', {
      ox: 120, w: 13, d: 9, h: 3.0, name: '12층 실내', sub: '바깥 공기를 막을 방',
      floorTex: T.wood('#C9A378', 2.4, 2), floorRough: .55, wallTex: T.wall('#F1EDE6', 6, 2), baseColor: 0xEDE7DE,
      backWindow: { x: 1.2, w: 3.6, y0: .9, y1: 2.5 },
      light: { sky: 0xFFF8EE, ground: 0x7A6450, sun: 0xFFF0DC, sunI: 2.1, amb: .55 },
    });
    frameWindow(high.walls.back, { x: 1.2, w: 3.6, y0: .9, y1: 2.5 }, std(0xF4F1EC), skyDay, .3);
    high.alarmFx = alarmFx(high.g, 1.2, 2.3, -9.8, -3.7);
    (() => {
      const g = high.g;
      // 열린 창(미닫이): 닫으면 유리가 가운데로 옴
      const pane = add(g, new THREE.BoxGeometry(1.75, 1.55, .04), new THREE.MeshStandardMaterial({ color: 0xCFE3F0, transparent: true, opacity: .35, roughness: .1 }), 2.95 + .9, 1.7, -4.36, { noCast: true });
      add(g, new THREE.BoxGeometry(1.75, 1.55, .04), pane.material, 1.2 - .9, 1.7, -4.4, { noCast: true });
      high.pane = pane; high.paneClosedX = 1.2 + .9;
      // 문 + 빛 새는 틈
      box(g, .12, 2.15, 1.15, std(0x8C6C52), 6.44, 0, 1.0);
      const gap = box(g, .04, 2.1, .05, new THREE.MeshBasicMaterial({ color: 0xFFF0C0 }), 6.37, 0, 1.6, { noCast: true });
      const tape = box(g, .05, 2.12, .22, std(0xD6D0C2), 6.35, 0, 1.6); tape.visible = false;
      high.gap = gap; high.tape = tape;
      // 환풍기(왼쪽 벽)
      box(g, .14, .9, .9, std(0xC9CCD0), -6.43, 1.7, -1.0);
      const fan = new THREE.Group(); fan.position.set(-6.33, 2.15, -1.0); g.add(fan);
      for (let i = 0; i < 4; i++) { const pv = new THREE.Group(); pv.rotation.x = i * Math.PI / 2; add(pv, new THREE.BoxGeometry(.04, .34, .1), std(0x6B6F75), 0, .17, 0); fan.add(pv); }
      high.fan = fan;
      // 가구
      box(g, 2.4, .08, 1.0, std(0x5A3F2E, { roughness: .6 }), -2.6, .72, 2.6); [[-3.7, 2.2], [-1.5, 2.2], [-3.7, 3.0], [-1.5, 3.0]].forEach(([x, z]) => cyl(g, .04, .04, .72, 0x3F2B1F, x, 0, z));
      box(g, .5, .45, .5, std(0x7C93A6), -2.6, 0, 3.6);
      block(high, -3.9, 2.0, -1.3, 3.9);
      box(g, 2.6, .42, 1.0, std(0xEDE6D9), 3.0, 0, 3.7); box(g, 2.6, .85, .28, std(0xE2DACB), 3.0, 0, 4.2);
      block(high, 1.6, 3.1, 4.4, 4.5);
      cyl(g, .24, .2, .4, 0xB97A55, -5.6, 0, 3.9); add(g, new THREE.IcosahedronGeometry(.45, 1), std(0x6E9A63), -5.6, .85, 3.9);
      high.spawn = new THREE.Vector3(4.6, 0, 1.8); high.spawnYaw = 0.5;
      high.guide = new THREE.Vector3(.2, 0, 1.0);
      high.window = new THREE.Vector3(1.6, 0, -3.3);
      high.sealDoor = new THREE.Vector3(5.3, 0, 1.5);
      high.vent = new THREE.Vector3(-5.3, 0, -1.0);
      high.labels.push({ text: '창문', cls: 'obj', pos: new THREE.Vector3(1.2, 2.85, -4.3), id: 'win' });
      high.labels.push({ text: '문틈', cls: 'obj', pos: new THREE.Vector3(6.2, 2.6, 1.6), id: 'gap' });
      high.labels.push({ text: '환풍기', cls: 'obj', pos: new THREE.Vector3(-6.2, 2.9, -1.0), id: 'vent' });
    })();

    return S;
  }
  MB.world = { build };
})();
