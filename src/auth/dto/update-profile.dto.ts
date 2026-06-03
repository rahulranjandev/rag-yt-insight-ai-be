import { PartialType } from '@nestjs/swagger';
import { BaseUserDto } from './base-user.dto';

export class UpdateProfileDto extends PartialType(BaseUserDto) {}
