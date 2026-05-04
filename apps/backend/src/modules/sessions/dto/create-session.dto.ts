import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, IsDateString, Min, Max } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: '연결된 클래스 ID' })
  @IsInt()
  class_id: number;

  @ApiProperty({ description: '세션(수업) 이름' })
  @IsString()
  session_name: string;

  @ApiProperty({ description: '학습 목표', required: false })
  @IsString()
  @IsOptional()
  objective?: string;

  @ApiProperty({ description: '세션 프롬프트 ( Snapshot)', required: false })
  @IsString()
  @IsOptional()
  session_prompt?: string;

  @ApiProperty({ description: '세션 설명', required: false })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiProperty({ description: '수업 예정일 (YYYY-MM-DD)', required: false })
  @IsDateString()
  @IsOptional()
  scheduled_date?: string;

  @ApiProperty({ description: '수업 예정 시작 시간 (ISO8601)', required: false })
  @IsDateString()
  @IsOptional()
  scheduled_start?: string;

  @ApiProperty({ description: '수업 예정 종료 시간 (ISO8601)', required: false })
  @IsDateString()
  @IsOptional()
  scheduled_end?: string;

  @ApiProperty({ description: '교시', minimum: 0, maximum: 20, required: false })
  @IsInt()
  @Min(0)
  @Max(20)
  @IsOptional()
  period?: number;
}
