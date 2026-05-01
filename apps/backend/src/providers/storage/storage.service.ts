import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Supabase Storage에 파일을 업로드합니다.
   * @param file Express.Multer.File 객체
   * @param bucket 버킷 이름 (기본값: 'sally-storage')
   * @param folder 폴더 경로 (선택 사항)
   */
  async uploadFile(
    file: Express.Multer.File,
    bucket: string = 'sally-storage',
    folder: string = 'uploads',
  ) {
    const client = this.supabaseService.getClient();
    
    // 파일명 중복 방지를 위한 고유 파일명 생성
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await client.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw error;
    }

    // 업로드된 파일의 Public URL 가져오기
    const { data: publicUrlData } = client.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      path: data.path,
      url: publicUrlData.publicUrl,
      fileName: fileName,
      originalName: file.originalname,
    };
  }

  /**
   * Supabase Storage에서 파일을 삭제합니다.
   * @param filePath 파일 경로
   * @param bucket 버킷 이름
   */
  async deleteFile(filePath: string, bucket: string = 'sally-storage') {
    const client = this.supabaseService.getClient();
    const { error } = await client.storage.from(bucket).remove([filePath]);

    if (error) {
      this.logger.error(`File deletion failed: ${error.message}`);
      throw error;
    }

    return true;
  }
}
