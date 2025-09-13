const { Media } = require('../models');
const path = require('path');
const fs = require('fs');

/**
 * Exercise Media Controller
 * Handles video and thumbnail uploads for exercises
 */

// Upload exercise video
const uploadExerciseVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    const { exerciseId } = req.params;
    const { altText = 'Exercise video' } = req.body;

    // Generate URL path for the uploaded video
    const videoUrl = `/uploads/exercises/videos/${req.file.filename}`;
    const fileLocation = req.file.path;

    // Create media record
    const media = await Media.createMedia({
      entityType: 'exercise',
      entityId: exerciseId,
      mediaType: 'video',
      mimeType: req.file.mimetype,
      url: videoUrl,
      location: fileLocation,
      altText: altText
    });

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        id: media.id,
        url: media.url,
        mediaType: media.media_type,
        mimeType: media.mime_type,
        altText: media.alt_text,
        createdAt: media.created_at
      }
    });

  } catch (error) {
    console.error('Error uploading exercise video:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload exercise thumbnail
const uploadExerciseThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No thumbnail file provided'
      });
    }

    const { exerciseId } = req.params;
    const { altText = 'Exercise thumbnail' } = req.body;

    // Generate URL path for the uploaded thumbnail
    const thumbnailUrl = `/uploads/exercises/thumbnails/${req.file.filename}`;
    const fileLocation = req.file.path;

    // Create media record
    const media = await Media.createMedia({
      entityType: 'exercise',
      entityId: exerciseId,
      mediaType: 'image',
      mimeType: req.file.mimetype,
      url: thumbnailUrl,
      location: fileLocation,
      altText: altText
    });

    res.status(201).json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      data: {
        id: media.id,
        url: media.url,
        mediaType: media.media_type,
        mimeType: media.mime_type,
        altText: media.alt_text,
        createdAt: media.created_at
      }
    });

  } catch (error) {
    console.error('Error uploading exercise thumbnail:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading thumbnail',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload both video and thumbnail simultaneously
const uploadExerciseMedia = async (req, res) => {
  try {
    if (!req.files || (!req.files.video && !req.files.thumbnail)) {
      return res.status(400).json({
        success: false,
        message: 'No media files provided'
      });
    }

    const { exerciseId } = req.params;
    const { videoAltText = 'Exercise video', thumbnailAltText = 'Exercise thumbnail' } = req.body;
    
    const results = {};
    const mediaRecords = [];

    // Handle video upload
    if (req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      const videoUrl = `/uploads/exercises/videos/${videoFile.filename}`;
      
      const videoMedia = await Media.createMedia({
        entityType: 'exercise',
        entityId: exerciseId,
        mediaType: 'video',
        mimeType: videoFile.mimetype,
        url: videoUrl,
        location: videoFile.path,
        altText: videoAltText
      });

      results.video = {
        id: videoMedia.id,
        url: videoMedia.url,
        mediaType: videoMedia.media_type,
        mimeType: videoMedia.mime_type,
        altText: videoMedia.alt_text
      };
      
      mediaRecords.push(videoMedia);
    }

    // Handle thumbnail upload
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbnailFile = req.files.thumbnail[0];
      const thumbnailUrl = `/uploads/exercises/thumbnails/${thumbnailFile.filename}`;
      
      const thumbnailMedia = await Media.createMedia({
        entityType: 'exercise',
        entityId: exerciseId,
        mediaType: 'image',
        mimeType: thumbnailFile.mimetype,
        url: thumbnailUrl,
        location: thumbnailFile.path,
        altText: thumbnailAltText
      });

      results.thumbnail = {
        id: thumbnailMedia.id,
        url: thumbnailMedia.url,
        mediaType: thumbnailMedia.media_type,
        mimeType: thumbnailMedia.mime_type,
        altText: thumbnailMedia.alt_text
      };
      
      mediaRecords.push(thumbnailMedia);
    }

    res.status(201).json({
      success: true,
      message: 'Exercise media uploaded successfully',
      data: results
    });

  } catch (error) {
    console.error('Error uploading exercise media:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const cleanupFiles = [...(req.files.video || []), ...(req.files.thumbnail || [])];
      cleanupFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', file.path, cleanupError);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading exercise media',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get exercise media (videos and thumbnails)
const getExerciseMedia = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { mediaType } = req.query; // 'video', 'image', or omit for both

    const media = await Media.findByEntity('exercise', exerciseId, {
      mediaType,
      order: 'DESC'
    });

    // Group media by type
    const groupedMedia = {
      videos: media.filter(m => m.media_type === 'video').map(m => ({
        id: m.id,
        url: m.url,
        mimeType: m.mime_type,
        altText: m.alt_text,
        createdAt: m.created_at
      })),
      thumbnails: media.filter(m => m.media_type === 'image').map(m => ({
        id: m.id,
        url: m.url,
        mimeType: m.mime_type,
        altText: m.alt_text,
        createdAt: m.created_at
      }))
    };

    res.status(200).json({
      success: true,
      data: mediaType ? (mediaType === 'video' ? groupedMedia.videos : groupedMedia.thumbnails) : groupedMedia
    });

  } catch (error) {
    console.error('Error fetching exercise media:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching exercise media',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete exercise media
const deleteExerciseMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const media = await Media.findByPk(mediaId);
    if (!media || !media.isActive()) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Soft delete the media record
    await media.deactivate();

    // Optionally, delete the physical file (uncomment if needed)
    // if (media.location && fs.existsSync(media.location)) {
    //   fs.unlinkSync(media.location);
    // }

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting exercise media:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting media',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get media by ID (for direct access)
const getMediaById = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const media = await Media.findByPk(mediaId);
    if (!media || !media.isActive()) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: media.id,
        entityType: media.entity_type,
        entityId: media.entity_id,
        mediaType: media.media_type,
        url: media.url,
        mimeType: media.mime_type,
        altText: media.alt_text,
        createdAt: media.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching media',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadExerciseVideo,
  uploadExerciseThumbnail,
  uploadExerciseMedia,
  getExerciseMedia,
  deleteExerciseMedia,
  getMediaById
};
