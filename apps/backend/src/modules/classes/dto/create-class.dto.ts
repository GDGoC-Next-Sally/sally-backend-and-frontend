import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateClassDto {
  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsInt()
  @IsOptional()
  grade?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  homeroom?: string;

  @ApiProperty()
  @IsString()
  explanation: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  theme?: string;
}