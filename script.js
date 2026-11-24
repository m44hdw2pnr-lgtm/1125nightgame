const $ = id => document.getElementById(id);
const screens = ['intro','game','result','board'];
const hazards = [
  ['낙하물 위험!','안전모를 착용하세요','안전모'],
  ['발에 물건 떨어짐!','안전화를 착용하세요','안전화'],
  ['추락 위험!','안전대를 착용하세요','안전대'],
  ['감전 위험!','절연 장갑을 착용하세요','절연 장갑'],
  ['눈 비산물 위험!','보안경을 착용하세요','보안경']
];
// 한 방향(바깥→중앙) 소요시간. 숫자가 작을수록 빨라집니다.
const travelMs=[1600,1300,1050,840,670];
const LOCAL_KEY='ls_safety_timing_v3_best';
let db=null,auth=null,uid=null,fb=null,online=false;
let nickname='',round=0,points=[],total=0,raf=0,startAt=0,active=false,finished=false,lastOrigin='intro',transitionId=0;
const f=n=>Number(n).toFixed(3);
const localName=()=>localStorage.getItem('ls_safety_nickname')||'';
$('nickname').value=localName();
function view(which){screens.forEach(x=>$(x).classList.toggle('hide',x!==which));}
function cancelRound(){active=false;finished=true;cancelAnimationFrame(raf);clearTimeout(transitionId);}
function pose(index){$('figure').src=`./assets/pose-${index}.png`;}
function renderNeedles(progress){$('needleL').style.left=`${progress*50}%`;$('needleR').style.left=`${100-progress*50}%`;}
function draw(ts){if(!active)return;if(!startAt)startAt=ts;const elapsed=ts-startAt;const cycle=travelMs[round]*2;const phase=(elapsed%cycle)/travelMs[round];const progress=phase<=1?phase:2-phase;renderNeedles(progress);window.__sheProgress=progress;raf=requestAnimationFrame(draw);}
function startGame(){cancelRound();nickname=($('nickname').value||'').trim().slice(0,12)||`참가자${Math.floor(Math.random()*900+100)}`;$('nickname').value=nickname;localStorage.setItem('ls_safety_nickname',nickname);round=0;points=[];total=0;pose(0);$('total').textContent=f(0);view('game');nextRound();}
function nextRound(){cancelRound();finished=false;startAt=0;window.__sheProgress=0;renderNeedles(0);$('sparkle').classList.add('hide');$('roundLabel').textContent=`ROUND ${round+1} / 5`;$('speedText').textContent=`LEVEL ${round+1}`;$('hazard').textContent=hazards[round][0];$('hazardDesc').textContent=hazards[round][1];$('equipStatus').textContent=`${hazards[round][2]} 준비!`;$('feedback').textContent='양쪽 선이 중앙으로 오면 터치!';$('tap').textContent='지금 터치!';$('tap').disabled=true;$('dots').innerHTML=hazards.map((_,i)=>`<i class="${i<round?'done':i===round?'active':''}"></i>`).join('');transitionId=setTimeout(()=>{active=true;finished=false;$('tap').disabled=false;raf=requestAnimationFrame(draw)},500);}
function tap(){if(!active||finished)return;active=false;finished=true;cancelAnimationFrame(raf);$('tap').disabled=true;const progress=Math.max(0,Math.min(1,window.__sheProgress||0));const score=Math.round(Math.max(0,100-(1-progress)*170)*1000)/1000;points.push(score);total=Math.round(points.reduce((a,b)=>a+b,0)*1000)/1000;$('total').textContent=f(total);pose(round+1);$('equipStatus').textContent=`${hazards[round][2]} 착용 완료!`;$('feedback').textContent=`${f(score)}점 · ${score>=95?'PERFECT!':score>=75?'GREAT!':'안전 보호구 장착!'}`;if(round===4){$('sparkle').classList.remove('hide');transitionId=setTimeout(endGame,1450)}else{transitionId=setTimeout(()=>{round++;nextRound()},1050)}}
async function endGame(){view('result');$('final').textContent=f(total);$('saveStatus').textContent='최고 기록 저장 중…';try{const status=await save();$('saveStatus').textContent=status}catch(e){console.error(e);$('saveStatus').textContent='온라인 저장 실패 · Firebase 설정 및 연결을 확인하세요'}}
async function initFirebase(){const cfg=window.FIREBASE_CONFIG||{};if(!cfg.apiKey||!cfg.projectId||!cfg.authDomain||!cfg.appId){$('network').textContent='체험 모드 · Firebase 연결 전에는 기기별 기록만 저장됩니다.';return}try{const [appLib,authLib,storeLib]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')]);const app=appLib.initializeApp(cfg);auth=authLib.getAuth(app);db=storeLib.getFirestore(app);fb=storeLib;const user=await authLib.signInAnonymously(auth);uid=user.user.uid;online=true;$('network').textContent='✅ 온라인 랭킹 연결됨'}catch(e){console.error(e);online=false;$('network').textContent='⚠️ Firebase 연결 실패 · 현재 기기 체험 모드'}}
function readLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'null')}catch{return null}}
async function save(){const data={nickname,score:total,roundScores:points};if(!online){const prev=readLocal();if(!prev||total>Number(prev.score)){localStorage.setItem(LOCAL_KEY,JSON.stringify({...data,updatedAt:Date.now()}))}return '체험 모드 · 이 기기에 최고 점수 저장 완료'}const ref=fb.doc(db,'scores',uid);const prevSnap=await fb.getDoc(ref);if(!prevSnap.exists()||total>Number(prevSnap.data().score)){await fb.setDoc(ref,{...data,updatedAt:fb.serverTimestamp()}) ;return '✅ 온라인 최고 기록 저장 완료'}return '✅ 기존 최고 기록 유지'}
function esc(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
async function ranking(){view('board');$('rankList').textContent='';$('rankStatus').textContent='랭킹을 불러오는 중…';try{let rows=[];if(online){const q=fb.query(fb.collection(db,'scores'),fb.orderBy('score','desc'),fb.limit(10));const snap=await fb.getDocs(q);rows=snap.docs.map(d=>d.data());$('rankStatus').textContent='전체 참가자 최고 합산 점수'}else{const rec=readLocal();if(rec)rows=[rec];$('rankStatus').textContent='체험 모드 · 이 기기의 기록만 보입니다.'}if(!rows.length){$('rankList').textContent='아직 기록이 없습니다. 첫 참가자가 되어보세요!';return}rows.forEach((r,i)=>{const div=document.createElement('div');div.className='rank-row';div.innerHTML=`<span class="position">${i+1}</span><span class="rank-name">${esc(r.nickname||'참가자')}</span><span class="rank-score">${f(r.score||0)}</span>`;$('rankList').append(div)})}catch(e){console.error(e);$('rankStatus').textContent='랭킹을 불러오지 못했습니다. Firebase 설정을 확인해주세요.'}}
$('start').addEventListener('click',startGame);$('nickname').addEventListener('keydown',e=>{if(e.key==='Enter'){$('nickname').blur();startGame()}});$('tap').addEventListener('click',tap);
$('retry').addEventListener('click',startGame);$('home').addEventListener('click',()=>{cancelRound();view('intro')});$('showBoard').addEventListener('click',()=>{lastOrigin='result';ranking()});$('introBoard').addEventListener('click',()=>{lastOrigin='intro';ranking()});$('back').addEventListener('click',()=>view(lastOrigin));$('refresh').addEventListener('click',ranking);
// Mobile: support touching the timing lane in addition to the prominent button.
$('lane').addEventListener('pointerdown',e=>{e.preventDefault();tap()});
initFirebase();
