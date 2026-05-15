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

  @ApiProperty({ description: '교시 (0~20), 요일이 FLEXIBLE일 경우 생략 가능', minimum: 0, maximum: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  period?: number;
}

// apps/backend/src/modules/classes/dto/create-class.dto.ts

export class CreateClassDto {
  @ApiProperty({ description: '과목명', example: '인공지능과 미래사회' })
  @IsString()
  subject: string;

  @ApiProperty({ description: '학년', example: 1, required: false })
  @IsInt()
  @IsOptional()
  grade?: number;

  @ApiProperty({ description: '반 정보', example: 'A반', required: false })
  @IsString()
  @IsOptional()
  homeroom?: string;

  @ApiProperty({ description: '클래스 설명', example: '2024년 1학기 정보 수업입니다.' })
  @IsOptional()
  @IsString()
  explanation: string;

  @ApiProperty({ description: '클래스 테마/색상', example: 'indigo', required: false })
  @IsString()
  @IsOptional()
  theme?: string;

  @ApiProperty({
    type: [ScheduleDto],
    description: '수업 시간표 (요일 및 교시 배열)',
    example: [
      { day: 'MON', period: 1 },
      { day: 'WED', period: 3 }
    ],
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  @IsOptional()
  schedule?: ScheduleDto[];
}
