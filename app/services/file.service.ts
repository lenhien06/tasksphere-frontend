import { apiJava } from '@/lib/axios'
import { FileControlDetailType, FileControlType } from '../types/file.schema'

export class FileService {
  private static readonly PREFIX = '/files'

  static async tmpUpload(body: FormData): Promise<FileControlDetailType> {
    const response = await apiJava.post<FileControlDetailType>(`${this.PREFIX}/tmpUpload`, body, {
      headers: { 'Content-Type': undefined }
    })
    return response.data
  }

  static async fileDownload(body: FileControlType): Promise<FileControlDetailType> {
    const response = await apiJava.post<FileControlDetailType>(`${this.PREFIX}/download`, body)
    return response.data
  }
}
