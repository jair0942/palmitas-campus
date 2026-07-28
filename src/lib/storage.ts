import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export interface StorageProvider {
  save(filename: string, buffer: Buffer): Promise<string>;
  delete(filename: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "public", "uploads");
  }

  async save(filename: string, buffer: Buffer): Promise<string> {
    await mkdir(this.baseDir, { recursive: true });
    await writeFile(path.join(this.baseDir, filename), buffer);
    return `/uploads/${filename}`;
  }

  async delete(filename: string): Promise<void> {
    try {
      await unlink(path.join(this.baseDir, filename));
    } catch {}
  }
}

const storage: StorageProvider = new LocalStorageProvider();

export default storage;
