import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../../providers/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly prismaService: PrismaService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // [핵심] 비밀키 대신 Supabase의 공개키 주소(JWKS)를 사용합니다.
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ['ES256'],
    });
  }

  // 검증 성공했을 때 실행
  async validate(payload: any) {
    console.log('토큰 검증 성공! 페이로드:', payload);
    const user = await this.prismaService.users.findFirst({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException(`User #${payload.sub} not found`);
    }
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  }
}