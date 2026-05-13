import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';

/**
 * 세션이 존재하는지 확인하고, 해당 선생님 소유인지 검증합니다.
 * 조건 불일치 시 NotFoundException 또는 UnauthorizedException을 throw합니다.
 *
 * @returns 검증된 세션 객체
 */
export async function validateSessionOwner(
  prisma: PrismaService,
  sessionId: number,
  teacherId: string,
) {
  const session = await prisma.sessions.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundException(`세션 #${sessionId}를 찾을 수 없습니다.`);
  }

  if (session.teacher_id !== teacherId) {
    throw new UnauthorizedException('해당 세션에 대한 권한이 없습니다.');
  }

  return session;
}
