import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
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
  @ApiOperation({ summary: 'Create a new class' })
  create(@Req() req: any, @Body() createClassDto: CreateClassDto) {
    return this.classesService.create(req.user.userId, createClassDto);
  }

  @Patch(':id/invite')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Reissue an invite code for a class' })
  reissueInviteCode(@Param('id') id: string, @Req() req: any) {
    return this.classesService.reissueInviteCode(req.user.userId, +id);
  }

  @Patch(':id/registerable')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Change registerable status of a class' })
  changeRegisterable(@Param('id') id: string, @Req() req: any) {
    return this.classesService.changeRegisterable(req.user.userId, +id);
  }

  @Get('teacher')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Find all classes by teacher id' })
  findAllByTeacherId(@Req() req: any) {
    return this.classesService.findAllByTeacherId(req.user.userId);
  }

  @Get('student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Find all classes by student id' })
  findAllByStudentId(@Req() req: any) {
    return this.classesService.findAllByStudentId(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a class by id' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.classesService.findOne(+id, req.user.userId);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a class' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto, @Req() req: any) {
    return this.classesService.update(+id, updateClassDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove a class' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.classesService.remove(+id, req.user.userId);
  }
}
