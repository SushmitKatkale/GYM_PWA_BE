const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

/**
 * Video streaming endpoint with range request support
 * Supports HTTP Range requests for efficient video streaming
 */
router.get('/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, '../uploads/exercises/videos', filename);

  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({
      success: false,
      message: 'Video not found'
    });
  }

  // Get file stats
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Parse Range header (e.g., "bytes=32324-")
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    // Create read stream for the requested range
    const file = fs.createReadStream(videoPath, { start, end });
    
    // Set appropriate headers for partial content
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=3600',
    };
    
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // No range requested, send entire file
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=3600',
    };
    
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

/**
 * Get video metadata without streaming the full file
 */
router.get('/metadata/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, '../uploads/exercises/videos', filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({
      success: false,
      message: 'Video not found'
    });
  }

  const stat = fs.statSync(videoPath);
  
  res.json({
    success: true,
    data: {
      filename: filename,
      size: stat.size,
      sizeFormatted: formatFileSize(stat.size),
      lastModified: stat.mtime,
      streamUrl: `/api/video-stream/stream/${filename}`
    }
  });
});

/**
 * Helper function to format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
