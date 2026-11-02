// 캔버스로 직접 그리는 재질(나무 바닥, 타일, 콘크리트, 벽지, 하늘, 표지판)
(function () {
  const T = {};
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function tex(c, rx, ry) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx || 1, ry || 1);
    t.anisotropy = 4;
    return t;
  }
  // 간단한 결정적 난수
  let seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * k)), g = Math.min(255, Math.max(0, ((n >> 8) & 255) * k)), b = Math.min(255, Math.max(0, (n & 255) * k));
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  // 나무 마루: 아파트 강마루 느낌(좁고 긴 밝은 오크 판자, 옅은 결, 가는 이음매)
  T.wood = function (base, rx, ry) {
    const [c, g] = canvas(1024, 1024);
    const rows = 14, h = 1024 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 600;
      while (x < 1024) {
        const w = 520 + rnd() * 380, k = 0.94 + rnd() * 0.12;
        const y0 = r * h;
        // 판자 바탕: 살짝 그라데이션
        const gr = g.createLinearGradient(x, y0, x + w, y0 + h);
        gr.addColorStop(0, shade(base, k * 1.02)); gr.addColorStop(.5, shade(base, k)); gr.addColorStop(1, shade(base, k * 0.97));
        g.fillStyle = gr; g.fillRect(x, y0, w, h);
        // 결: 가늘고 옅은 선
        for (let i = 0; i < 9; i++) {
          const yy = y0 + 4 + rnd() * (h - 8);
          g.strokeStyle = 'rgba(90,55,25,' + (0.05 + rnd() * 0.07) + ')'; g.lineWidth = 0.6 + rnd() * 0.9;
          g.beginPath(); g.moveTo(x + 2, yy);
          g.bezierCurveTo(x + w * .3, yy + rnd() * 3 - 1.5, x + w * .7, yy + rnd() * 3 - 1.5, x + w - 2, yy + rnd() * 2 - 1); g.stroke();
        }
        // 옹이 가끔
        if (rnd() > .82) { const kx = x + 60 + rnd() * (w - 120), ky = y0 + h * (.3 + rnd() * .4); g.fillStyle = 'rgba(110,70,35,.18)'; g.beginPath(); g.ellipse(kx, ky, 9 + rnd() * 8, 3 + rnd() * 2, 0, 0, 7); g.fill(); }
        // 판자 끝 이음매
        g.fillStyle = 'rgba(70,45,25,.35)'; g.fillRect(x, y0, 1.5, h);
        x += w;
      }
      // 줄 이음매 + 위쪽 하이라이트
      g.fillStyle = 'rgba(70,45,25,.32)'; g.fillRect(0, r * h, 1024, 1.5);
      g.fillStyle = 'rgba(255,245,230,.12)'; g.fillRect(0, r * h + 1.5, 1024, 1.5);
    }
    return tex(c, rx, ry);
  };
  // 타일: 줄눈 있는 정사각 타일
  T.tile = function (base, grout, n, rx, ry) {
    const [c, g] = canvas(512, 512); const s = 512 / n;
    g.fillStyle = grout; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = shade(base, 0.94 + rnd() * 0.1); g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
    return tex(c, rx, ry);
  };
  // 콘크리트: 얼룩과 점
  T.concrete = function (base, rx, ry) {
    const [c, g] = canvas(512, 512);
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(0,0,0,' + (rnd() * 0.05) + ')'; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 20 + rnd() * 70, 0, 7); g.fill(); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.09)'; g.fillRect(rnd() * 512, rnd() * 512, 1.5, 1.5); }
    return tex(c, rx, ry);
  };
  // 벽지: 잔잔한 세로 결
  T.wall = function (base, rx, ry) {
    const [c, g] = canvas(256, 256);
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(0,0,0,' + (0.015 + rnd() * 0.02) + ')'; g.fillRect(x, 0, 3, 256); }
    for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(rnd() * 256, rnd() * 256, 1, 1); }
    return tex(c, rx, ry);
  };
  // 창밖 풍경: 하늘 + 산 + 아파트 단지
  T.sky = function (mood) {
    const [c, g] = canvas(1024, 512);
    const sky = g.createLinearGradient(0, 0, 0, 512);
    if (mood === 'dusk') { sky.addColorStop(0, '#7E8FB0'); sky.addColorStop(.6, '#E2B9A0'); sky.addColorStop(1, '#F2D2B4'); }
    else { sky.addColorStop(0, '#9DBAD8'); sky.addColorStop(1, '#E4EDF3'); }
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
    // 먼 산
    g.fillStyle = mood === 'dusk' ? '#8F8FA6' : '#9FB0BE';
    g.beginPath(); g.moveTo(0, 330); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 300 - Math.sin(x * .006) * 60 - Math.sin(x * .021) * 18); g.lineTo(1024, 512); g.lineTo(0, 512); g.fill();
    g.fillStyle = mood === 'dusk' ? '#6F7B86' : '#7F978B';
    g.beginPath(); g.moveTo(0, 380); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 360 - Math.sin(x * .01 + 1) * 30); g.lineTo(1024, 512); g.lineTo(0, 512); g.fill();
    // 아파트 단지
    for (let i = 0; i < 14; i++) {
      const w = 50 + rnd() * 40, h = 120 + rnd() * 140, x = i * 76 + rnd() * 20 - 20, y = 512 - h;
      g.fillStyle = mood === 'dusk' ? '#C9B8A8' : '#D9DDE0'; g.fillRect(x, y, w, h);
      g.fillStyle = mood === 'dusk' ? '#B3A192' : '#BEC5CB'; g.fillRect(x + w - 8, y, 8, h);
      for (let yy = y + 10; yy < 500; yy += 14) for (let xx = x + 6; xx < x + w - 12; xx += 10) { g.fillStyle = rnd() > .82 ? (mood === 'dusk' ? '#F4D58D' : '#9AB0C4') : (mood === 'dusk' ? '#A39384' : '#AEB8C1'); g.fillRect(xx, yy, 6, 7); }
    }
    return tex(c);
  };
  // 글자 표지판
  T.sign = function (lines, bg, fg, w, h, opts) {
    const [c, g] = canvas(w || 512, h || 160); w = c.width; h = c.height;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (opts && opts.border) { g.strokeStyle = opts.border; g.lineWidth = h * .05; g.strokeRect(h * .05, h * .05, w - h * .1, h - h * .1); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((l, i) => {
      const main = i === 0;
      g.font = (main ? '700 ' : '500 ') + Math.round(h * (n === 1 ? .5 : main ? .4 : .17)) + 'px "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif';
      g.fillText(l, w / 2, n === 1 ? h * .53 : main ? h * .4 : h * .78);
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  // 대피소 표지(빨간 바탕 · 주황 원 · 파란 삼각형)
  T.shelterSign = function () {
    const [c, g] = canvas(512, 640);
    g.fillStyle = '#C8202A'; g.fillRect(0, 0, 512, 640);
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(256, 210, 150, 0, 7); g.fill();
    g.fillStyle = '#F08A24'; g.beginPath(); g.arc(256, 210, 132, 0, 7); g.fill();
    g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(256, 210, 92, 0, 7); g.fill();
    g.fillStyle = '#1C5FAE'; g.beginPath(); g.moveTo(256, 135); g.lineTo(330, 262); g.lineTo(182, 262); g.closePath(); g.fill();
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.font = '700 104px "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif'; g.fillText('대피소', 256, 470);
    g.font = '700 46px "Pretendard Variable",Pretendard,sans-serif'; g.fillText('SHELTER', 256, 548);
    g.fillRect(40, 580, 432, 3);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  // 비상구 픽토그램(초록)
  T.exitSign = function (text) {
    const [c, g] = canvas(512, 180);
    g.fillStyle = '#1F8A4C'; g.fillRect(0, 0, 512, 180);
    g.fillStyle = '#fff';
    g.fillRect(28, 30, 90, 120); g.fillStyle = '#1F8A4C'; g.fillRect(40, 42, 66, 108);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(150, 52, 14, 0, 7); g.fill();
    g.lineWidth = 12; g.strokeStyle = '#fff'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(148, 72); g.lineTo(138, 108); g.lineTo(158, 140); g.moveTo(138, 108); g.lineTo(118, 140); g.moveTo(146, 80); g.lineTo(170, 96); g.moveTo(144, 80); g.lineTo(122, 92); g.stroke();
    g.font = '700 64px "Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 340, 94);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  // 원형 그림자/빛 텍스처
  T.radial = function (inner, outer) {
    const [c, g] = canvas(128, 128);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); return t;
  };
  MB.tex = T;
})();
