"""
test_report.py - 학생별 최종 리포트 생성 파이프라인 테스트

실행 방법:
    cd apps/ai_server
    .venv/bin/python test_report.py

테스트 항목:
    1. 정상 학습 세션 테스트
    2. 짧은 세션 테스트
    3. 빈 세션 테스트
    4. 긴 세션 테스트
    5. 잡담 위주 세션 테스트
    9. JSON 파싱 실패 시 repair/fallback 동작 테스트
"""

import asyncio
import json
from copy import deepcopy

from ai_server.services import report_builder
from ai_server.services.report_builder import (
    generate_final_report,
    _parse_report_json,
    _repair_and_parse_report_json,
    _fallback_parse_error_report,
)


# ─────────────────────────────────────────────────────────────
# Test Case 1. 정상 학습 세션
# 영어 문법: 관계대명사
# - 초반 오개념이 있지만, 후반에 일부 정정되는 흐름
# ─────────────────────────────────────────────────────────────

NORMAL_LEARNING_MESSAGES = [
    {
        "role": "assistant",
        "content": "안녕하세요! 오늘은 관계대명사에 대해 배워볼 거예요. 관계대명사가 무엇인지 들어본 적 있나요?",
    },
    {
        "role": "student",
        "content": "음... 문장 두 개를 연결해주는 말 아닌가요?",
    },
    {
        "role": "assistant",
        "content": "맞아요. 문장을 연결하면서 동시에 대명사 역할도 해요. 예를 들어 'I know a boy'와 'He likes apples'를 연결해볼까요?",
    },
    {
        "role": "student",
        "content": "I know a boy he likes apples... 이렇게 쓰면 되나요?",
    },
    {
        "role": "assistant",
        "content": "거의 다 왔어요. 여기서는 'he'를 관계대명사 'who'로 바꿔서 연결해야 해요.",
    },
    {
        "role": "student",
        "content": "아, 그러면 I know a boy who likes apples. 이거네요.",
    },
    {
        "role": "assistant",
        "content": "맞아요. 이번에는 목적격 관계대명사를 볼게요. 'This is the book'과 'I bought it yesterday'를 연결해보세요.",
    },
    {
        "role": "student",
        "content": "This is the book which I bought it yesterday.",
    },
    {
        "role": "assistant",
        "content": "관계대명사 which를 쓴 건 좋아요. 하지만 it이 which로 바뀌어 앞으로 나간 것이기 때문에 뒤에 it을 다시 쓰면 안 돼요.",
    },
    {
        "role": "student",
        "content": "아, 그러면 This is the book which I bought yesterday. 뒤에 it을 빼야 하는 거군요.",
    },
    {
        "role": "assistant",
        "content": "맞아요. 그리고 목적격 관계대명사 which는 생략할 수도 있어요.",
    },
    {
        "role": "student",
        "content": "그러면 주격 관계대명사 who도 생략할 수 있나요?",
    },
    {
        "role": "assistant",
        "content": "아니요. 주격 관계대명사는 단독으로 생략할 수 없고, 목적격 관계대명사만 생략할 수 있어요.",
    },
    {
        "role": "student",
        "content": "아하, 주격은 생략 안 되고 목적격만 생략되는 거군요. 이제 구분됩니다.",
    },
]


# ─────────────────────────────────────────────────────────────
# Test Case 2. 짧은 세션
# 영어 문법: 현재완료
# - 학생 발화가 1개뿐인 경우
# ─────────────────────────────────────────────────────────────

SHORT_SESSION_MESSAGES = [
    {
        "role": "assistant",
        "content": "오늘은 현재완료 have p.p.를 배워볼게요.",
    },
    {
        "role": "student",
        "content": "현재완료랑 과거시제가 어떻게 다른지 잘 모르겠어요.",
    },
]


# ─────────────────────────────────────────────────────────────
# Test Case 3. 빈 세션
# 영어 문법: 수동태
# - 학생 메시지가 없는 경우
# - LLM 호출 없이 fallback report가 나와야 함
# ─────────────────────────────────────────────────────────────

EMPTY_STUDENT_MESSAGES = [
    {
        "role": "assistant",
        "content": "오늘은 수동태를 공부해볼게요.",
    },
    {
        "role": "assistant",
        "content": "수동태는 be동사와 과거분사를 사용해서 목적어가 주어 자리로 이동한 문장입니다.",
    },
]


# ─────────────────────────────────────────────────────────────
# Test Case 4. 긴 세션
# 영어 문법: 관계대명사 반복 연습
# - 긴 세션 경로를 강제로 태워 chunk summary + synthesis 확인
# ─────────────────────────────────────────────────────────────

LONG_SESSION_BASE_MESSAGES = [
    {
        "role": "assistant",
        "content": (
            "이번에는 관계대명사의 주격과 목적격을 구분하는 연습을 해볼게요.\n"
            "관계대명사는 두 문장을 연결하면서, 뒤 절 안에서 대명사 역할도 합니다.\n"
            "오늘은 특히 관계대명사가 뒤 문장에서 주어 역할을 하는지, 목적어 역할을 하는지 확인하는 연습을 할 거예요."
        ),
    },
    {
        "role": "student",
        "content": "관계대명사는 그냥 두 문장 사이에 넣는 접속사 같은 거 아닌가요? who나 which만 넣으면 되는 줄 알았어요.",
    },
    {
        "role": "assistant",
        "content": (
            "그렇게 생각하기 쉬운데, 관계대명사는 단순한 접속사와는 조금 달라요.\n"
            "문장을 연결하는 역할도 하지만, 동시에 뒤 절 안에서 주어나 목적어 같은 문장 성분 역할을 합니다.\n"
            "그래서 who나 which를 고를 때도, 뒤 절에서 어떤 역할을 하는지 함께 봐야 해요."
        ),
    },
    {
        "role": "student",
        "content": "음... 그러면 관계대명사는 접속사이면서 대명사 역할도 한다는 건가요?",
    },
    {
        "role": "assistant",
        "content": (
            "맞아요. 바로 그 점이 핵심이에요.\n"
            "예를 들어 I know a boy와 He likes music을 연결하면, He가 who로 바뀌어서 I know a boy who likes music이 됩니다.\n"
            "여기서 who는 두 문장을 연결하면서, 동시에 likes의 주어 역할을 해요."
        ),
    },
    {
        "role": "student",
        "content": "그러면 I know a boy who likes music에서 who는 그냥 boy를 꾸며주는 말 아닌가요?",
    },
    {
        "role": "assistant",
        "content": (
            "boy를 꾸며주는 역할도 결과적으로는 맞지만, 문법적으로는 who가 뒤 절 안에서 어떤 역할을 하는지가 중요해요.\n"
            "who likes music에서 likes의 주어가 who이기 때문에, 이 who는 주격 관계대명사입니다.\n"
            "즉, '꾸며준다'는 큰 기능과 '뒤 절에서 주어 역할을 한다'는 문법적 역할을 함께 봐야 해요."
        ),
    },
    {
        "role": "student",
        "content": "아... 근데 주격인지 목적격인지 구분하는 게 너무 헷갈려요. 그냥 who면 주격, which면 목적격 아닌가요?",
    },
    {
        "role": "assistant",
        "content": (
            "좋은 질문이에요. 하지만 who라고 항상 주격이고, which라고 항상 목적격인 것은 아니에요.\n"
            "who는 사람을 받을 때 주로 쓰이고, which는 사물을 받을 때 주로 쓰는 관계대명사입니다.\n"
            "주격/목적격은 단어 자체가 아니라, 그 관계대명사가 뒤 절에서 주어 역할을 하는지 목적어 역할을 하는지로 판단해야 해요."
        ),
    },
    {
        "role": "student",
        "content": "아... 그러면 외울 게 너무 많은데요. 사람인지 사물인지도 보고, 주어인지 목적어인지도 봐야 하는 거잖아요. 좀 못 하겠어요.",
    },
    {
        "role": "assistant",
        "content": (
            "맞아요, 처음에는 한 번에 여러 기준을 봐야 해서 어렵게 느껴질 수 있어요.\n"
            "그래도 순서를 정하면 훨씬 쉬워집니다. 먼저 선행사가 사람인지 사물인지 보고 who/which/that 후보를 고르고, 그다음 뒤 절에서 빠진 자리가 주어인지 목적어인지 확인하면 돼요.\n"
            "지금은 완벽하게 외우려 하기보다, 예문에서 빠진 자리를 찾는 연습부터 해볼게요."
        ),
    },
    {
        "role": "student",
        "content": "음... 그러면 일단 해볼게요. 근데 틀릴 것 같아요.",
    },
    {
        "role": "assistant",
        "content": (
            "틀려도 괜찮아요. 지금은 맞히는 것보다 어떤 기준으로 판단하는지 익히는 단계예요.\n"
            "예를 들어 This is the movie. I watched it yesterday. 이 두 문장을 연결해볼게요.\n"
            "it이 the movie를 가리키고 있으니, 이 it이 관계대명사로 바뀌게 됩니다."
        ),
    },
    {
        "role": "student",
        "content": "그러면 This is the movie which I watched it yesterday 아닌가요?",
    },
    {
        "role": "assistant",
        "content": (
            "여기서 아주 중요한 오개념이 하나 나왔어요.\n"
            "which가 이미 it의 역할을 대신해서 앞으로 나온 것이기 때문에, 뒤에 it을 다시 쓰면 중복됩니다.\n"
            "그래서 올바른 문장은 This is the movie which I watched yesterday입니다."
        ),
    },
    {
        "role": "student",
        "content": "아... which가 it 역할을 대신하는 거라서 it을 또 쓰면 안 되는 거군요.",
    },
    {
        "role": "assistant",
        "content": (
            "맞아요. 관계대명사는 단순히 문장 사이에 끼워 넣는 말이 아니라, 원래 있던 대명사를 대신하는 말이에요.\n"
            "그래서 원래 문장의 it, him, her 같은 대명사가 관계대명사로 바뀌면 뒤 절에서는 반복하지 않습니다.\n"
            "이 원리를 이해하면 목적격 관계대명사 문장을 훨씬 덜 헷갈리게 만들 수 있어요."
        ),
    },
    {
        "role": "student",
        "content": "그럼 The book which I bought it yesterday도 틀리고, The book which I bought yesterday가 맞는 거죠?",
    },
    {
        "role": "assistant",
        "content": (
            "네, 정확해요.\n"
            "which가 bought의 목적어 역할을 하고 있으므로, 뒤에 it을 다시 쓰지 않아야 합니다.\n"
            "방금 전에는 오개념이 있었지만, 지금은 스스로 같은 원리를 적용해서 바로잡았어요."
        ),
    },
    {
        "role": "student",
        "content": "조금 알 것 같긴 한데, 주격이랑 목적격 구분은 아직 헷갈려요.",
    },
    {
        "role": "assistant",
        "content": (
            "좋아요. 그러면 이번에는 뒤 절에서 빠진 자리를 보는 방식으로 다시 정리해볼게요.\n"
            "I know a girl who likes music에서는 who 뒤에 바로 likes가 오고, likes의 주어가 필요하죠.\n"
            "그래서 who는 주어 역할을 하는 주격 관계대명사입니다."
        ),
    },
    {
        "role": "student",
        "content": "그러면 who likes music에서 who가 주어라서 주격이고, 생략하면 likes의 주어가 없어지는 거네요?",
    },
    {
        "role": "assistant",
        "content": (
            "맞아요. 아주 잘 정리했어요.\n"
            "주격 관계대명사는 뒤 절에서 주어 역할을 하기 때문에 보통 생략할 수 없습니다.\n"
            "그래서 I know a girl likes music처럼 who를 빼면 문장이 자연스럽지 않아요."
        ),
    },
    {
        "role": "student",
        "content": "근데 목적격은 왜 생략할 수 있어요? 목적어도 필요한 거 아닌가요?",
    },
    {
        "role": "assistant",
        "content": (
            "좋은 질문이에요. 목적격 관계대명사는 뒤 절에 이미 주어와 동사가 있고, 관계대명사가 목적어 자리만 대신합니다.\n"
            "예를 들어 This is the movie which I watched yesterday에서 I가 주어, watched가 동사예요.\n"
            "which는 watched의 목적어 역할인데, 이 경우에는 의미가 비교적 분명해서 생략할 수 있습니다."
        ),
    },
    {
        "role": "student",
        "content": "아, 뒤에 I watched처럼 주어랑 동사가 이미 있으면 목적격일 가능성이 있고, 그때는 생략될 수 있는 거군요.",
    },
    {
        "role": "assistant",
        "content": (
            "맞아요. 지금 기준을 잘 잡고 있어요.\n"
            "물론 항상 기계적으로만 판단하면 안 되지만, 처음 연습할 때는 매우 좋은 기준입니다.\n"
            "뒤 절에 주어가 이미 있는지, 그리고 관계대명사가 목적어 역할을 하는지 확인해보면 됩니다."
        ),
    },
    {
        "role": "student",
        "content": "처음에는 그냥 who, which를 끼워 넣는 건 줄 알았는데, 원래 있던 대명사가 관계대명사로 바뀌는 거라고 생각하니까 좀 이해돼요.",
    },
    {
        "role": "assistant",
        "content": (
            "그 이해가 아주 중요해요.\n"
            "관계대명사는 문장을 연결하는 동시에 원래 문장의 대명사 자리를 대신합니다.\n"
            "그래서 뒤에 대명사를 반복하지 않는 이유도 자연스럽게 설명할 수 있어요."
        ),
    },
    {
        "role": "student",
        "content": "그러면 I met a boy. He was kind. 이건 I met a boy who was kind이고, who는 was의 주어라서 주격이죠?",
    },
    {
        "role": "assistant",
        "content": (
            "네, 맞아요.\n"
            "He가 who로 바뀌었고, who was kind에서 who가 was의 주어 역할을 하고 있어요.\n"
            "그래서 이 문장의 who는 주격 관계대명사입니다."
        ),
    },
    {
        "role": "student",
        "content": "I met a boy. I liked him. 이건 I met a boy who I liked이고, who는 liked의 목적어라서 목적격인가요?",
    },
    {
        "role": "assistant",
        "content": (
            "정확해요. 여기서는 him이 who로 바뀐 것이고, who는 liked의 목적어 역할을 합니다.\n"
            "따라서 목적격 관계대명사이고, 일상적인 문장에서는 I met a boy I liked처럼 생략할 수도 있어요.\n"
            "지금은 주격과 목적격을 뒤 절의 역할로 구분하는 방향이 잘 잡히고 있습니다."
        ),
    },
    {
        "role": "student",
        "content": "아까는 진짜 포기하고 싶었는데, 예문으로 보니까 조금 잡히는 것 같아요.",
    },
    {
        "role": "assistant",
        "content": (
            "좋아요. 지금처럼 어려운 지점을 말로 표현하고 다시 시도하는 과정이 중요해요.\n"
            "오늘은 관계대명사를 단순한 접속사로만 보던 생각에서, 뒤 절 안에서 주어나 목적어 역할을 한다는 점까지 확장했어요.\n"
            "마지막으로 주격은 생략이 어렵고, 목적격은 생략 가능한 경우가 많다는 점만 다시 정리해볼게요."
        ),
    },
    {
        "role": "student",
        "content": "정리하면, 관계대명사는 문장을 연결하면서 대명사 역할도 하고, 뒤 절에서 주어 역할이면 주격, 목적어 역할이면 목적격이에요. 그리고 목적격은 생략할 수 있는 경우가 많아요.",
    },
    {
        "role": "assistant",
        "content": (
            "아주 잘 정리했어요.\n"
            "처음에는 관계대명사를 단순한 연결어로만 이해했고, 목적격 관계대명사 뒤에 대명사를 반복하는 오개념도 있었지만, 지금은 핵심 원리를 스스로 설명할 수 있게 되었어요.\n"
            "다음에는 다양한 선행사와 관계대명사 that까지 포함해서 더 많은 예문에 적용하는 연습을 하면 좋겠습니다."
        ),
    },
]


def build_long_session_messages(repeat_count: int = 30) -> list[dict]:
    messages = []

    for i in range(repeat_count):
        for msg in LONG_SESSION_BASE_MESSAGES:
            copied = deepcopy(msg)
            copied["content"] = f"{copied['content']} ({i + 1}번째 관계대명사 연습)"
            messages.append(copied)

    return messages


# ─────────────────────────────────────────────────────────────
# Test Case 5. 잡담 위주 세션
# - 학습 개념을 억지로 지어내면 안 됨
# ─────────────────────────────────────────────────────────────

CHITCHAT_MESSAGES = [
    {
        "role": "student",
        "content": "오늘 너무 졸려요.",
    },
    {
        "role": "assistant",
        "content": "괜찮아요. 오늘 영어 문법 중 어떤 내용을 공부할지 정해볼까요?",
    },
    {
        "role": "student",
        "content": "그냥 나중에 할게요.",
    },
    {
        "role": "assistant",
        "content": "좋아요. 준비되면 다시 시작해도 괜찮아요.",
    },
]


# ─────────────────────────────────────────────────────────────
# Schema validation
# ─────────────────────────────────────────────────────────────

EXPECTED_FIELDS = {
    "key_concepts",
    "misconception_summary",
    "session_summary",
    "detailed_report",
}

DISALLOWED_FIELDS = {
    "avg_understanding_score",
    "understanding_score",
    "frustration_trend",
    "frustration_delta",
    "engagement_summary",
    "engagement_level",
    "topic_distribution",
    "understanding_trend",
    "emotion_distribution",
    "question_intent_distribution",
    "average_engagement_level",
    "weak_topic_scores",
}


def pretty_print_messages(messages: list[dict]) -> None:
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")

        if role == "student":
            label = "👱 학생"
        elif role == "assistant":
            label = "🤖 Sally"
        else:
            label = f"❓ {role}"

        print(f"{label}: {content}")


def to_report_dict(report) -> dict:
    return report.model_dump() if hasattr(report, "model_dump") else report.dict()


def validate_report_schema(report_dict: dict) -> list[str]:
    errors = []

    actual_fields = set(report_dict.keys())

    missing_fields = EXPECTED_FIELDS - actual_fields
    extra_fields = actual_fields - EXPECTED_FIELDS
    disallowed_fields = actual_fields & DISALLOWED_FIELDS

    if missing_fields:
        errors.append(f"필수 필드 누락: {sorted(missing_fields)}")

    if extra_fields:
        errors.append(f"허용되지 않은 추가 필드 존재: {sorted(extra_fields)}")

    if disallowed_fields:
        errors.append(f"수치형/분석 필드가 FinalReport에 포함됨: {sorted(disallowed_fields)}")

    if not isinstance(report_dict.get("key_concepts"), dict):
        errors.append("key_concepts는 dict이어야 합니다.")

    if not isinstance(report_dict.get("misconception_summary"), list):
        errors.append("misconception_summary는 list[str]이어야 합니다.")

    if not isinstance(report_dict.get("session_summary"), str):
        errors.append("session_summary는 string이어야 합니다.")

    if not isinstance(report_dict.get("detailed_report"), str):
        errors.append("detailed_report는 string이어야 합니다.")

    return errors


# ─────────────────────────────────────────────────────────────
# Mock client for JSON repair test
# ─────────────────────────────────────────────────────────────

class MockMessage:
    def __init__(self, content: str):
        self.content = content


class MockChoice:
    def __init__(self, content: str):
        self.message = MockMessage(content)


class MockResponse:
    def __init__(self, content: str):
        self.choices = [MockChoice(content)]


class MockChatCompletions:
    def __init__(self, content_to_return: str, should_fail: bool = False):
        self.content_to_return = content_to_return
        self.should_fail = should_fail
        self.call_count = 0

    async def create(self, **kwargs):
        self.call_count += 1

        if self.should_fail:
            raise RuntimeError("Mock repair LLM failure")

        return MockResponse(self.content_to_return)


class MockChat:
    def __init__(self, completions: MockChatCompletions):
        self.completions = completions


class MockClient:
    def __init__(self, content_to_return: str, should_fail: bool = False):
        self.chat = MockChat(
            MockChatCompletions(
                content_to_return=content_to_return,
                should_fail=should_fail,
            )
        )


# ─────────────────────────────────────────────────────────────
# Test runner
# ─────────────────────────────────────────────────────────────

async def run_report_case(
    title: str,
    messages: list[dict],
    session_id: str,
    student_id: str,
    force_long_path: bool = False,
) -> dict:
    print("\n" + "=" * 70)
    print(f"🧪 {title}")
    print("=" * 70)

    print("\n[INFO] 테스트 대화 내용:")
    pretty_print_messages(messages)

    original_threshold = report_builder.SHORT_SESSION_TOKEN_THRESHOLD

    if force_long_path:
        report_builder.SHORT_SESSION_TOKEN_THRESHOLD = 100
        print("\n[INFO] 긴 세션 경로 강제 활성화: SHORT_SESSION_TOKEN_THRESHOLD = 100")

    print("\n[INFO] 리포트 생성 중...")

    try:
        report = await generate_final_report(
            chat_messages=messages,
            session_id=session_id,
            student_id=student_id,
        )

        report_dict = to_report_dict(report)

        print("\n✅ [생성 완료] FinalReport")
        print(json.dumps(report_dict, ensure_ascii=False, indent=2))

        schema_errors = validate_report_schema(report_dict)

        if schema_errors:
            print("\n❌ [스키마 검증 실패]")
            for err in schema_errors:
                print(f"- {err}")
        else:
            print("\n✅ [스키마 검증 통과] FinalReport 4개 필드만 포함")

        return {
            "title": title,
            "success": not bool(schema_errors),
            "schema_errors": schema_errors,
            "report": report_dict,
        }

    except Exception as e:
        print(f"\n❌ [ERROR] 테스트 실패: {e}")
        return {
            "title": title,
            "success": False,
            "schema_errors": [str(e)],
            "report": None,
        }

    finally:
        if force_long_path:
            report_builder.SHORT_SESSION_TOKEN_THRESHOLD = original_threshold
            print(f"\n[INFO] SHORT_SESSION_TOKEN_THRESHOLD 복구: {original_threshold}")


async def run_json_parse_repair_fallback_case() -> dict:
    print("\n" + "=" * 70)
    print("🧪 9. JSON 파싱 실패 시 repair/fallback 동작 테스트")
    print("=" * 70)

    results = []

    # 9-1. 깨진 JSON → 1차 파싱 실패 확인
    broken_json = """
    {
      "key_concepts": {
        "main_concepts": ["관계대명사"],
        "weak_concepts": ["없음"]
      },
      "misconception_summary": ["없음"],
      "session_summary": "관계대명사의 기본 구조를 이해했습니다.",
      "detailed_report": "학생은 관계대명사의 기본 역할을 이해했습니다."
    """

    print("\n[9-1] 깨진 JSON에 대해 1차 파싱 실패가 발생하는지 확인")

    try:
        _parse_report_json(broken_json)
        print("❌ 예상과 달리 깨진 JSON이 파싱되었습니다.")
        results.append(False)
    except Exception as e:
        print(f"✅ 1차 파싱 실패 정상 감지: {type(e).__name__}: {e}")
        results.append(True)

    # 9-2. 깨진 JSON → repair 성공 확인
    repaired_json = json.dumps(
        {
            "key_concepts": {
                "main_concepts": ["관계대명사", "주격 관계대명사", "목적격 관계대명사"],
                "weak_concepts": ["없음"],
            },
            "misconception_summary": ["없음"],
            "session_summary": "관계대명사의 주격과 목적격 차이를 최종적으로 구분했습니다.",
            "detailed_report": "학생은 초반에 관계대명사를 단순히 문장을 연결하는 말로만 이해했지만, 이후 대명사 역할까지 포함한다는 점을 이해하는 방향으로 발전했습니다. 주격 관계대명사와 목적격 관계대명사의 차이도 예문을 통해 구분하는 모습을 보였습니다. 특히 목적격 관계대명사 뒤에 대명사 it을 반복해서 쓰면 안 된다는 점을 정정했습니다. 뚜렷한 오개념은 최종적으로 확인되지 않았습니다.",
        },
        ensure_ascii=False,
    )

    print("\n[9-2] repair LLM mock 응답으로 FinalReport 복구가 되는지 확인")

    try:
        mock_client = MockClient(content_to_return=repaired_json)
        repaired_report = await _repair_and_parse_report_json(mock_client, broken_json)
        repaired_report_dict = to_report_dict(repaired_report)
        schema_errors = validate_report_schema(repaired_report_dict)

        if schema_errors:
            print("❌ repair 후 스키마 검증 실패")
            for err in schema_errors:
                print(f"- {err}")
            results.append(False)
        else:
            print("✅ repair 성공 및 FinalReport 스키마 검증 통과")
            print(json.dumps(repaired_report_dict, ensure_ascii=False, indent=2))
            results.append(True)

    except Exception as e:
        print(f"❌ repair 성공 케이스 실패: {e}")
        results.append(False)

    # 9-3. repair LLM까지 실패 → fallback report 확인
    print("\n[9-3] repair까지 실패했을 때 fallback report가 생성되는지 확인")

    try:
        mock_client_fail = MockClient(content_to_return="", should_fail=True)

        try:
            await _repair_and_parse_report_json(mock_client_fail, broken_json)
            print("❌ 예상과 달리 repair 실패가 발생하지 않았습니다.")
            results.append(False)
        except Exception:
            fallback_report = _fallback_parse_error_report(broken_json)
            fallback_report_dict = to_report_dict(fallback_report)
            schema_errors = validate_report_schema(fallback_report_dict)

            if schema_errors:
                print("❌ fallback report 스키마 검증 실패")
                for err in schema_errors:
                    print(f"- {err}")
                results.append(False)
            else:
                print("✅ fallback report 생성 및 스키마 검증 통과")
                print(json.dumps(fallback_report_dict, ensure_ascii=False, indent=2))
                results.append(True)

    except Exception as e:
        print(f"❌ fallback 테스트 실패: {e}")
        results.append(False)

    success = all(results)

    return {
        "title": "9. JSON 파싱 실패 시 repair/fallback 동작 테스트",
        "success": success,
        "schema_errors": [] if success else ["JSON repair/fallback 테스트 일부 실패"],
        "report": None,
    }


async def main():
    print("\n" + "=" * 70)
    print("📝 학생별 최종 리포트 생성 파이프라인 테스트")
    print("=" * 70)

    test_results = []

    test_results.append(
        await run_report_case(
            title="1. 정상 학습 세션 테스트 - 관계대명사",
            messages=NORMAL_LEARNING_MESSAGES,
            session_id="test_session_normal_grammar",
            student_id="test_student_001",
        )
    )

    test_results.append(
        await run_report_case(
            title="2. 짧은 세션 테스트 - 현재완료",
            messages=SHORT_SESSION_MESSAGES,
            session_id="test_session_short_grammar",
            student_id="test_student_002",
        )
    )

    test_results.append(
        await run_report_case(
            title="3. 빈 세션 테스트 - 수동태",
            messages=EMPTY_STUDENT_MESSAGES,
            session_id="test_session_empty_grammar",
            student_id="test_student_003",
        )
    )

    # test_results.append(
    #     await run_report_case(
    #         title="4. 긴 세션 테스트 - 관계대명사 chunk summary + synthesis 경로",
    #         messages=build_long_session_messages(repeat_count=12),
    #         session_id="test_session_long_grammar",
    #         student_id="test_student_004",
    #         force_long_path=True,
    #     )
    # )
    # 
    # test_results.append(
    #     await run_report_case(
    #         title="5. 잡담 위주 세션 테스트",
    #         messages=CHITCHAT_MESSAGES,
    #         session_id="test_session_chitchat_grammar",
    #         student_id="test_student_005",
    #     )
    # )
    # 
    # test_results.append(
    #     await run_json_parse_repair_fallback_case()
    # )

    print("\n" + "=" * 70)
    print("📌 테스트 요약")
    print("=" * 70)

    for result in test_results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        print(f"{status} - {result['title']}")

    print("\n[NOTE]")
    print("- 이 스크립트는 generate_final_report 및 JSON repair/fallback 단위 테스트에 가깝습니다.")
    print("- student_reports 저장 여부, dialogs.is_analyzed 업데이트, real_time_analysis DB 유지 여부는 /end-session 통합 테스트에서 별도 확인하세요.")


if __name__ == "__main__":
    asyncio.run(main())
