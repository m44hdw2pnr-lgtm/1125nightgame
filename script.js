const HAZARDS = [
  {
    title: "낙하물 위험",
    desc: "위에서 물체가 떨어질 수 있습니다. 바가 중앙 안전 위치에 들어오면 터치!",
    equipId: "equipHelmet",
    equipLabel: "안전모",
    success: "PERFECT! 안전모 착용 완료!"
  },
  {
    title: "발에 물건 떨어짐",
    desc: "발을 보호해야 합니다. 중앙 안전 위치에 맞춰 안전화를 착용하세요.",
    equipId: "equipShoes",
    equipLabel: "안전화",
    success: "GOOD! 안전화 착용 완료!"
  },
  {
    title: "추락 위험",
    desc: "고소 작업 구간입니다. 안전대가 필요한 순간에 맞춰 터치하세요.",
    equipId: "equipHarness",
    equipLabel: "안전대",
    success: "NICE! 안전대 착용 완료!"
  },
  {
    title: "감전 위험",
    desc: "전기 작업 전 보호 준비! 중앙에 맞춰 절연 장갑을 착용하세요.",
    equipId: "equipGloves",
    equipLabel: "절연 장갑",
    success: "GREAT! 절연 장갑 착용 완료!"
  },
  {
    title: "눈 비산물 위험",
    desc: "비산물이 눈으로 튈 수 있습니다. 정확한 타이밍으로 보안경을 착용하세요.",
    equipId: "equipGlasses",
    equipLabel: "보안경",
    success: "삐싱! 보안경 착용 완료!"
  }
];

const SPEEDS = [0.37, 0.44, 0.52, 0.61, 0.72]; // progress per second, perfect at 1.0
const LOCAL_KEY = "she_timing_local_scores_v1";
const LOCAL_BEST_KEY = "she_timing_local_best_v1";
const screens = {
  intro: document.getElementById("screenIntro"),
  game: document.getElementById("screenGame"),
  result: document.getElementById("screenResult")
};
const els = {
  nickname: document.getElementById("nickname"),
  startBtn: document.getElementById("startBtn"),
  showRankBtn: document.getElementById("showRankBtn"),
  modeStatus: document.getElementById("modeStatus"),
  roundCounter: document.getElementById("roundCounter"),
  hazardTitle: document.getElementById("hazardTitle"),
  hazardDesc: document.getElementById("hazardDesc"),
  totalScore: document.getElementById("totalScore"),
  warningBanner: document.getElementById("warningBanner"),
  leftBar: document.getElementById("leftBar"),
  rightBar: document.getElementById("rightBar"),
  tapBtn: document.getElementById("tapBtn"),
  timingCard: document.getElementById("timingCard"),
  roundFeedback: document.getElementById("roundFeedback"),
  nextWrap: document.getElementById("nextWrap"),
  nextBtn: document.getElementById("nextBtn"),
  equipTags: document.getElementById("equipTags"),
  finalScore: document.getElementById("finalScore"),
  resultCopy: document.getElementById("resultCopy"),
  retryBtn: document.getElementById("retryBtn"),
  resultRankBtn: document.getElementById("resultRankBtn"),
  refreshRankBtn: document.getElementById("refreshRankBtn"),
  rankList: document.getElementById("rankList"),
  rankStatus: document.getElementById("rankStatus")
};

let state = {
  round: 0,
  total: 0,
  roundScores: [],
  nickname: "",
  running: false,
  progress: 0,
  startTime: 0,
  lastFrame: 0,
  rafId: 0,
  canTap: false,
  online: false,
  auth: null,
  db: null,
  uid: null,
  localBest: null,
  revealedEquip: []
};

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
}

function fmt(num) {
  return Number(num).toFixed(3);
}

function sanitizeNickname(raw) {
  return (raw || "").replace(/\s+/g, " ").trim().slice(0, 12);
}

function resetCharacter() {
  state.revealedEquip = [];
  HAZARDS.forEach(h => {
    document.getElementById(h.equipId).classList.add("hidden-equip");
  });
  renderEquipTags();
}

function revealEquip(index) {
  const hazard = HAZARDS[index];
  const node = document.getElementById(hazard.equipId);
  node.classList.remove("hidden-equip");
  if (!state.revealedEquip.includes(hazard.equipLabel)) {
    state.revealedEquip.push(hazard.equipLabel);
  }
  renderEquipTags();
}

function renderEquipTags() {
  if (!state.revealedEquip.length) {
    els.equipTags.innerHTML = '<span class="tag">보호구를 하나씩 착용해보세요</span>';
    return;
  }
  els.equipTags.innerHTML = state.revealedEquip.map(tag => `<span class="tag">${tag}</span>`).join("");
}

function renderLane(progress) {
  const clamped = Math.min(progress, 1);
  const widthPercent = clamped * 50;
  els.leftBar.style.width = `${widthPercent}%`;
  els.rightBar.style.width = `${widthPercent}%`;
}

function updateRoundUI() {
  const h = HAZARDS[state.round];
  els.roundCounter.textContent = `ROUND ${state.round + 1} / 5`;
  els.hazardTitle.textContent = h.title;
  els.hazardDesc.textContent = h.desc;
  els.warningBanner.textContent = `⚠️ 띠용 띠용! ${h.title} 경고!`;
  els.totalScore.textContent = fmt(state.total);
  els.roundFeedback.textContent = "준비되면 바가 자동으로 움직입니다.";
  els.nextWrap.classList.add("hidden");
}

function startRun() {
  state.round = 0;
  state.total = 0;
  state.roundScores = [];
  state.nickname = sanitizeNickname(els.nickname.value) || `참가자${Math.floor(Math.random() * 900 + 100)}`;
  els.nickname.value = state.nickname;
  els.totalScore.textContent = fmt(0);
  resetCharacter();
  showScreen("game");
  updateRoundUI();
  scheduleRoundStart();
}

function scheduleRoundStart() {
  state.canTap = false;
  els.tapBtn.disabled = true;
  renderLane(0);
  state.progress = 0;
  state.startTime = 0;
  state.lastFrame = 0;
  setTimeout(() => {
    state.canTap = true;
    els.tapBtn.disabled = false;
    state.running = true;
    state.rafId = requestAnimationFrame(tick);
    els.roundFeedback.textContent = "중앙 안전 위치에 들어오면 터치하세요!";
  }, 750);
}

function tick(ts) {
  if (!state.running) return;
  if (!state.startTime) {
    state.startTime = ts;
    state.lastFrame = ts;
  }
  const dt = (ts - state.lastFrame) / 1000;
  state.lastFrame = ts;
  const speed = SPEEDS[state.round] || SPEEDS[SPEEDS.length - 1];
  state.progress += dt * speed;
  renderLane(state.progress);
  if (state.progress >= 1.35) {
    finishRound();
    return;
  }
  state.rafId = requestAnimationFrame(tick);
}

function computeScore(progress) {
  const distance = Math.abs(1 - progress);
  const score = Math.max(0, 100 - distance * 250);
  return Number(score.toFixed(3));
}

function finishRound() {
  if (!state.running && !state.canTap) return;
  state.running = false;
  state.canTap = false;
  cancelAnimationFrame(state.rafId);
  els.tapBtn.disabled = true;

  const currentProgress = state.progress;
  const score = computeScore(currentProgress);
  state.roundScores.push(score);
  state.total = Number((state.total + score).toFixed(3));
  revealEquip(state.round);
  els.totalScore.textContent = fmt(state.total);

  const perfectDistance = Math.abs(1 - currentProgress);
  const evaluation = perfectDistance <= 0.02 ? "완벽해요!" : perfectDistance <= 0.06 ? "아주 좋아요!" : perfectDistance <= 0.12 ? "좋아요!" : "다음엔 더 정확하게!";
  const baseMessage = HAZARDS[state.round].success;
  els.roundFeedback.innerHTML = `${evaluation} <strong>${baseMessage}</strong><br>이번 라운드 점수: <strong>${fmt(score)}</strong>점`;

  if (state.round < HAZARDS.length - 1) {
    els.nextWrap.classList.remove("hidden");
  } else {
    endRun();
  }
}

async function endRun() {
  els.roundFeedback.innerHTML += `<br><br><strong>최종 합산 점수: ${fmt(state.total)}</strong>`;
  els.finalScore.textContent = fmt(state.total);
  els.resultCopy.textContent = "모두의 안전을 지켜주셔서 감사합니다";
  try {
    await saveScore();
  } catch (error) {
    console.error(error);
  }
  await loadRanking();
  setTimeout(() => showScreen("result"), 1400);
}

function nextRound() {
  state.round += 1;
  updateRoundUI();
  scheduleRoundStart();
}

function installTapArea() {
  const tapHandler = () => {
    if (!state.canTap) return;
    finishRound();
  };
  els.tapBtn.addEventListener("click", tapHandler);
  els.timingCard.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    tapHandler();
  });
}

async function initFirebase() {
  const cfg = window.FIREBASE_CONFIG || {};
  const ready = cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId;
  if (!ready) {
    state.online = false;
    els.modeStatus.textContent = "체험 모드: Firebase 설정 전이라 현재 기기에서만 점수를 확인합니다.";
    els.rankStatus.textContent = "체험 모드 랭킹을 표시합니다.";
    await loadRanking();
    return;
  }
  try {
    const [{ initializeApp }, { getAuth, signInAnonymously }, { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, serverTimestamp }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')
    ]);
    state.firebaseFns = { doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, serverTimestamp };
    const app = initializeApp(cfg);
    state.auth = getAuth(app);
    state.db = getFirestore(app);
    await signInAnonymously(state.auth);
    state.uid = state.auth.currentUser?.uid || null;
    state.online = Boolean(state.uid);
    els.modeStatus.textContent = state.online
      ? "✅ 온라인 랭킹 연결됨 · 여러 명이 같은 랭킹을 볼 수 있습니다."
      : "체험 모드로 전환되었습니다.";
    els.rankStatus.textContent = state.online ? "온라인 랭킹을 불러오는 중입니다." : "체험 모드 랭킹을 표시합니다.";
    await loadRanking();
  } catch (error) {
    console.error(error);
    state.online = false;
    els.modeStatus.textContent = "체험 모드: Firebase 연결에 실패하여 현재 기기 랭킹으로 전환합니다.";
    els.rankStatus.textContent = "체험 모드 랭킹을 표시합니다.";
    await loadRanking();
  }
}

function getLocalScores() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalScores(scores) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(scores));
}

async function saveScore() {
  const payload = {
    nickname: state.nickname,
    score: Number(fmt(state.total)),
    roundScores: state.roundScores.map(v => Number(fmt(v)))
  };

  if (!state.online || !state.db || !state.uid) {
    const scores = getLocalScores();
    const idx = scores.findIndex(item => item.key === LOCAL_BEST_KEY);
    const existingBest = Number(localStorage.getItem(LOCAL_BEST_KEY) || '0');
    if (payload.score > existingBest) {
      localStorage.setItem(LOCAL_BEST_KEY, String(payload.score));
      const item = {
        key: LOCAL_BEST_KEY,
        nickname: payload.nickname,
        score: payload.score,
        updatedAt: new Date().toISOString()
      };
      if (idx >= 0) scores[idx] = item;
      else scores.push(item);
      setLocalScores(scores);
    }
    return;
  }

  const { doc, getDoc, setDoc, serverTimestamp } = state.firebaseFns;
  const ref = doc(state.db, 'scores', state.uid);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : null;
  if (!prev || payload.score > Number(prev.score || 0)) {
    await setDoc(ref, {
      nickname: payload.nickname,
      score: payload.score,
      roundScores: payload.roundScores,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

async function loadRanking() {
  els.rankList.innerHTML = '';
  if (!state.online || !state.db) {
    const scores = getLocalScores().sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 10);
    if (!scores.length) {
      els.rankStatus.textContent = "아직 기록이 없습니다. 첫 번째 도전자가 되어보세요!";
      return;
    }
    els.rankStatus.textContent = "체험 모드 랭킹입니다. 온라인 공유를 원하면 Firebase를 연결하세요.";
    renderRanking(scores.map(item => ({ nickname: item.nickname, score: item.score, updatedAt: item.updatedAt })));
    return;
  }

  try {
    const { collection, getDocs, query, orderBy, limit } = state.firebaseFns;
    const q = query(collection(state.db, 'scores'), orderBy('score', 'desc'), limit(10));
    const snap = await getDocs(q);
    const rows = snap.docs.map(doc => doc.data());
    if (!rows.length) {
      els.rankStatus.textContent = "아직 등록된 점수가 없습니다. 첫 플레이어가 되어보세요!";
      return;
    }
    els.rankStatus.textContent = "실시간 온라인 랭킹입니다.";
    renderRanking(rows);
  } catch (error) {
    console.error(error);
    els.rankStatus.textContent = "랭킹을 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
  }
}

function renderRanking(rows) {
  els.rankList.innerHTML = rows.map((row, idx) => {
    const dt = row.updatedAt?.toDate ? row.updatedAt.toDate() : row.updatedAt ? new Date(row.updatedAt) : null;
    const dateStr = dt && !Number.isNaN(dt.getTime()) ? `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}` : '방금 전';
    return `
      <li class="rank-item">
        <div class="rank-pos">${idx + 1}</div>
        <div>
          <div class="rank-name">${escapeHtml(row.nickname || '참가자')}</div>
          <span class="rank-date">${dateStr}</span>
        </div>
        <div class="rank-score">${fmt(row.score || 0)}</div>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bindEvents() {
  els.startBtn.addEventListener('click', startRun);
  els.showRankBtn.addEventListener('click', () => document.getElementById('rankSection').scrollIntoView({ behavior: 'smooth' }));
  els.nextBtn.addEventListener('click', nextRound);
  els.retryBtn.addEventListener('click', startRun);
  els.resultRankBtn.addEventListener('click', () => {
    document.getElementById('rankSection').scrollIntoView({ behavior: 'smooth' });
  });
  els.refreshRankBtn.addEventListener('click', loadRanking);
  installTapArea();
}

bindEvents();
renderEquipTags();
initFirebase();
