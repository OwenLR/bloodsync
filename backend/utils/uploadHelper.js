const cloudinary = require('../config/cloudinary');

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - req.file.buffer from multer memoryStorage
 * @param {string} folder - 'profile_images' | 'request_forms'
 * @returns {Promise<string>} - permanent secure_url to store in DB
 */
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public_id (not the full URL)
 */
const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };