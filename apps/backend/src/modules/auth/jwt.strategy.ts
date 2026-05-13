import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../../providers/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // 메모리 캐시 저장소 추가 (유저 ID -> { 유저 정보, 만료 시간 })
  private userCache = new Map<string, { user: any; expireAt: number }>();

  constructor(configService: ConfigService, private readonly prismaService: PrismaService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // 비밀키 대신 Supabase의 공개키 주소(JWKS)를 사용합니다.
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
    console.log('토큰 검증 성공! 페이로드:', { sub: payload.sub, email: payload.email, session_id: payload.session_id });
    
    // 1. 캐시에 데이터가 있고, 아직 유효하면 DB 조회 건너뛰기!
    const cachedData = this.userCache.get(payload.sub);
    if (cachedData && cachedData.expireAt > Date.now()) {
      console.log('⚡ 캐시된 유저 정보 사용! (DB 조회 생략)');
      return cachedData.user;
    }

    // 2. 캐시에 없거나 만료되었으면 DB 조회
    const user = await this.prismaService.users.findFirst({ where: { id: payload.sub } });
    if (!user) {
      throw new NotFoundException(`User #${payload.sub} not found`);
    }

    const userData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    // 3. 조회한 데이터를 3분(180,000ms) 동안 캐시에 저장
    this.userCache.set(payload.sub, {
      user: userData,
      expireAt: Date.now() + 180000 
    });

    console.log('💾 새로운 유저 정보 DB 조회 및 캐싱 완료');
    return userData;
  }
}