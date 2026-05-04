import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({ description: '대화방(다이얼로그) ID', example: 1 })
  @IsInt()
  dialog_id: number;

  @ApiProperty({ description: '보낼 메시지 내용', example: '인공지능이 뭐야?' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '선생님 개입 메시지 (있을 경우 함께 전송)', required: false })
  @IsString()
  @IsOptional()
  intervention?: string;
}
