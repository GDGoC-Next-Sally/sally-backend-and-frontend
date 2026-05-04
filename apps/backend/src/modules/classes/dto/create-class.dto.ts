import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsOptional, IsArray, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
  FLEXIBLE = 'FLEXIBLE', // 고정된 요일/시간 없음
}

export class ScheduleDto {
  @ApiProperty({ enum: DayOfWeek, description: '요일 (FLEXIBLE 선택 시 시간 지정 없음)' })
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @ApiProperty({ description: '교시 (1~10), 요일이 FLEXIBLE일 경우 생략 가능', minimum: 1, maximum: 10, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  period?: number;
}

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

  @ApiProperty({ type: [ScheduleDto], description: '수업 시간표 (교시 정보)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  @IsOptional()
  schedule?: ScheduleDto[];
}