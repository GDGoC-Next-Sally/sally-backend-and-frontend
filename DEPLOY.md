# 🚀 Sally AI Coach 배포 및 운영 가이드 (Cheat Sheet)

이 파일은 GCP 서버에서 도커를 이용해 서비스를 배포하고 관리할 때 사용하는 핵심 명령어 모음집입니다. 나중에 명령어가 기억나지 않을 때 이 파일을 읽어보세요!

---

## 📂 1. 코드 가져오기 및 업데이트 (Git)

### 💡 최초로 코드를 가져올 때 (Git Clone)
서버에 처음 접속했을 때, 토큰을 포함하여 코드를 가져옵니다. (최초 1회만 수행)
```bash
git clone https://<내_토큰>@github.com/GDGoC-Next-Sally/sally-backend-and-frontend.git sally-ai-coach
```
*   `cd sally-ai-coach` 명령어로 폴더에 진입합니다.

### 💡 코드가 업데이트 되었을 때 (Git Pull)
로컬에서 코드를 푸시한 후, 서버에서 최신 코드를 땡겨올 때 사용합니다. (토큰 입력 필요 없음)
```bash
# 프로젝트 폴더 안에서 실행
git pull
```

---

## 🔐 2. 환경 변수 설정 (.env)

도커 빌드 및 실행을 위해 각 폴더에 환경 변수 파일이 필요합니다.

### 💡 프론트엔드 빌드용 (루트 폴더)
```bash
nano .env
```
아래 내용을 입력하고 저장합니다 (`Ctrl + O` 엔터 -> `Ctrl + X` 종료).
```env
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your_supabase_key"
```

### 💡 각 앱별 환경 변수
필요에 따라 각 폴더에 `.env` 파일을 생성해 줍니다.
*   `apps/frontend/.env`
*   `apps/backend/.env`
*   `apps/ai_server/.env`

---

## 🐳 3. 서버 실행 및 관리 (Docker Compose)

모든 명령어는 **프로젝트 루트 폴더(`sally-ai-coach`)**에서 실행해야 합니다.

### 💡 서버 켜기 (최초 실행 및 코드 변경 시)
코드가 바뀌었거나 패키지가 추가되었을 때, 새로 빌드하고 백그라운드에서 실행합니다.
```bash
docker compose up --build -d
```

### 💡 서버 켜기 (단순 재시작 시)
빌드 없이 기존 이미지를 그대로 사용해 서버를 켤 때 사용합니다.
```bash
docker compose up -d
```

### 💡 서버 끄기
실행 중인 모든 컨테이너를 중지하고 삭제합니다.
```bash
docker compose down
```

### 💡 서버 재시작
```bash
docker compose restart
```

---

## 📋 4. 로그 확인 및 모니터링

### 💡 실시간 로그 확인
서버가 잘 돌아가는지, 에러는 없는지 실시간으로 확인합니다.
```bash
docker compose logs -f
```
*   `Ctrl + C`를 누르면 로그 보기가 종료됩니다. (서버는 계속 켜져 있습니다.)

### 💡 특정 앱 로그만 확인
```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f ai-server
```

### 💡 컨테이너 상태 확인
```bash
docker compose ps
```

---

## 🛠️ 5. 기타 유용한 명령어

### 💡 도커 캐시 지우기 (용량이 부족하거나 빌드가 꼬였을 때)
```bash
docker system prune -a --volumes
```

### 💡 GCP 방화벽 열기 (접속이 안 될 때)
외부에서 접속이 안 된다면 GCP 콘솔의 **방화벽 규칙**에서 `tcp:3000, 3001, 8000` 포트를 열어주어야 합니다.
