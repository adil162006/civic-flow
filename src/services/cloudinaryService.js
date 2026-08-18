import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary from environment variables
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[Cloudinary] Configured with Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
}

/**
 * Upload a local file path or buffer stream to Cloudinary
 *
 * @param {string} filePath - Path to local file
 * @param {string} folder - Folder name in Cloudinary (e.g. 'civicai-complaints')
 * @returns {Promise<{secure_url: string, public_id: string} | null>}
 */
export async function uploadToCloudinary(filePath, folder = 'civicai-complaints') {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.log('[Cloudinary] Environment variables not set. Skipping Cloudinary upload.');
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });

    console.log('[Cloudinary] Upload success:', result.secure_url);
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error.message);
    return null;
  }
}
