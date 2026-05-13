FROM python:3.11-slim

WORKDIR /app

# Python이 pyc 파일을 생성하지 않도록 설정
ENV PYTHONDONTWRITEBYTECODE 1
# 버퍼링을 비활성화하여 로그가 즉시 출력되도록 설정
ENV PYTHONUNBUFFERED 1

# PYTHONPATH 설정 (ai_server 폴더를 패키지로 인식할 수 있도록 apps 폴더를 지정)
ENV PYTHONPATH=/app/apps

# 의존성 설치
COPY apps/ai_server/requirements.txt ./apps/ai_server/
RUN pip install --no-cache-dir -r apps/ai_server/requirements.txt

# 소스 코드 복사
COPY apps/ai_server ./apps/ai_server

EXPOSE 8000

# AI 서버 실행
CMD ["uvicorn", "ai_server.main:app", "--host", "0.0.0.0", "--port", "8000"]
