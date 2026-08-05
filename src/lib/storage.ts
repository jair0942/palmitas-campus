import { getSupabaseAdmin, storageBucket } from "./supabase";

export interface StorageProvider {
  ensureBucket(): Promise<void>;
  save(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  delete(key: string): Promise<void>;
  createSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

class SupabaseStorageProvider implements StorageProvider {
  private bucketReady: Promise<void> | null = null;

  ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = this.ensureBucketImpl().catch((err) => {
        this.bucketReady = null;
        throw err;
      });
    }
    return this.bucketReady;
  }

  private async ensureBucketImpl(): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error: getError } = await supabase.storage.getBucket(storageBucket);
    if (!getError) return;
    const { error: createError } = await supabase.storage.createBucket(storageBucket, {
      public: false,
    });
    if (createError) {
      throw new Error(`No se pudo crear el bucket privado '${storageBucket}': ${createError.message}`);
    }
  }

  async save(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.ensureBucket();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(storageBucket).upload(key, buffer, {
      contentType: mimeType,
      upsert: false,
      cacheControl: "3600",
    });
    if (error) {
      throw new Error(`No se pudo subir el objeto: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(storageBucket).remove([key]);
    if (error && error.message && !error.message.toLowerCase().includes("not found")) {
      throw new Error(`No se pudo eliminar el objeto: ${error.message}`);
    }
  }

  async createSignedUrl(key: string, expiresInSeconds = 120): Promise<string> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(key, expiresInSeconds);
    if (error || !data?.signedUrl) {
      throw new Error(`No se pudo generar URL firmada: ${error?.message ?? "sin datos"}`);
    }
    return data.signedUrl;
  }
}

const storage: StorageProvider = new SupabaseStorageProvider();

export default storage;
