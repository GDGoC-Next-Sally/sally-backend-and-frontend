import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from 'class-validator';

export class JoinClassDto {
  @ApiProperty({ description: 'The invite code of the class' })
  @IsString()
  @IsNotEmpty({ message: '초대 코드는 필수 항목입니다.' })
  invite_code: string;
}
