/*
 * SPDX-FileCopyrightText: 2025 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  AuthProviderType,
  LoginUserInfoSchema,
  MediaUploadSchema,
  NoteMetadataSchema,
} from '@hedgedoc/commons';
import { User } from '@hedgedoc/database';
import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { LoginUserInfoDto } from '../../../dtos/login-user-info.dto';
import { MediaUploadDto } from '../../../dtos/media-upload.dto';
import { NoteMetadataDto } from '../../../dtos/note-metadata.dto';
import { ConsoleLoggerService } from '../../../logger/console-logger.service';
import { MediaService } from '../../../media/media.service';
import { NoteScope, NoteService } from '../../../notes/note.service';
import { UsersService } from '../../../users/users.service';
import { OpenApi } from '../../utils/decorators/openapi.decorator';
import { RequestUserId } from '../../utils/decorators/request-user-id.decorator';
import { ApiTokenGuard } from '../../utils/guards/api-token.guard';

@UseGuards(ApiTokenGuard)
@OpenApi(401, 403, 429)
@ApiTags('me')
@ApiSecurity('token')
@Controller('me')
export class MeController {
  constructor(
    private readonly logger: ConsoleLoggerService,
    private usersService: UsersService,
    private notesService: NoteService,
    private mediaService: MediaService,
  ) {
    this.logger.setContext(MeController.name);
  }

  @Get()
  @OpenApi({
    code: 200,
    description: 'The user information',
    schema: LoginUserInfoSchema,
  })
  async getMe(@RequestUserId() userId: number): Promise<LoginUserInfoDto> {
    const user: User = await this.usersService.getUserById(userId);
    return this.usersService.toLoginUserInfoDto(user, AuthProviderType.TOKEN);
  }

  @Get('notes')
  @OpenApi({
    code: 200,
    description: 'Metadata of notes accessible to the user. Scope: my (owned), shared (shared with user), public (public notes), pinned (pinned by user). Default: my.',
    isArray: true,
    schema: NoteMetadataSchema,
  })
  async getMyNotes(
    @RequestUserId() userId: number,
    @Query('scope') scope: string = 'my',
  ): Promise<NoteMetadataDto[]> {
    if (!Object.values(NoteScope).includes(scope as NoteScope)) {
      throw new BadRequestException(`Invalid scope: ${scope}. Must be one of: ${Object.values(NoteScope).join(', ')}`);
    }
    const noteIds = await this.notesService.getNoteIdsByScope(scope as NoteScope, userId);
    return await Promise.all(noteIds.map((note) => this.notesService.toNoteMetadataDto(note)));
  }

  @Get('media')
  @OpenApi({
    code: 200,
    description: 'All media uploads of the user',
    isArray: true,
    schema: MediaUploadSchema,
  })
  async getMyMedia(@RequestUserId() userId: number): Promise<MediaUploadDto[]> {
    const media = await this.mediaService.getMediaUploadUuidsByUserId(userId);
    return await this.mediaService.getMediaUploadDtosByUuids(media);
  }
}
