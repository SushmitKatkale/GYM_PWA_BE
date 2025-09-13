const express = require('express');
const router = express.Router();
const { 
  uploadExerciseVideo,
  uploadExerciseThumbnail,
  uploadExerciseMedia,
  getExerciseMedia,
  deleteExerciseMedia,
  getMediaById
} = require('../controllers/exerciseMediaController');

// Import multer configurations
const { videoUpload, thumbnailUpload, exerciseMediaUpload } = require('../config/exerciseMulter');

// Import authentication middleware
const { authenticate } = require('../middleware/auth');

/**
 * Exercise Media Routes
 * Routes for handling exercise video and thumbnail uploads
 */

// Upload exercise video only
// POST /api/exercise-media/exercises/:exerciseId/video
router.post('/exercises/:exerciseId/video', 
  authenticate,
  videoUpload.single('video'),
  uploadExerciseVideo
);

// Upload exercise thumbnail only  
// POST /api/exercise-media/exercises/:exerciseId/thumbnail
router.post('/exercises/:exerciseId/thumbnail',
  authenticate,
  thumbnailUpload.single('thumbnail'),
  uploadExerciseThumbnail
);

// Upload both video and thumbnail simultaneously
// POST /api/exercise-media/exercises/:exerciseId/media
router.post('/exercises/:exerciseId/media',
  authenticate,
  exerciseMediaUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  uploadExerciseMedia
);

// Get exercise media (videos and/or thumbnails)
// GET /api/exercise-media/exercises/:exerciseId/media?mediaType=video|image
router.get('/exercises/:exerciseId/media',
  authenticate,
  getExerciseMedia
);

// Delete exercise media by media ID
// DELETE /api/exercise-media/:mediaId
router.delete('/:mediaId',
  authenticate,
  deleteExerciseMedia
);

// Get specific media by ID
// GET /api/exercise-media/:mediaId
router.get('/:mediaId',
  authenticate,
  getMediaById
);

module.exports = router;
