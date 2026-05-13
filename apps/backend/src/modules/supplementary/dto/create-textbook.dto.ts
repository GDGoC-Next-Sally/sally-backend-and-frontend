import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTextbookDto {
  @ApiProperty({ description: '과목명', example: '수학' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: '출판사', example: '비상교육', required: false })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiProperty({ description: '출판연도', example: 2025, required: false })
  @IsOptional()
  @IsInt()
  year_published?: number;
}
