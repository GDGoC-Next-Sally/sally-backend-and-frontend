import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: '대화방(다이얼로그) ID', example: 1 })
  @IsInt()
  dialog_id: number;

  @ApiProperty({ description: '보낼 메시지 내용', example: '인공지능이 뭐야?' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '교사 개입 요청 여부', example: true })
  @IsOptional()
  @IsBoolean()
  need_intervention?: boolean = false;
}
