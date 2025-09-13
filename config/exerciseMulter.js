const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const videoUploadDir = path.join(__dirname, '../uploads/exercises/videos');
const thumbnailUploadDir = path.join(__dirname, '../uploads/exercises/thumbnails');

if (!fs.existsSync(videoUploadDir)) {
  fs.mkdirSync(videoUploadDir, { recursive: true });
}

if (!fs.existsSync(thumbnailUploadDir)) {
  fs.mkdirSync(thumbnailUploadDir, { recursive: true });
}

// Storage configuration for videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'exercise-video-' + uniqueSuffix + extension);
  }
});

// Storage configuration for thumbnails
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'exercise-thumb-' + uniqueSuffix + extension);
  }
});

// File filter for videos
const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|mov|avi|mkv|webm|m4v/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('video/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, mov, avi, mkv, webm, m4v)'));
  }
};

// File filter for thumbnail images
const thumbnailFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for thumbnails (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer for videos
const videoUpload = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: videoFileFilter
});

// Configure multer for thumbnails
const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for thumbnails
  },
  fileFilter: thumbnailFileFilter
});

// Combined upload for both video and thumbnail
const exerciseMediaUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'video') {
        cb(null, videoUploadDir);
      } else if (file.fieldname === 'thumbnail') {
        cb(null, thumbnailUploadDir);
      } else {
        cb(new Error('Invalid field name'));
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      
      if (file.fieldname === 'video') {
        cb(null, 'exercise-video-' + uniqueSuffix + extension);
      } else if (file.fieldname === 'thumbnail') {
        cb(null, 'exercise-thumb-' + uniqueSuffix + extension);
      } else {
        cb(new Error('Invalid field name'));
      }
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (will be validated per file type)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      videoFileFilter(req, file, cb);
    } else if (file.fieldname === 'thumbnail') {
      thumbnailFileFilter(req, file, cb);
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

module.exports = {
  videoUpload,
  thumbnailUpload,
  exerciseMediaUpload
};
