const $ = (id) => document.getElementById(id);
const rounds = [
 {title:'낙하물 위험!',sub:'위에서 물체가 떨어집니다 · 안전모 장착',equip:'hat',name:'안전모',speed:1.45},
 {title:'발에 물건 낙하!',sub:'발을 보호하세요 · 안전화 장착',equip:'shoes',name:'안전화',speed:1.12},
 {title:'추락 위험!',sub:'높은 곳에서 작업 중 · 안전대 장착',equip:'harness',name:'안전대',speed:.91},
 {title:'감전 위험!',sub:'전기 작업 보호 · 절연장갑 장착',equip:'gloves',name:'절연장갑',speed:.74},
 {title:'눈 비산물 위험!',sub:'튀는 물체로부터 눈 보호 · 보안경 장착',equip:'glasses',name:'보안경',speed:.57}
];
const SCREENS=['intro','playing','result','board'];
const STORAGE='ls_safety_timing_v2';
let round=0, roundScores=[], total=0, nick='', startAt=0, active=false, transition=false, frame=0, fraction=0, passed=0, boardFrom='intro';
let db=null, auth=null, uid=null, firebase=null, online=false;
const hide=(id,yes)=>$(id).classList.toggle('hide',yes);
function scene(name){SCREENS.forEach(id=>hide(id,id!==name));}
function nice(n){return Number(n).toFixed(3)}
function safeNick(v){return String(v||'').replace(/[<>]/g,'').trim().slice(0,12)}
function renderDots(){ $('roundDots').innerHTML=rounds.map((_,i)=>`<i class="dot ${i<round?'done':i===round?'active':''}"></i>`).join(''); }
function setLines(f){let x=2+48*Math.max(0,Math.min(1,f));$('leftNeedle').style.left=x+'%';$('rightNeedle').style.left=(100-x)+'%';}
function progressNow(now){const period=rounds[round].speed*1000;const phase=((now-startAt)/period)%2;return phase<=1?phase:2-phase;}
function tick(now){if(!active)return;fraction=progressNow(now);setLines(fraction);frame=requestAnimationFrame(tick);}
function removeEquipment(){rounds.forEach(r=>$(r.equip).classList.add('off'));hide('sparkle',true)}
function begin(){nick=safeNick($('nickname').value)||'안전지킴이';$('nickname').value=nick;round=0;roundScores=[];total=0;removeEquipment();scene('playing');launchRound();}
function launchRound(){
 const r=rounds[round]; active=false;transition=true;cancelAnimationFrame(frame);renderDots();$('roundLabel').textContent=`ROUND ${round+1} / 5`;
 $('hazard').textContent=r.title;$('subtitle').textContent=r.sub;$('total').textContent=nice(total);
 $('equipLabel').textContent=`${r.name} 준비!`;$('hint').textContent=round===0?'첫 라운드, 타이밍을 익혀보세요':'속도가 빨라집니다!';
 $('beacon').textContent='⚠';$('tap').disabled=true;$('tap').textContent='위험 경고!';$('reaction').textContent='중앙 초록색 구간에서 터치하세요';
 setLines(0);setTimeout(()=>{if(!$('playing').classList.contains('hide')&&rounds[round]===r){startAt=performance.now();active=true;transition=false;$('tap').disabled=false;$('tap').textContent='지금 터치!';frame=requestAnimationFrame(tick);}},650);
}
function tap(){
 if(!active||transition)return;
 const p=progressNow(performance.now());active=false;transition=true;cancelAnimationFrame(frame);setLines(p);$('tap').disabled=true;
 const score=Math.max(0,100-Math.abs(1-p)*120);const n=+score.toFixed(3);roundScores.push(n);total=+(total+n).toFixed(3);$('total').textContent=nice(total);
 const r=rounds[round];$(r.equip).classList.remove('off');$('equipLabel').textContent=`✓ ${r.name} 착용 완료`;
 const success=p>=.93?'PERFECT!':p>=.83?'GREAT!':p>=.69?'GOOD!':'안전 장비 장착!';
 $('reaction').textContent=`${success} +${nice(n)}점`; $('tap').textContent=`${nice(n)}점 획득!`;
 if(round===4){$('sparkle').classList.remove('hide');$('reaction').textContent=`✦ 삐싱! 보안경 장착 · +${nice(n)}점`}
 setTimeout(()=>{if(round===4){finish();return;}round++;launchRound()},round===4?1600:1200);
}
async function finish(){scene('result');$('final').textContent=nice(total);$('saveStatus').textContent='최고 기록 저장 중…';let message='';try{message=await saveBest();}catch(e){console.error(e);message='랭킹 저장에 실패했습니다. 인터넷과 Firebase 설정을 확인해 주세요.'}$('saveStatus').textContent=message;}
function localRows(){try{return JSON.parse(localStorage.getItem(STORAGE)||'[]')}catch{return []}}
function storeLocal(rows){localStorage.setItem(STORAGE,JSON.stringify(rows));}
function localBest(){let rows=localRows();let prior=rows[0];if(!prior||total>Number(prior.score)){storeLocal([{nickname:nick,score:total,date:Date.now()}]);return '체험 모드: 이 휴대폰에 최고 기록을 저장했습니다.'}return '체험 모드: 기존 최고 기록을 유지했습니다.'}
async function saveBest(){if(!online||!firebase||!uid)return localBest();const {doc,getDoc,setDoc,serverTimestamp}=firebase;const ref=doc(db,'scores',uid);const old=await getDoc(ref);if(old.exists()&&Number(old.data().score)>=total)return '온라인 최고 기록을 유지했습니다.';await setDoc(ref,{nickname:nick,score:total,roundScores,updatedAt:serverTimestamp()});return '✅ 온라인 랭킹에 최고 기록을 저장했습니다.';}
function makeRow(item,i){const div=document.createElement('div');div.className='rank'+(i===0?' top':'');const place=document.createElement('b');place.textContent=(i+1)+'위';const name=document.createElement('span');name.textContent=item.nickname||'참가자';const score=document.createElement('strong');score.textContent=nice(item.score);div.append(place,name,score);return div;}
async function loadBoard(){const el=$('rankList');el.replaceChildren();$('rankStatus').textContent='랭킹을 불러오는 중…';try{let rows;if(online){const {collection,query,orderBy,limit,getDocs}=firebase;const snapshot=await getDocs(query(collection(db,'scores'),orderBy('score','desc'),limit(10)));rows=snapshot.docs.map(x=>x.data());$('rankStatus').textContent='온라인 랭킹 · 새로고침으로 최신 점수를 확인하세요';}else{rows=localRows();$('rankStatus').textContent='체험 모드 · 다른 직원과 점수를 공유하려면 Firebase 연결이 필요합니다.';}if(!rows.length){el.textContent='아직 기록이 없습니다. 첫 기록에 도전해보세요!';return;}rows.forEach((v,i)=>el.appendChild(makeRow(v,i)));}catch(e){console.error(e);$('rankStatus').textContent='랭킹을 읽을 수 없습니다. Firebase 설정과 보안 규칙을 확인하세요.';}}
function openBoard(from){boardFrom=from;scene('board');loadBoard();}
async function setupFirebase(){const cfg=window.FIREBASE_CONFIG||{};if(!cfg.apiKey||!cfg.projectId||!cfg.appId){$('network').textContent='체험 모드 · Firebase 연결 전에는 공동 랭킹이 작동하지 않습니다.';return;}try{
 const [{initializeApp},{getAuth,signInAnonymously},{getFirestore,doc,getDoc,setDoc,serverTimestamp,collection,query,orderBy,limit,getDocs}]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js')]);
 const app=initializeApp(cfg);auth=getAuth(app);db=getFirestore(app);firebase={doc,getDoc,setDoc,serverTimestamp,collection,query,orderBy,limit,getDocs};const cred=await signInAnonymously(auth);uid=cred.user.uid;online=true;$('network').textContent='✅ 온라인 랭킹 연결 완료';
 }catch(e){console.error(e);$('network').textContent='⚠ Firebase 연결 오류 · 체험 모드로 작동합니다.';}}
$('start').addEventListener('click',begin);$('nickname').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('nickname').blur();begin()}});
$('tap').addEventListener('pointerdown',e=>{e.preventDefault();tap()});$('retry').addEventListener('click',begin);$('leaderboardBtn').addEventListener('click',()=>openBoard('result'));$('refresh').addEventListener('click',loadBoard);$('boardBack').addEventListener('click',()=>scene(boardFrom));
setupFirebase();
