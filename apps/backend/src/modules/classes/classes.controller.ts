import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  create(@Req() req: any, @Body() createClassDto: CreateClassDto) {
    const teacherId = req.user.userId; // JwtStrategy에서 리턴한 userId를 사용
    // id의 role이 student인지 teacher인지 확인하고 teacher일 때만 허용
    return this.classesService.create(teacherId, createClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all classes' })
  findAllTeacher(@Req() req: any) {
    return this.classesService.findAllTeacher(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a class by id' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.classesService.findOne(+id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a class' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto, @Req() req: any) {
    return this.classesService.update(+id, updateClassDto, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a class' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.classesService.remove(+id, req.user.userId);
  }
}
