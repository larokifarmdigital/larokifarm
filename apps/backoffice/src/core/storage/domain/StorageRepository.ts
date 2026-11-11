// PORT: almacenamiento de objetos binarios (imágenes, PDFs…) por key.
// Sin dependencias: core/storage es genérico, el layout de keys lo decide
// cada dominio consumidor (ver core/farmacias/domain/contentImageKey.ts).
export interface StorageRepository {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  read(key: string): Promise<{ data: Buffer; contentType: string }>;
  delete(key: string): Promise<void>;
}
