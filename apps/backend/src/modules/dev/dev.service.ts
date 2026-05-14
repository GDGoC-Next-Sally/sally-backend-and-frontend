import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { SupabaseService } from '../../providers/supabase/supabase.service';

@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async seedAndGetTokens() {
    const supabase = this.supabaseService.getClient();

    // 1. Supabase Auth 계정 확보
    const teacherEmail = 'dev_teacher@sally.com';
    const studentEmail = 'dev_student@sally.com';
    const password = 'Password123!';

    const getAuth = async (email: string, role: string, name: string) => {
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email, password
      });

      if (signInError) {
        // 계정이 없으면 회원가입
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email, password, options: { data: { role, name } }
        });
        if (signUpError) throw new Error(`SignUp failed for ${email}: ${signUpError.message}`);
        
        // 가입 후 다시 로그인 시도
        const retry = await supabase.auth.signInWithPassword({ email, password });
        signInData = retry.data;
      }
      return signInData;
    };

    const teacherAuth = await getAuth(teacherEmail, 'TEACHER', 'Dev Teacher');
    const studentAuth = await getAuth(studentEmail, 'STUDENT', 'Dev Student');

    const teacherId = teacherAuth.user?.id;
    const studentId = studentAuth.user?.id;
    
    if (!teacherId || !studentId) throw new Error("Failed to get user IDs");

    // Users 테이블은 Supabase 트리거가 만들어줬을 것이므로 role만 확실히 셋팅
    await this.prisma.users.update({
      where: { id: teacherId },
      data: { role: 'TEACHER' }
    });
    
    await this.prisma.users.update({
      where: { id: studentId },
      data: { role: 'STUDENT' }
    });

    // 2. 클래스 Upsert (invite_code 고정)
    let devClass = await this.prisma.classes.findFirst({ where: { invite_code: 'DEV123' } });
    if (!devClass) {
      devClass = await this.prisma.classes.create({
        data: {
          teacher_id: teacherId,
          subject: '영어',
          theme: '고등 영어 미래가정법 작문',
          invite_code: 'DEV123',
        }
      });
    }

    // 3. 수강 신청 (Takes)
    const existingTake = await this.prisma.takes.findFirst({
      where: { class_id: devClass.id, student_id: studentId }
    });
    if (!existingTake) {
      await this.prisma.takes.create({
        data: { class_id: devClass.id, student_id: studentId }
      });
    }

    // 4. 세션 Upsert
    let devSession = await this.prisma.sessions.findFirst({ where: { session_name: 'Dev Test Session' } });
    if (!devSession) {
      devSession = await this.prisma.sessions.create({
        data: {
          class_id: devClass.id,
          teacher_id: teacherId,
          session_name: 'Dev Test Session',
          status: 'ACTIVE',
        }
      });
    } else if (devSession.status !== 'ACTIVE') {
      await this.prisma.sessions.update({
        where: { id: devSession.id },
        data: { status: 'ACTIVE' }
      });
    }

    // 5. 다이얼로그 Upsert
    let devDialog = await this.prisma.dialogs.findFirst({
      where: { session_id: devSession.id, student_id: studentId }
    });
    if (!devDialog) {
      devDialog = await this.prisma.dialogs.create({
        data: {
          session_id: devSession.id,
          student_id: studentId,
          status: true
        }
      });
    } else if (devDialog.status !== true) {
        await this.prisma.dialogs.update({
            where: { id: devDialog.id },
            data: { status: true }
        });
    }

    return {
      teacherId,
      studentId,
      classId: devClass.id,
      sessionId: devSession.id,
      dialogId: devDialog.id,
      teacherToken: teacherAuth.session?.access_token,
      studentToken: studentAuth.session?.access_token,
    };
  }
  async insertDummyChat(dialogId: number) {
    // 기존 채팅 및 리포트 삭제
    await this.prisma.student_reports.deleteMany({ where: { dialog_id: dialogId } });
    await this.prisma.chat_messages.deleteMany({
      where: { dialog_id: dialogId }
    });

    const dummyData = [
      { sender_type: 'AI', content: '안녕하세요! 오늘 배울 내용에 대해 설명해 드릴게요. 혹시 가정법에 대해 들어보신 적 있나요?' },
      { sender_type: 'STUDENT', content: '아니요 잘 모르겠어요.' },
      { sender_type: 'AI', content: '괜찮아요! 만약 내가 새라면, 너에게 날아갈 텐데. 이런 문장이 가정법이에요. 이해가 되나요?' },
      { sender_type: 'STUDENT', content: '아 네 이해했어요.' },
      { sender_type: 'AI', content: '그럼 방금 배운 문장을 영어로 어떻게 표현할 수 있을까요? 힌트: If I were a bird...' },
      { sender_type: 'STUDENT', content: 'If I were a bird, I would fly to you?' },
      { sender_type: 'AI', content: '완벽해요! 아주 잘 하셨습니다.' },
    ];

    for (const msg of dummyData) {
      await this.prisma.chat_messages.create({
        data: {
          dialog_id: dialogId,
          sender_type: msg.sender_type as any,
          content: msg.content,
        }
      });
      // 1초 간격을 줘서 생성 시간이 다르게 들어가도록 함 (정렬을 위해)
      await new Promise(res => setTimeout(res, 100));
    }
    
    // 다이얼로그 분석 상태 초기화
    await this.prisma.dialogs.update({
      where: { id: dialogId },
      data: { is_analyzed: false }
    });

    return { message: '더미 채팅 데이터 생성 완료', data: dummyData };
  }
}
