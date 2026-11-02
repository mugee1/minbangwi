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

  // opts: { shirt, bottom, hat, scale, guide }
  function create(opts) {
    const o = Object.assign({ shirt: 0xF2B84B, bottom: 0x9A6B47, hat: 'none', scale: 1 }, opts || {});
    const root = new THREE.Group();
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ map: MB.tex.radial('rgba(0,0,0,.35)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; root.add(shadow);
    const body = new THREE.Group(); root.add(body);

    // 다리
    const legs = [];
    [-0.13, 0.13].forEach(x => {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.3, 0); body.add(pivot);
      mesh(G.leg, m(SKIN), pivot, 0, -0.13, 0);
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
      mesh(G.arm, m(SKIN), pivot, 0, -0.2, 0);
      mesh(G.hand, m(SKIN), pivot, 0, -0.34, 0);
      arms.push(pivot);
    });
    // 머리와 얼굴 (+z가 앞)
    const head = new THREE.Group(); head.position.y = 1.12; body.add(head);
    const skull = mesh(G.head, m(SKIN), head); skull.scale.set(1, .96, .98);
    mesh(G.eye, m(0x2B211B, { roughness: .3 }), head, -0.13, 0.0, 0.39);
    mesh(G.eye, m(0x2B211B, { roughness: .3 }), head, 0.13, 0.0, 0.39);
    const b1 = mesh(G.blush, new THREE.MeshBasicMaterial({ color: 0xF2A79A, transparent: true, opacity: .7 }), head, -0.22, -0.09, 0.355); b1.rotation.y = -0.5; b1.castShadow = false;
    const b2 = mesh(G.blush, new THREE.MeshBasicMaterial({ color: 0xF2A79A, transparent: true, opacity: .7 }), head, 0.22, -0.09, 0.355); b2.rotation.y = 0.5; b2.castShadow = false;
    mesh(new THREE.SphereGeometry(0.03, 10, 8), m(0xD9B49A), head, 0, -0.05, 0.41);
    // 마스크(코·입 가리기)
    const mask = mesh(new THREE.SphereGeometry(0.435, 24, 12, 0.67, 1.8, 1.5, 0.62), m(0xF7F7F4, { side: THREE.DoubleSide }), head, 0, 0, 0.0);
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
