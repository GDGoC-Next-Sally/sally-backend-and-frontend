"""
services/message_formatting.py — LLM 프롬프트용 발화자 라벨 포맷팅
"""

from typing import Optional


def clean_speaker_label(label: Optional[str]) -> Optional[str]:
    if not label:
        return None

    cleaned = " ".join(str(label).strip().split())
    return cleaned or None


def speaker_label(
    sender_type: Optional[str] = None,
    *,
    student_name: Optional[str] = None,
    sender_name: Optional[str] = None,
    speaker_name: Optional[str] = None,
    default_student_label: str = "학생",
) -> str:
    """
    LLM이 user 메시지의 주체를 명확히 알 수 있도록 발화자 라벨을 반환합니다.

    규칙:
    - 선생님 개입: "선생님 지시" (학생에게 보인 발화가 아닌 AI용 비공개 지도 방향)
    - 시스템 조율 메시지: "시스템"
    - 학생 메시지: 학생 이름이 있으면 해당 이름, 없으면 default_student_label
    """
    normalized_type = str(sender_type or "STUDENT").strip().upper()

    if normalized_type in {"TEACHER", "ADMIN", "선생님"}:
        return "선생님 지시"

    if normalized_type in {"SYSTEM", "시스템"}:
        return "시스템"

    if normalized_type in {"AI", "ASSISTANT", "MODEL", "BOT", "SALLY", "SYSTEM_AI"}:
        return "AI 선생님"

    return (
        clean_speaker_label(student_name)
        or clean_speaker_label(sender_name)
        or clean_speaker_label(speaker_name)
        or default_student_label
    )


def format_labeled_message(
    content: str,
    sender_type: Optional[str] = None,
    *,
    student_name: Optional[str] = None,
    sender_name: Optional[str] = None,
    speaker_name: Optional[str] = None,
    default_student_label: str = "학생",
) -> str:
    label = speaker_label(
        sender_type,
        student_name=student_name,
        sender_name=sender_name,
        speaker_name=speaker_name,
        default_student_label=default_student_label,
    )
    return f"{label}: {content}"
