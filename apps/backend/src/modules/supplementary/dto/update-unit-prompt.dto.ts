import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class UpdateUnitPromptDto {
  @ApiProperty({ description: '교과서 ID (선택)', example: 1, required: false })
  @IsOptional()
  @IsInt()
  textbook_id?: number;

  @ApiProperty({ description: '학습 목표', required: false })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiProperty({ description: '프롬프트 내용', required: false })
  @IsOptional()
  @IsString()
  prompt?: string;
}
