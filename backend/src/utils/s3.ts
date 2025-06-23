import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Validate required environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET) {
  throw new Error('Missing required AWS environment variables');
}

// Debug logging (remove in production)
console.log('AWS Configuration:');
console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...');
console.log('Region:', process.env.AWS_REGION);
console.log('Bucket:', process.env.AWS_S3_BUCKET);

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function uploadFileToS3(buffer: Buffer, originalName: string, mimetype: string): Promise<string> {
  try {
    const ext = path.extname(originalName);
    const key = `mulkeya/${uuidv4()}${ext}`;

    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'private',
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getFileFromS3(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    const params = {
      Bucket: BUCKET,
      Key: key,
    };

    const result = await s3.getObject(params).promise();
    
    if (!result.Body) {
      throw new Error('File not found or empty');
    }

    return {
      buffer: result.Body as Buffer,
      contentType: result.ContentType || 'application/octet-stream'
    };
  } catch (error) {
    throw new Error(`Failed to retrieve file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function extractKeyFromUrl(url: string): string {
  // Extract the key from S3 URL
  // URL format: https://bucket-name.s3.region.amazonaws.com/key
  const urlParts = url.split('.com/');
  if (urlParts.length !== 2) {
    throw new Error('Invalid S3 URL format');
  }
  return urlParts[1];
}

export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const params = {
      Bucket: BUCKET,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 