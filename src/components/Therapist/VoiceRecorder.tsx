import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { transcribeAudio, summarizeTreatmentPlan, generateDemoVideoSuggestion } from '../../services/openai';
import { Child, DailyTask } from '../../types';
import './Therapist.css';

interface VoiceRecorderProps {
  child: Child;
  onClose: () => void;
  onComplete: (child: Child) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ child, onClose, onComplete }) => {
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err: any) {
      setError('Could not access microphone. Please check permissions.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setError('');
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    const fileToProcess = mode === 'upload' ? uploadedFile : audioBlob;
    if (!fileToProcess) return;

    setError('');
    setProcessing(true);

    try {
      // Convert to File if it's a Blob
      const audioFile = fileToProcess instanceof File
        ? fileToProcess
        : new File([fileToProcess], 'recording.webm', { type: 'audio/webm' });

      // Step 1: Upload voice recording
      setStatus('Uploading voice recording...');
      const fileName = audioFile.name;
      const voiceRef = ref(storage, `voice-recordings/${Date.now()}_${child.id}_${fileName}`);
      await uploadBytes(voiceRef, audioFile);
      const voiceUrl = await getDownloadURL(voiceRef);

      // Step 2: Transcribe audio
      setStatus('Transcribing audio with Whisper...');
      const transcription = await transcribeAudio(audioFile);

      // Step 3: Summarize with GPT-4
      setStatus('Generating treatment plan with AI...');
      const summary = await summarizeTreatmentPlan(transcription, language);

      // Step 4: Generate video suggestions
      setStatus('Generating demo video suggestions...');
      const dailyTasksWithSuggestions: DailyTask[] = await Promise.all(
        summary.dailyTasks.map(async (task: any, index: number) => {
          const videoSuggestion = await generateDemoVideoSuggestion(task.description);
          return {
            id: `task_${Date.now()}_${index}`,
            title: task.title,
            description: task.description,
            whyItMatters: task.whyItMatters,
            weeklyGoalIndex: task.weeklyGoalIndex,
            demoVideoSuggestion: videoSuggestion,
            editable: true,
            createdAt: new Date(),
          };
        })
      );

      // Step 5: Upload document if provided
      let documentUrl = '';
      if (documentFile) {
        setStatus('Uploading treatment plan document...');
        const docRef = ref(storage, `documents/${Date.now()}_${child.id}_${documentFile.name}`);
        await uploadBytes(docRef, documentFile);
        documentUrl = await getDownloadURL(docRef);
      }

      // Step 6: Save to Firestore
      setStatus('Saving treatment plan...');
      await addDoc(collection(db, 'treatmentPlans'), {
        childId: child.id,
        therapistId: currentUser.uid,
        voiceRecordingUrl: voiceUrl,
        documentUrl: documentUrl,
        transcription: transcription,
        summary: summary.summary,
        therapyType: summary.therapyType || 'behavior', // Default to behavior if not detected
        weeklyGoals: summary.weeklyGoals,
        dailyTasks: dailyTasksWithSuggestions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setStatus('Treatment plan created successfully! Redirecting...');
      setTimeout(() => {
        onComplete(child);
      }, 1500);
    } catch (err: any) {
      console.error('Error processing recording:', err);
      setError(err.message || 'Failed to process recording');
      setProcessing(false);
    }
  };

  return (
    <div className="voice-recorder-overlay">
      <div className="voice-recorder-card">
        <div className="recorder-header">
          <h3>{t('recordTherapySession')}</h3>
          <button onClick={onClose} className="close-btn" disabled={processing}>
            ✕
          </button>
        </div>

        <div className="recorder-body">
          <div className="patient-info-small">
            <strong>{t('patient')}:</strong> {child.name}
          </div>

          {error && <div className="error-message">{error}</div>}
          {status && <div className="status-message">{status}</div>}

          <div className="mode-selector">
            <button
              onClick={() => setMode('record')}
              className={`mode-btn ${mode === 'record' ? 'active' : ''}`}
              disabled={processing}
            >
              🎤 {t('recordAudio')}
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
              disabled={processing}
            >
              📁 {t('uploadFile')}
            </button>
          </div>

          {mode === 'upload' ? (
            <div className="upload-mode">
              <div className="upload-area">
                <label htmlFor="audio-upload" className="upload-label">
                  <span className="upload-icon">📎</span>
                  <p>{t('clickToSelectAudioFile')}</p>
                  <small>{t('audioFileFormats')}</small>
                </label>
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  disabled={processing}
                  style={{ display: 'none' }}
                />
              </div>

              {uploadedFile && (
                <div className="file-preview">
                  <div className="file-info">
                    <span>✓</span>
                    <div>
                      <p><strong>{uploadedFile.name}</strong></p>
                      <small>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</small>
                    </div>
                  </div>
                  <div className="recorder-actions">
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="btn-secondary"
                      disabled={processing}
                    >
                      {t('remove')}
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="btn-primary"
                      disabled={processing}
                    >
                      {processing ? status : t('generatingTreatmentPlanWithAI')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !audioBlob ? (
            <div className="recorder-controls">
              <div className="recorder-visual">
                {isRecording ? (
                  <div className="recording-indicator">
                    <span className="pulse"></span>
                    <p>Recording...</p>
                  </div>
                ) : (
                  <div className="ready-indicator">
                    <span>🎤</span>
                    <p>Ready to record</p>
                  </div>
                )}
              </div>

              {!isRecording ? (
                <button onClick={startRecording} className="btn-start-recording">
                  Start Recording
                </button>
              ) : (
                <button onClick={stopRecording} className="btn-stop-recording">
                  Stop Recording
                </button>
              )}
            </div>
          ) : (
            <div className="recorder-preview">
              <div className="audio-preview">
                <span>✓</span>
                <p>Recording completed</p>
                <audio controls src={URL.createObjectURL(audioBlob)} />
              </div>

              <div className="recorder-actions">
                <button
                  onClick={() => setAudioBlob(null)}
                  className="btn-secondary"
                  disabled={processing}
                >
                  {t('recordAudio')}
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary"
                  disabled={processing}
                >
                  {processing ? status : t('generatingTreatmentPlanWithAI')}
                </button>
              </div>
            </div>
          )}

          {/* Optional Document Upload Section */}
          <div className="document-upload-section">
            <label className="document-upload-label">
              <strong>📄 Upload Treatment Plan Document (Optional)</strong>
            </label>
            <div className="document-upload-area">
              <input
                id="document-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleDocumentUpload}
                disabled={processing}
                style={{ display: 'none' }}
              />
              <label htmlFor="document-upload" className="document-upload-btn">
                {documentFile ? '✓ ' + documentFile.name : '📎 Attach Document (PDF, DOC, DOCX)'}
              </label>
              {documentFile && (
                <button
                  onClick={() => setDocumentFile(null)}
                  className="btn-remove-doc"
                  disabled={processing}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="recorder-info">
            <p><strong>{t('howItWorks')}:</strong></p>
            <ol>
              <li>{t('recordYourTherapySessionNotes')}</li>
              <li>{t('aiTranscribesYourRecording')}</li>
              <li>{t('gpt4GeneratesTreatmentPlan')}</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;
