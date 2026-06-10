import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';
import { documentFileFilter } from './utils/document-file-filter';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: any) {
    return this.documentsService.create(dto, Number(user.sub));
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.documentsService.findByProject(projectId);
  }

  @Get('versions/:versionId/download')
  async downloadVersion(
    @Param('versionId', ParseIntPipe) versionId: number,
    @Res() res: Response,
  ) {
    const version = await this.documentsService.findVersion(versionId);
    const filePath = join(process.cwd(), version.filePath);

    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    const safeFileName = String(version.fileName || `document-version-${versionId}`)
      .replace(/\r|\n/g, '')
      .replace(/"/g, '');

    res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);

    return createReadStream(filePath).pipe(res);
  }

  @Post('versions')
  createVersion(@Body() dto: CreateDocumentVersionDto, @CurrentUser() user: any) {
    return this.documentsService.createVersion(dto, Number(user.sub));
  }

  @Get(':id/versions')
  findVersions(@Param('id', ParseIntPipe) documentId: number) {
    return this.documentsService.findVersions(documentId);
  }

  @Post(':id/upload-version')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/documents',
        filename: (_req, file, callback) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const uniqueName = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}-${safeName}`;
          callback(null, uniqueName);
        },
      }),
      fileFilter: documentFileFilter,
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadVersion(
    @Param('id', ParseIntPipe) documentId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('revision') revision: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.createVersion(
      {
        documentId,
        revision: revision?.trim().toUpperCase(),
        status: status as any,
        fileName: file.originalname,
        filePath: file.path.replace(/\\/g, '/'),
        fileSize: file.size,
        mimeType: file.mimetype,
        notes,
      },
      Number(user.sub),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.update(id, dto, Number(user.sub));
  }

  @Patch(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.documentsService.archive(id, Number(user.sub));
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('rejectionReason') rejectionReason: string,
    @CurrentUser() user: any,
  ) {
    return this.documentsService.changeStatus(
      id,
      status,
      rejectionReason,
      Number(user.sub),
    );
  }
}