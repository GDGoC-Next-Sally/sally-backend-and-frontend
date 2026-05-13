import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class UpdateTextbookDto {
  @ApiProperty({ description: '과목명', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: '출판사', required: false })
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiProperty({ description: '출판연도', required: false })
  @IsOptional()
  @IsInt()
  year_published?: number;
}
