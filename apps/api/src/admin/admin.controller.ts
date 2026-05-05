import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('catalog/bulk-upload')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadCatalog(
    @UploadedFile() file: Express.Multer.File,
    @Body('preview') previewStr?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }
    const isPreview = previewStr === 'true';
    return this.adminService.processBulkUpload(file, isPreview);
  }
}
