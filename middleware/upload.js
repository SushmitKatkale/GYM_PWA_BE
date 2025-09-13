const { videoUpload, thumbnailUpload, exerciseMediaUpload } = require('../config/exerciseMulter');

// Export multer middleware for exercise video uploads
const exerciseVideoUpload = videoUpload.single('video');

// Export multer middleware for exercise thumbnail uploads
const exerciseThumbnailUpload = thumbnailUpload.single('thumbnail');

// Export multer middleware for combined exercise media uploads
const exerciseMediaUploadMiddleware = exerciseMediaUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

module.exports = {
  exerciseVideoUpload,
  exerciseThumbnailUpload,
  exerciseMediaUpload: exerciseMediaUploadMiddleware
};
