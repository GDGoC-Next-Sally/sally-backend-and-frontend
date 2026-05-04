// apps/backend/src/modules/sessions/dto/update-session.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateSessionDto } from './create-session.dto';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {}
