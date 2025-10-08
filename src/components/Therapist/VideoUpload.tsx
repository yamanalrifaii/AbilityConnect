import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import './Therapist.css';

interface VideoUploadProps {
  onVideoUploaded: (url: string) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoUploaded }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Video file is too large. Maximum size is 50MB.');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file.');
        return;
      }

      setVideoFile(file);
    }
  };

  const handleUpload = async () => {
    if (!videoFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const videoRef = ref(storage, `demo-videos/${Date.now()}_${videoFile.name}`);

      // Upload the video
      await uploadBytes(videoRef, videoFile);

      // Get download URL
      const videoUrl = await getDownloadURL(videoRef);

      setProgress(100);
      onVideoUploaded(videoUrl);

      // Reset form
      setVideoFile(null);
      (document.getElementById('video-upload-input') as HTMLInputElement).value = '';

      alert('Video uploaded successfully!');
    } catch (err: any) {
      console.error('Error uploading video:', err);
      alert('Failed to upload video: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="video-upload">
      <div className="form-group">
        <label>Upload Demo Video (Optional)</label>
        <input
          id="video-upload-input"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <small>Max size: 50MB. Supported formats: MP4, MOV, AVI, WebM</small>
      </div>

      {videoFile && (
        <div className="video-preview">
          <p>Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)</p>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary"
          >
            {uploading ? `Uploading... ${progress}%` : 'Upload Video'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
