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
          subject: '수학',
          theme: 'Dev Test Class',
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
}
