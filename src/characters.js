// 둥근 머리의 치비 캐릭터 (몸통·팔·다리·얼굴·머리 장식·가방·마스크)
(function () {
  const cache = {};
  function m(color, extra) {
    const k = color + (extra ? JSON.stringify(extra) : '');
    if (!cache[k]) cache[k] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .78, metalness: 0 }, extra || {}));
    return cache[k];
  }
  function mesh(geo, mat, parent, x, y, z) { const o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; parent.add(o); return o; }

  const SKIN = 0xEDD8C3;
  const G = {
    head: new THREE.SphereGeometry(0.42, 32, 24),
    eye: new THREE.SphereGeometry(0.034, 12, 8),
    blush: new THREE.CircleGeometry(0.06, 16),
    torso: new THREE.CylinderGeometry(0.25, 0.33, 0.44, 24),
    sleeve: new THREE.CylinderGeometry(0.1, 0.11, 0.16, 12),
    skirt: new THREE.CylinderGeometry(0.33, 0.36, 0.14, 24),
    arm: new THREE.CylinderGeometry(0.065, 0.06, 0.26, 12),
    hand: new THREE.SphereGeometry(0.075, 12, 10),
    leg: new THREE.CylinderGeometry(0.085, 0.08, 0.26, 12),
    foot: new THREE.SphereGeometry(0.1, 14, 10),
    neck: new THREE.TorusGeometry(0.17, 0.035, 8, 24),
  };

  /* ---------- 동물 얼굴 ----------
     같은 둥근 머리·몸에 귀·주둥이·코·꼬리만 바꿔 끼워요. 매트한 플라스틱 질감, 털 표현 없음. */
  const PINK = 0xF4A9A8, INK = 0x3A2A22;
  const ANIMALS = {
    tiger:  { fur: 0xF7C548, muzzle: 0xFFF3D6, ear: 'round', earIn: PINK, nose: 0xE58A8A, tail: 'tiger', stripes: 0x6B4220 },
    bear:   { fur: 0xB98A5E, muzzle: 0xF0DCC0, ear: 'round', earIn: 0xE7B9A0, nose: INK, tail: 'ball' },
    cat:    { fur: 0xB9B4AD, muzzle: 0xFBF8F3, ear: 'pointy', earIn: PINK, nose: 0xE58A8A, tail: 'thin', muzzleSize: .8 },
    dog:    { fur: 0xF2E2C6, muzzle: 0xFFFAF0, ear: 'floppy', earColor: 0xA8774C, nose: INK, tail: 'short' },
    rabbit: { fur: 0xF6F2EC, muzzle: 0xFFFFFF, ear: 'long', earIn: PINK, nose: 0xE58A8A, tail: 'puff', muzzleSize: .75 },
    fox:    { fur: 0xE88B4C, muzzle: 0xFFF6EA, ear: 'pointy', earIn: 0xFFF6EA, earTip: INK, nose: INK, tail: 'bushy' },
    panda:  { fur: 0xF7F5F0, muzzle: 0xFFFFFF, ear: 'round', earColor: 0x2E2B2A, earIn: 0x2E2B2A, nose: INK, tail: 'ball', tailColor: 0x2E2B2A, patches: 0x2E2B2A },
  };
  const R = 0.42, Z = new THREE.Vector3(0, 0, 1);
  // 머리 표면 위(방향 dir)에 붙이고 바깥을 보게 돌려요
  function onHead(geo, mat, head, dir, lift) {
    const n = dir.clone().normalize(), o = mesh(geo, mat, head);
    o.position.copy(n).multiplyScalar(R + (lift || 0)); o.quaternion.setFromUnitVectors(Z, n); o.castShadow = false; return o;
  }
  function makeAnimal(kind, head, body) {
    const a = ANIMALS[kind]; if (!a) return;
    const fur = m(a.fur);
    // 주둥이 + 코 + 입
    const ms = a.muzzleSize || 1;
    const mz = mesh(new THREE.SphereGeometry(0.14 * ms, 20, 14), m(a.muzzle), head, 0, -0.11, 0.32); mz.scale.set(1.35, .85, .7); mz.castShadow = false;
    const nose = mesh(new THREE.SphereGeometry(0.035, 12, 8), m(a.nose, { roughness: .4 }), head, 0, -0.06, 0.41); nose.scale.set(1.3, .85, .8); nose.castShadow = false;
    [-1, 1].forEach(s => { const mo = mesh(new THREE.TorusGeometry(0.026, 0.007, 6, 12, Math.PI), m(INK), head, s * 0.026, -0.12, 0.415); mo.rotation.z = Math.PI; mo.castShadow = false; });
    // 판다 눈 무늬
    if (a.patches) [-1, 1].forEach(s => { const p = onHead(new THREE.CircleGeometry(0.075, 18), m(a.patches), head, new THREE.Vector3(s * .31, .02, .95), .003); p.scale.set(1, 1.3, 1); p.rotation.z += s * .5; });
    // 호랑이 줄무늬: 이마 3줄 + 양 볼 2줄씩
    if (a.stripes) {
      const sm = m(a.stripes), g = new THREE.BoxGeometry(0.026, 0.12, 0.012);
      [[0, .82, .58, 0], [-.11, .78, .62, .25], [.11, .78, .62, -.25]].forEach(([x, y, z, r]) => { const s = onHead(g, sm, head, new THREE.Vector3(x, y, z), .002); s.rotateZ(r); s.scale.y = x ? .75 : 1; });
      [-1, 1].forEach(sd => [.0, -.14].forEach((y, i) => { const s = onHead(g, sm, head, new THREE.Vector3(sd * .9, y, .45), .002); s.rotateZ(Math.PI / 2 + sd * (i ? -.2 : .2)); s.scale.y = .8; }));
      [-1, 1].forEach(sd => { const s = onHead(g, sm, head, new THREE.Vector3(sd * .25, .9, -.35), .002); s.rotateZ(sd * .4); });
    }
    // 귀
    const earMat = m(a.earColor || a.fur), inMat = m(a.earIn || PINK);
    [-1, 1].forEach(s => {
      const e = new THREE.Group(); head.add(e);
      if (a.ear === 'round') {
        e.position.set(s * 0.27, 0.31, -0.02); e.rotation.z = -s * 0.5;
        mesh(new THREE.SphereGeometry(0.12, 18, 12), earMat, e).scale.set(1, 1, .55);
        mesh(new THREE.SphereGeometry(0.07, 14, 10), inMat, e, 0, 0, 0.04).scale.set(1, 1, .4);
      } else if (a.ear === 'pointy') {
        e.position.set(s * 0.24, 0.35, -0.02); e.rotation.z = -s * 0.32;
        mesh(new THREE.ConeGeometry(0.12, 0.24, 4), earMat, e).rotation.y = Math.PI / 4;
        const ie = mesh(new THREE.ConeGeometry(0.065, 0.15, 4), inMat, e, 0, -0.02, 0.035); ie.rotation.y = Math.PI / 4; ie.scale.z = .5;
        if (a.earTip) mesh(new THREE.ConeGeometry(0.05, 0.08, 4), m(a.earTip), e, 0, 0.09, 0).rotation.y = Math.PI / 4;
      } else if (a.ear === 'floppy') {
        e.position.set(s * 0.38, 0.12, -0.02); e.rotation.z = s * 0.35;
        mesh(new THREE.SphereGeometry(0.11, 16, 12), earMat, e, 0, -0.1, 0).scale.set(.6, 1.45, .55);
      } else if (a.ear === 'long') {
        e.position.set(s * 0.13, 0.4, -0.02); e.rotation.z = -s * 0.12;
        mesh(new THREE.SphereGeometry(0.09, 16, 12), earMat, e, 0, 0.17, 0).scale.set(.75, 2.1, .55);
        mesh(new THREE.SphereGeometry(0.05, 12, 10), inMat, e, 0, 0.17, 0.035).scale.set(.75, 2.6, .3);
      }
    });
    // 꼬리(몸 뒤쪽, 몸과 함께 움직여요)
    const tm = m(a.tailColor || a.fur), tail = new THREE.Group(); tail.position.set(0, 0.38, -0.3); body.add(tail);
    if (a.tail === 'tiger' || a.tail === 'thin') {
      // 위로 말려 올라가는 꼬리: 짧은 마디를 이어 붙여요(호랑이는 마디마다 줄무늬)
      const seg = new THREE.CylinderGeometry(0.045, 0.045, 0.1, 10);
      tail.position.y = 0.3;
      let y = 0, z = 0, ang = -1.75; // ang: 마디가 기운 각도(-π/2 = 뒤로 수평, 0 = 위로)
      for (let i = 0; i < 6; i++) {
        const c = mesh(seg, a.tail === 'tiger' && i % 2 ? m(a.stripes) : tm, tail, 0, y, z); c.rotation.x = ang;
        y += Math.cos(ang) * 0.085; z += Math.sin(ang) * 0.085; ang += 0.33;
      }
      mesh(new THREE.SphereGeometry(0.048, 10, 8), a.tail === 'tiger' ? m(a.stripes) : tm, tail, 0, y, z);
    } else if (a.tail === 'bushy') {
      const b = mesh(new THREE.SphereGeometry(0.13, 16, 12), tm, tail, 0, 0.08, -0.1); b.scale.set(.8, 1.5, .8); b.rotation.x = -0.7;
      mesh(new THREE.SphereGeometry(0.07, 12, 10), m(0xFFF6EA), tail, 0, 0.24, -0.2);
    } else if (a.tail === 'short') {
      const b = mesh(new THREE.SphereGeometry(0.05, 12, 10), tm, tail, 0, 0.06, -0.03); b.scale.set(1, 2, 1); b.rotation.x = -0.6;
    } else {
      mesh(new THREE.SphereGeometry(a.tail === 'puff' ? 0.08 : 0.06, 12, 10), tm, tail);
    }
    return fur;
  }
  // 사용자용 크로스백(어깨끈 + 옆구리 가방 + M 로고)
  let logoTex = null;
  function crossBag(body) {
    if (!logoTex) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#FFD43B'; x.beginPath(); x.arc(64, 64, 60, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2A2620'; x.font = '800 84px Pretendard, "Pretendard Variable", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('M', 64, 70);
      logoTex = new THREE.CanvasTexture(c); logoTex.colorSpace = THREE.SRGBColorSpace;
    }
    // 왼쪽 어깨 → 오른쪽 옆구리로 비스듬히 몸을 감는 끈
    const strap = mesh(new THREE.TorusGeometry(0.31, 0.022, 8, 40), m(0x3E6FA8), body, 0, 0.6, 0);
    strap.quaternion.setFromUnitVectors(Z, new THREE.Vector3(Math.sin(0.75), Math.cos(0.75), 0));
    const pouch = new THREE.Group(); pouch.position.set(0.24, 0.44, 0.2); pouch.rotation.y = 0.55; body.add(pouch);
    mesh(new THREE.BoxGeometry(0.24, 0.18, 0.09), m(0x4A80C0), pouch);
    mesh(new THREE.BoxGeometry(0.25, 0.08, 0.1), m(0x3E6FA8), pouch, 0, 0.06, 0.003);
    const lg = mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ map: logoTex, toneMapped: false }), pouch, 0, -0.02, 0.047); lg.castShadow = false;
  }

  function makeHat(type, root) {
    const hat = new THREE.Group(); hat.position.y = 1.12; root.add(hat);
    if (type === 'helmet') {
      const dome = mesh(new THREE.SphereGeometry(0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m(0xF4C542, { roughness: .45 }), hat, 0, 0.08, 0);
      dome.scale.set(1, .9, 1);
      mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.04, 32), m(0xE0AE2A, { roughness: .5 }), hat, 0, 0.08, 0.04);
      mesh(new THREE.BoxGeometry(0.06, 0.04, 0.8), m(0xE9B832), hat, 0, 0.45, 0).rotation.x = 0;
      mesh(new THREE.TorusGeometry(0.2, 0.028, 8, 20, Math.PI), m(0xE0AE2A), hat, 0, 0.36, 0).rotation.y = Math.PI / 2;
    } else if (type === 'hood') {
      // 방재 두건: 푹신한 방석 모양
      const h = mesh(new THREE.SphereGeometry(0.5, 28, 20, 0, Math.PI * 2, 0, Math.PI * .62), m(0xF2994A), hat, 0, -0.02, -0.04);
      h.scale.set(1.04, 1.05, 1.08);
      const rim = mesh(new THREE.TorusGeometry(0.4, 0.07, 10, 28), m(0xE5823A), hat, 0, -0.08, 0.06); rim.rotation.x = -0.25;
      for (let i = 0; i < 3; i++) { const q = mesh(new THREE.TorusGeometry(0.47 - i * 0.02, 0.012, 6, 30, Math.PI), m(0xD9712C), hat, 0, 0.0 + i * 0.15, -0.04); q.rotation.y = Math.PI / 2; q.scale.set(1, 1.05 - i * 0.18, 1); }
      mesh(new THREE.BoxGeometry(0.5, 0.3, 0.12), m(0xF2994A), hat, 0, -0.5, -0.32);
    } else if (type === 'beanie') {
      const b = mesh(new THREE.SphereGeometry(0.44, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), m(0x6E8FB5), hat, 0, 0.05, 0); b.scale.set(1, 1.02, 1);
      mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 28), m(0x5C7BA0), hat, 0, 0.07, 0);
      mesh(new THREE.SphereGeometry(0.11, 14, 10), m(0xDCE6F1), hat, 0, 0.52, 0);
    } else if (type === 'cap') {
      // 안내원 모자
      const c = mesh(new THREE.SphereGeometry(0.44, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), m(0x2F4C7A), hat, 0, 0.06, 0); c.scale.set(1, .7, 1);
      const bill = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24, 1, false, -Math.PI / 2, Math.PI), m(0x243C62), hat, 0, 0.07, 0.3); bill.scale.set(1, 1, .9);
      mesh(new THREE.CircleGeometry(0.07, 16), m(0xF2994A), hat, 0, 0.24, 0.39).rotation.x = -0.5;
    }
    return hat;
  }

  // opts: { shirt, bottom, hat, scale, guide, animal, crossBag, width }
  function create(opts) {
    const o = Object.assign({ shirt: 0xF2B84B, bottom: 0x9A6B47, hat: 'none', scale: 1 }, opts || {});
    const root = new THREE.Group();
    const A = ANIMALS[o.animal], SK = A ? A.fur : SKIN; // 동물이면 피부 대신 털 색
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ map: MB.tex.radial('rgba(0,0,0,.35)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; root.add(shadow);
    const body = new THREE.Group(); root.add(body);

    // 다리
    const legs = [];
    [-0.13, 0.13].forEach(x => {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.3, 0); body.add(pivot);
      mesh(G.leg, m(SK), pivot, 0, -0.13, 0);
      mesh(G.foot, m(0xF8F4EE), pivot, 0, -0.27, 0.03).scale.set(1, .7, 1.25);
      legs.push(pivot);
    });
    // 몸통
    mesh(G.skirt, m(o.bottom), body, 0, 0.34, 0);
    mesh(G.torso, m(o.shirt), body, 0, 0.58, 0);
    mesh(G.neck, m(o.trim || 0xD69A2E), body, 0, 0.8, 0).rotation.x = Math.PI / 2;
    if (o.guide) {
      // 안내원 조끼 반사띠
      mesh(new THREE.CylinderGeometry(0.262, 0.3, 0.06, 24), m(0xF2994A), body, 0, 0.6, 0);
      mesh(new THREE.CylinderGeometry(0.255, 0.28, 0.04, 24), m(0xEEEEEE, { roughness: .3 }), body, 0, 0.66, 0);
    }
    // 팔
    const arms = [];
    [-1, 1].forEach(s => {
      const pivot = new THREE.Group(); pivot.position.set(s * 0.3, 0.74, 0); pivot.rotation.z = s * 0.38; body.add(pivot);
      mesh(G.sleeve, m(o.shirt), pivot, 0, -0.04, 0);
      mesh(G.arm, m(SK), pivot, 0, -0.2, 0);
      mesh(G.hand, m(SK), pivot, 0, -0.34, 0);
      arms.push(pivot);
    });
    // 머리와 얼굴 (+z가 앞)
    const head = new THREE.Group(); head.position.y = 1.12; body.add(head);
    const skull = mesh(G.head, m(SK), head); skull.scale.set(1, .96, .98);
    mesh(G.eye, m(0x2B211B, { roughness: .3 }), head, -0.13, 0.0, 0.39);
    mesh(G.eye, m(0x2B211B, { roughness: .3 }), head, 0.13, 0.0, 0.39);
    const b1 = mesh(G.blush, new THREE.MeshBasicMaterial({ color: 0xF2A79A, transparent: true, opacity: .7 }), head, -0.22, -0.09, 0.355); b1.rotation.y = -0.5; b1.castShadow = false;
    const b2 = mesh(G.blush, new THREE.MeshBasicMaterial({ color: 0xF2A79A, transparent: true, opacity: .7 }), head, 0.22, -0.09, 0.355); b2.rotation.y = 0.5; b2.castShadow = false;
    if (A) makeAnimal(o.animal, head, body); else mesh(new THREE.SphereGeometry(0.03, 10, 8), m(0xD9B49A), head, 0, -0.05, 0.41);
    if (o.crossBag) crossBag(body);
    if (o.width) body.scale.set(o.width, 1, o.width);
    // 마스크(코·입 가리기)
    const mask = mesh(new THREE.SphereGeometry(A ? 0.47 : 0.435, 24, 12, 0.67, 1.8, 1.5, 0.62), m(0xF7F7F4, { side: THREE.DoubleSide }), head, 0, 0, 0.0);
    mask.visible = false;
    // 머리 장식
    body.updateMatrixWorld();
    const hatG = makeHat(o.hat, body);
    // 비상 가방(등)
    const bag = new THREE.Group(); bag.position.set(0, 0.6, -0.33); body.add(bag);
    mesh(new THREE.BoxGeometry(0.44, 0.48, 0.22), m(0x5E7050), bag);
    mesh(new THREE.BoxGeometry(0.3, 0.18, 0.06), m(0x6F8460), bag, 0, -0.08, -0.13);
    mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), m(0xF2994A), bag, 0, 0.16, -0.12);
    bag.visible = false;

    root.scale.setScalar(o.scale);
    root.userData = { body, legs, arms, head, mask, bag, hat: hatG, walk: 0, sit: 0, crouch: 0, wave: 0 };
    return root;
  }

  // 매 프레임 애니메이션: speed(0~1), sit(0~1), crouch(0~1)
  function animate(ch, dt, moving, t) {
    const u = ch.userData;
    u.walk += dt * (moving ? 10 : 0);
    const sw = moving ? Math.sin(u.walk) * 0.7 : 0;
    u.legs[0].rotation.x += ((u.sit ? -1.4 : sw) - u.legs[0].rotation.x) * Math.min(1, dt * 12);
    u.legs[1].rotation.x += ((u.sit ? -1.4 : -sw) - u.legs[1].rotation.x) * Math.min(1, dt * 12);
    u.arms[0].rotation.x += ((u.sit ? -0.5 : -sw * .8) - u.arms[0].rotation.x) * Math.min(1, dt * 12);
    u.arms[1].rotation.x += ((u.sit ? -0.5 : sw * .8) - u.arms[1].rotation.x) * Math.min(1, dt * 12);
    const bob = moving ? Math.abs(Math.sin(u.walk)) * 0.05 : Math.sin(t * 2 + (u.phase || 0)) * 0.012;
    const targetY = (u.sit ? -0.22 : 0) - u.crouch * 0.22 + bob;
    u.body.position.y += (targetY - u.body.position.y) * Math.min(1, dt * 12);
    u.body.rotation.x += ((u.crouch ? 0.35 : 0) - u.body.rotation.x) * Math.min(1, dt * 10);
    u.head.rotation.z = moving ? Math.sin(u.walk * .5) * 0.04 : Math.sin(t * .8 + (u.phase || 0)) * 0.04;
    if (u.hat) { u.hat.position.y = 1.12 + 0; u.hat.rotation.z = u.head.rotation.z; }
  }
  MB.characters = { create, animate };
})();
