# LS전선 안전 타이밍 챌린지 V3

**사용자가 제공한 LS전선 공식 로고 이미지와 6개의 캐릭터 포즈**를 그대로 사용한 모바일 안전 타이밍 게임입니다.

## 반영 내용
- 닉네임 입력 → 게임 전체 화면 → 5번 자동 진행 → 합산 점수 결과
- 6개 캐릭터 포즈: 기본 → 안전모 → 안전화 → 안전대 → 절연 장갑 → 보안경
- 얇은 두 줄이 양쪽에서 중앙으로 왔다가 다시 돌아가는 왕복 움직임
- 빨강/노랑/초록 안전 구역, 라운드별 속도 증가
- 각 라운드 0~100점, 소수점 3자리, 총점 최대 500.000점
- 결과 화면: **다시 도전 / 전체 랭킹 보기 / 처음으로 돌아가기**
- 카카오톡 URL 공유 및 Firestore TOP 10 랭킹 (Firebase 설정 후)

## 업로드 방법 (중요)

1. 이 ZIP의 압축을 풉니다.
2. `she-timing-v3` 폴더의 **내용물**을 GitHub `1125nightgame` 저장소의 **최상단**에 올립니다.
3. 다음 파일과 폴더가 반드시 있어야 합니다.
   - `index.html`, `script.js`, `firebase-config.js`, `firestore.rules`, `README.md`
   - `assets/ls-cable-logo.png` 및 `assets/pose-0.png`~`pose-5.png`
4. `index.html`과 `assets`는 **같은 최상단 경로 기준**이어야 합니다. 그렇지 않으면 이미지가 표시되지 않습니다.
5. 동일한 이름의 기존 파일은 새 파일로 교체합니다. 과거 `style.css`, `ls-logo.png`, `ls-mascot.png`, ZIP 파일은 불필요하므로 나중에 삭제해도 됩니다. 이 버전은 CSS를 `index.html`에 포함하므로 `style.css`가 필요 없습니다.
6. GitHub 저장소 `Settings → Pages`: `Deploy from a branch`, `main`, `/(root)`로 설정합니다.

배포 주소 (사용자 제공 GitHub 계정): https://m44hdw2pnr-lgtm.github.io/1125nightgame/

## Firebase 공용 랭킹 연결

**현재는 Firebase 프로젝트 ID 및 구성값이 입력되지 않은 상태**이며, 실제 공용 랭킹은 직접 연결해야 활성화됩니다.

1. https://console.firebase.google.com 에서 Firebase 프로젝트 생성 (Spark 무료 요금제).
2. Firebase 프로젝트 설정 → 웹 앱 추가 → 아래 네 개 값을 복사합니다.
   `apiKey`, `authDomain`, `projectId`, `appId`.
3. GitHub의 `firebase-config.js` 파일에 해당 값들을 입력합니다.
4. Firebase Authentication → 로그인 방법 → **익명(Anonymous)** 사용 설정.
5. Firestore Database 생성 → Rules에 `firestore.rules` 내용을 붙여 넣고 **게시**.
6. 서로 다른 휴대폰 두 대로 게임 완료 → 랭킹이 같은지 확인합니다.

**주의:** Firebase 웹 설정값은 공개 웹 앱 식별용이며 서비스 계정 비밀키는 올리지 마세요. 공동 랭킹은 각 익명 계정의 최고 점수만 유지합니다. 같은 사람이 다른 기기로 참여하거나 브라우저 기록을 지우면 다른 사람처럼 기록될 수 있습니다. 프론트엔드에서 채점하므로 포상이 걸린 대회처럼 조작 방지가 필요한 용도로는 적절하지 않습니다.

## 편집 방법
- 위험 경고 문구: `script.js`의 `hazards`
- 라운드별 왕복 속도: `script.js`의 `travelMs` (밀리초, 작을수록 빠름)
- 점수 계산: `script.js`의 `tap` 함수
- 화면 스타일: `index.html`의 `<style>`

**보호구 착용 이미지는 게임 연출이며, 실제 작업 전 보호구 선정과 올바른 착용은 해당 현장 안전수칙을 따르세요.**
