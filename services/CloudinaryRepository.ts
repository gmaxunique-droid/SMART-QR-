
export type UploadResult = 
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'success'; downloadUrl: string; publicId: string }
  | { status: 'error'; message: string; code?: string };

/**
 * Service class for Cloudinary Web uploads.
 * Uses the REST API with Unsigned presets for client-side security.
 */
export class CloudinaryRepository {
  // Replace these with your project settings
  private cloudName = "your_cloud_name";
  private uploadPreset = "your_unsigned_preset";

  /**
   * Performs an asynchronous upload with progress reporting.
   */
  async uploadFile(file: File, onUpdate: (result: UploadResult) => void): Promise<void> {
    if (!navigator.onLine) {
      onUpdate({ 
        status: 'error', 
        message: 'Network offline. Please check your internet connection.',
        code: 'network/offline'
      });
      return;
    }

    try {
      onUpdate({ status: 'loading', progress: 0 });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);

      const xhr = new XMLHttpRequest();
      // Using 'auto' as resource type lets Cloudinary handle different file types (PDF, ZIP, Images)
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onUpdate({ status: 'loading', progress });
        }
      };

      xhr.onload = () => {
        const response = JSON.parse(xhr.responseText);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          onUpdate({ 
            status: 'success', 
            downloadUrl: response.secure_url,
            publicId: response.public_id 
          });
        } else {
          onUpdate({ 
            status: 'error', 
            message: response.error?.message || 'Upload failed at Cloudinary server.',
            code: 'cloudinary/api_error'
          });
        }
      };

      xhr.onerror = () => {
        onUpdate({ 
          status: 'error', 
          message: 'A network error occurred during the upload.',
          code: 'network/failed'
        });
      };

      xhr.send(formData);

    } catch (err: any) {
      onUpdate({ 
        status: 'error', 
        message: err.message || 'Initialization error during upload.',
        code: 'fatal/init'
      });
    }
  }
}
