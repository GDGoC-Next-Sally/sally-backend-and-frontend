import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JoinClassDto } from './dto/join-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { user_role as UserRole } from '.prisma/client';

@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) { }

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '새로운 수업 생성' })
  create(@Req() req: any, @Body() createClassDto: CreateClassDto) {
    return this.classesService.create(req.user.userId, createClassDto);
  }

  @Patch(':id/invite')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업 초대 코드 재발급' })
  reissueInviteCode(@Param('id') id: string, @Req() req: any) {
    return this.classesService.reissueInviteCode(req.user.userId, +id);
  }

  @Patch(':id/registerable')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업 가입 가능 여부 변경' })
  changeRegisterable(@Param('id') id: string, @Req() req: any) {
    return this.classesService.changeRegisterable(req.user.userId, +id);
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '선생님 담당 수업 목록 조회' })
  findAllByTeacherId(@Req() req: any) {
    return this.classesService.findAllByTeacherId(req.user.userId);
  }

  @Get('student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '학생 수강 수업 목록 조회' })
  findAllByStudentId(@Req() req: any) {
    return this.classesService.findAllByStudentId(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '특정 수업 상세 조회' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.classesService.findOne(+id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업 정보 수정' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto, @Req() req: any) {
    return this.classesService.update(+id, updateClassDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업 삭제' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.classesService.remove(+id, req.user.userId);
  }

  @Post('student/join')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '수업 참여' })
  joinClass(@Body() joinClassDto: JoinClassDto, @Req() req: any) {
    return this.classesService.joinClass(req.user.userId, joinClassDto.invite_code);
  }

  @Post('student/:id/leave')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '수업 나가기' })
  leaveClass(@Param('id') id: string, @Req() req: any) {
    return this.classesService.leaveClass(+id, req.user.userId);
  }

  @Post('teacher/:id/kick')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업에서 학생 강퇴' })
  kickStudent(@Param('id') id: string, @Body('student_id') studentId: string, @Req() req: any) {
    return this.classesService.kickStudent(+id, req.user.userId, studentId);
  }

  @Get(':id/students')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '특정 수업의 학생 목록 조회' })
  getStudents(@Param('id') id: string, @Req() req: any) {
    return this.classesService.getStudents(+id, req.user.userId);
  }
}
