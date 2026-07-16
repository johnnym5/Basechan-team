const { Storage } = require('@google-cloud/storage');
const dotenv = require('dotenv');
const fs = require('fs');

const { GoogleAuth } = require('google-auth-library');

const storage = new Storage({
  projectId: 'basechanteam',
  authClient: new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
  })
});

async function configureBucketCors() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'basechanteam.firebasestorage.app';
  
  const corsConfiguration = [
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
      origin: ['*'],
      responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
    },
  ];

  try {
      console.log(`Setting CORS for bucket: ${bucketName}...`);
      await storage.bucket(bucketName).setCorsConfiguration(corsConfiguration);
      console.log(`SUCCESS! Bucket ${bucketName} was updated with a CORS config to allow web uploads.`);
  } catch (error) {
      console.error("Error setting CORS on basechanteam.firebasestorage.app, trying appspot.com...", error.message);
      try {
          const fallbackBucket = bucketName.replace('.firebasestorage.app', '.appspot.com');
          console.log(`Setting CORS for fallback bucket: ${fallbackBucket}...`);
          await storage.bucket(fallbackBucket).setCorsConfiguration(corsConfiguration);
          console.log(`SUCCESS! Bucket ${fallbackBucket} was updated with a CORS config to allow web uploads.`);
      } catch (err2) {
          console.error("Failed to set CORS completely.", err2.message);
      }
  }
}

configureBucketCors();
