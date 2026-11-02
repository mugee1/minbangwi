// 소리: 사이렌(파상음)·안내 차임은 Web Audio로 합성, 음성 안내는 브라우저 내장 음성(Web Speech API)
(function () {
  let AC = null, master = null, siren = null, muted = false;
  function init() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 1; master.connect(AC.destination); } catch (e) { AC = null; }
  }
  function sirenStart() {
    if (!AC || siren) return;
    const o = AC.createOscillator(); o.type = 'sawtooth';
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
    const g = AC.createGain(); g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(master); o.start();
    g.gain.linearRampToValueAtTime(0.06, AC.currentTime + 1.2);
    siren = { o, g, t0: AC.currentTime };
  }
  function sirenLevel(v) { if (siren) siren.g.gain.linearRampToValueAtTime(v, AC.currentTime + 1.5); }
  function sirenStop() { if (!siren) return; const s = siren; siren = null; s.g.gain.linearRampToValueAtTime(0, AC.currentTime + 2); setTimeout(() => { try { s.o.stop(); } catch (e) {} }, 2200); }
  // 공습경보 파상음: 5초 상승 → 3초 하강을 반복(8초 주기). 2초 상승·2초 하강은 재난 경보음이라 다름
  const RISE = 5, FALL = 3, LOW = 420, HIGH = 1100;
  function tick() {
    if (!siren || !AC) return;
    const ph = (AC.currentTime - siren.t0) % (RISE + FALL);
    const k = ph < RISE ? ph / RISE : 1 - (ph - RISE) / FALL;
    siren.o.frequency.setTargetAtTime(LOW + (HIGH - LOW) * k, AC.currentTime, 0.03);
  }
  function chime() {
    if (!AC) return; const t = AC.currentTime;
    [[659, 0], [880, .28], [988, .56]].forEach(([fr, dt]) => { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = fr; const g = AC.createGain(); g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(.12, t + dt + .03); g.gain.exponentialRampToValueAtTime(.0001, t + dt + .9); o.connect(g); g.connect(master); o.start(t + dt); o.stop(t + dt + 1); });
  }
  // 화생방경보 방송 앞 경고음: 높낮이가 번갈아 나는 짧은 음 6번(뚜-띠-뚜-띠…).
  // 화생방경보는 사이렌 없이 음성방송으로 알리므로 사이렌이 아니라, 해제 차임(올라가는 3음)과 확실히 다른 소리
  function warnTone() {
    if (!AC) return; const t = AC.currentTime;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800; f.connect(master);
    for (let i = 0; i < 6; i++) {
      const dt = i * 0.26, o = AC.createOscillator(), g = AC.createGain();
      o.type = 'square'; o.frequency.value = i % 2 ? 554 : 740;
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(.05, t + dt + .02); g.gain.setValueAtTime(.05, t + dt + .17); g.gain.linearRampToValueAtTime(0, t + dt + .21);
      o.connect(g); g.connect(f); o.start(t + dt); o.stop(t + dt + .23);
    }
  }
  function click() {
    if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = 'triangle'; o.frequency.value = 520; g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t + .15); o.connect(g); g.connect(master); o.start(t); o.stop(t + .16);
  }
  function speak(text) {
    if (muted || !('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 1; const v = speechSynthesis.getVoices().find(v => /ko/i.test(v.lang)); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {}
  }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 1; if (m && 'speechSynthesis' in window) speechSynthesis.cancel(); }
  MB.audio = { init, sirenStart, sirenLevel, sirenStop, tick, chime, warnTone, click, speak, setMuted, get muted() { return muted; } };
})();
