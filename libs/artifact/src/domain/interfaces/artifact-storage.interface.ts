export interface IStorageService {
  upload(key: string, content: string, contentType?: string): Promise<{ size: number; checksum: string }>
  download(key: string): Promise<string>
  delete(key: string): Promise<void>
  getBucket(): string
}
