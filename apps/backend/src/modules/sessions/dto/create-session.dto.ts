// apps/backend/src/modules/sessions/dto/create-session.dto.ts

import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: '연결된 클래스 ID', example: 1 })
  @IsInt()
  class_id: number;

  @ApiProperty({ description: '세션(수업) 이름', example: '1단원: 인공지능의 이해' })
  @IsString()
  session_name: string;

  @ApiProperty({ description: '학습 목표', example: '인공지능의 정의와 역사에 대해 설명할 수 있다.', required: false })
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiProperty({ description: '세션 프롬프트 (Snapshot)', example: '당신은 인공지능 선생님입니다...', required: false })
  @IsString()
  @IsOptional()
  session_prompt?: string;

  @ApiProperty({ description: '세션 설명', example: '이 수업은 체험 위주로 진행됩니다.', required: false })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ 
    description: '수업 예정일 (YYYY-MM-DD)', 
    example: '2024-05-15', 
    required: false 
  })
  @IsDateString()
  @IsOptional()
  scheduled_date?: string;

  @ApiProperty({ 
    description: '수업 예정 시작 시간 (ISO 8601)', 
    example: '2024-05-15T09:00:00Z', 
    required: false 
  })
  @IsDateString()
  @IsOptional()
  scheduled_start?: string;

  @ApiProperty({ 
    description: '수업 예정 종료 시간 (ISO 8601)', 
    example: '2024-05-15T09:50:00Z', 
    required: false 
  })
  @IsDateString()
  @IsOptional()
  scheduled_end?: string;

  @ApiProperty({ description: '교시', minimum: 0, maximum: 20, example: 1, required: false })
  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  period?: number;
}
