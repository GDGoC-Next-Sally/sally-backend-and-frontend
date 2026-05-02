import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '내 프로필 및 역할 정보 조회' })
  getProfile(@Req() req: any) {
    // jwt.strategy.ts의 validate()에서 리턴한 { userId, email, role }가 담겨 있습니다.
    return req.user;
  }
}
