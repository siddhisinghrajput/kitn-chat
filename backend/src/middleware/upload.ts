import multer from 'multer';

// We store the uploaded files in memory buffers to process and stream to S3 dynamically in our service.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept standard webm/ogg file extensions or mime-types for voice notes
    const isAudio = file.mimetype.startsWith('audio/') || 
                    file.mimetype === 'video/webm' || 
                    file.mimetype === 'application/octet-stream' ||
                    file.originalname.endsWith('.webm') || 
                    file.originalname.endsWith('.ogg');
                    
    if (isAudio) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio (.webm, .ogg) files are supported.'));
    }
  },
});
