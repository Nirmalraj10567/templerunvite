const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Middleware to compress uploaded images
 * Compresses images to reduce file size while maintaining quality
 */
const compressImage = async (req, res, next) => {
  try {
    // Check if there's a file to compress
    if (!req.file && !req.files) {
      return next();
    }

    // Handle single file upload
    if (req.file) {
      await compressSingleFile(req.file);
    }

    // Handle multiple files upload
    if (req.files) {
      const fileArrays = Object.values(req.files).flat();
      for (const file of fileArrays) {
        await compressSingleFile(file);
      }
    }

    next();
  } catch (error) {
    console.error('Image compression error:', error);
    // Don't fail the request if compression fails
    next();
  }
};

/**
 * Compress a single file
 */
const compressSingleFile = async (file) => {
  try {
    const inputPath = file.path;
    const outputPath = inputPath + '.compressed';
    
    // Get original file size
    const originalSize = file.size;
    
    // Compress the image
    await sharp(inputPath)
      .jpeg({ 
        quality: 80, // Good balance between quality and size
        progressive: true,
        mozjpeg: true // Use mozjpeg encoder for better compression
      })
      .png({ 
        quality: 80,
        compressionLevel: 8,
        progressive: true
      })
      .webp({ 
        quality: 80,
        effort: 6
      })
      .toFile(outputPath);

    // Check if compression was successful and beneficial
    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;
    
    // Only use compressed version if it's smaller
    if (compressedSize < originalSize) {
      // Replace original with compressed version
      fs.unlinkSync(inputPath);
      fs.renameSync(outputPath, inputPath);
      
      // Update file size in the file object
      file.size = compressedSize;
      
      console.log(`Image compressed: ${originalSize} bytes → ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
    } else {
      // Keep original, remove compressed version
      fs.unlinkSync(outputPath);
      console.log(`Image compression not beneficial, keeping original`);
    }
  } catch (error) {
    console.error('Error compressing file:', file.filename, error);
    // If compression fails, keep the original file
  }
};

/**
 * Compress image with specific settings
 */
const compressImageWithSettings = (options = {}) => {
  const defaultOptions = {
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'jpeg'
  };
  
  const settings = { ...defaultOptions, ...options };
  
  return async (req, res, next) => {
    try {
      if (!req.file && !req.files) {
        return next();
      }

      if (req.file) {
        await compressSingleFileWithSettings(req.file, settings);
      }

      if (req.files) {
        const fileArrays = Object.values(req.files).flat();
        for (const file of fileArrays) {
          await compressSingleFileWithSettings(file, settings);
        }
      }

      next();
    } catch (error) {
      console.error('Image compression error:', error);
      next();
    }
  };
};

/**
 * Compress a single file with specific settings
 */
const compressSingleFileWithSettings = async (file, settings) => {
  try {
    const inputPath = file.path;
    const outputPath = inputPath + '.compressed';
    
    const originalSize = file.size;
    
    let sharpInstance = sharp(inputPath);
    
    // Resize if needed
    if (settings.maxWidth || settings.maxHeight) {
      sharpInstance = sharpInstance.resize(settings.maxWidth, settings.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Apply format-specific compression
    switch (settings.format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({ 
          quality: settings.quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ 
          quality: settings.quality,
          compressionLevel: 8,
          progressive: true
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ 
          quality: settings.quality,
          effort: 6
        });
        break;
      default:
        sharpInstance = sharpInstance.jpeg({ 
          quality: settings.quality,
          progressive: true,
          mozjpeg: true
        });
    }
    
    await sharpInstance.toFile(outputPath);

    const compressedStats = fs.statSync(outputPath);
    const compressedSize = compressedStats.size;
    
    if (compressedSize < originalSize) {
      fs.unlinkSync(inputPath);
      fs.renameSync(outputPath, inputPath);
      file.size = compressedSize;
      
      console.log(`Image compressed with settings: ${originalSize} bytes → ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
    } else {
      fs.unlinkSync(outputPath);
      console.log(`Image compression not beneficial, keeping original`);
    }
  } catch (error) {
    console.error('Error compressing file with settings:', file.filename, error);
  }
};

module.exports = {
  compressImage,
  compressImageWithSettings
};
