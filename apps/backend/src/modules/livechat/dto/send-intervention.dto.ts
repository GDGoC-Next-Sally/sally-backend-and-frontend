import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendInterventionDto {
  @ApiProperty({ description: '대화방(다이얼로그) ID', example: 1 })
  @IsInt()
  dialog_id: number;

  @ApiProperty({ description: '개입할 메시지 내용 (학생에게 소켓으로 전송됨)', example: '질문을 조금 더 구체적으로 해볼까?' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '개입 종류 (ADVICE: 단순 조언, AI_GUIDANCE: AI의 다음 답변에 영향을 줌)',
    enum: ['ADVICE', 'AI_GUIDANCE'],
    example: 'AI_GUIDANCE',
    required: false
  })
  @IsString()
  @IsOptional()
  type?: 'ADVICE' | 'AI_GUIDANCE' = 'ADVICE';
}
