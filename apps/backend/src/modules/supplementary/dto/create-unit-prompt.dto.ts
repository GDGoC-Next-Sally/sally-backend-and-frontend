import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUnitPromptDto {
  @ApiProperty({ description: '교과서 ID (선택)', example: 1, required: false })
  @IsOptional()
  @IsInt()
  textbook_id?: number;

  @ApiProperty({ description: '학습 목표', example: '이차방정식의 근의 공식을 이해한다' })
  @IsString()
  @IsNotEmpty()
  objective: string;

  @ApiProperty({ description: '프롬프트 내용', example: '학생에게 이차방정식의 근의 공식을 단계별로 설명하세요...' })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
