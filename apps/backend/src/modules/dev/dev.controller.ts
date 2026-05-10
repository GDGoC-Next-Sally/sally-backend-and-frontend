import { Controller, Get, Post, Res } from '@nestjs/common';
import { DevService } from './dev.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';

@ApiTags('dev')
@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Post('seed')
  @ApiOperation({ summary: '테스트용 더미 데이터 세팅 및 JWT 토큰 발급' })
  async seed() {
    return this.devService.seedAndGetTokens();
  }

  @Get('ui')
  @ApiOperation({ summary: '원클릭 개발자용 채팅 테스트 UI' })
  getUi(@Res() res: Response) {
    const htmlPath = path.join(process.cwd(), 'src/modules/dev/dev-chat.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.type('html').send(html);
  }
}
