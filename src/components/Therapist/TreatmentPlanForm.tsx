import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { transcribeAudio, summarizeTreatmentPlan, generateDemoVideoSuggestion } from '../../services/openai';
import { Child, DailyTask } from '../../types';
import './Therapist.css';

interface TreatmentPlanFormProps {
  child: Child;
  onComplete?: () => void;
}

const TreatmentPlanForm: React.FC<TreatmentPlanFormProps> = ({ child, onComplete }) => {
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleVoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVoiceFile(e.target.files[0]);
    }
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !voiceFile) return;

    setError('');
    setLoading(true);

    try {
      // Step 1: Upload voice recording
      setStatus(language === 'ar' ? 'جاري تحميل التسجيل الصوتي...' : 'Uploading voice recording...');
      const voiceRef = ref(storage, `voice-recordings/${Date.now()}_${voiceFile.name}`);
      await uploadBytes(voiceRef, voiceFile);
      const voiceUrl = await getDownloadURL(voiceRef);

      // Step 2: Transcribe audio
      setStatus(language === 'ar' ? 'جاري نسخ الصوت...' : 'Transcribing audio with Whisper...');
      const transcription = await transcribeAudio(voiceFile);

      // Step 3: Summarize with GPT-4
      setStatus(language === 'ar' ? 'جاري إنشاء ملخص خطة العلاج...' : 'Generating treatment plan summary with AI...');
      const summary = await summarizeTreatmentPlan(transcription, language);

      // Step 4: Generate video suggestions for tasks
      setStatus(language === 'ar' ? 'جاري إنشاء اقتراحات الفيديو التوضيحي...' : 'Generating demo video suggestions...');
      const dailyTasksWithSuggestions: DailyTask[] = await Promise.all(
        summary.dailyTasks.map(async (task: any, index: number) => {
          const videoSuggestion = await generateDemoVideoSuggestion(task.description, language);
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
        setStatus(language === 'ar' ? 'جاري تحميل وثيقة خطة العلاج...' : 'Uploading treatment plan document...');
        const docRef = ref(storage, `documents/${Date.now()}_${documentFile.name}`);
        await uploadBytes(docRef, documentFile);
        documentUrl = await getDownloadURL(docRef);
      }

      // Step 6: Save to Firestore
      setStatus(language === 'ar' ? 'جاري حفظ خطة العلاج...' : 'Saving treatment plan...');
      await addDoc(collection(db, 'treatmentPlans'), {
        childId: child.id,
        therapistId: currentUser.uid,
        voiceRecordingUrl: voiceUrl,
        transcription: transcription,
        documentUrl: documentUrl,
        summary: summary.summary,
        weeklyGoals: summary.weeklyGoals,
        dailyTasks: dailyTasksWithSuggestions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setStatus(language === 'ar' ? 'تم إنشاء خطة العلاج بنجاح!' : 'Treatment plan created successfully!');
      setVoiceFile(null);
      setDocumentFile(null);

      // Reset form
      (document.getElementById('treatment-plan-form') as HTMLFormElement)?.reset();

      // Call onComplete callback if provided
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error creating treatment plan:', err);
      setError(err.message || 'Failed to create treatment plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="treatment-plan-form">
      <h2>Create Treatment Plan</h2>
      <div className="patient-info-header">
        <h3>Patient: {child.name}</h3>
        <p>National ID: {child.nationalId}</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {status && <div className="status-message">{status}</div>}

      <form id="treatment-plan-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Voice Recording of Therapy Session *</label>
          <input
            type="file"
            accept="audio/*"
            onChange={handleVoiceFileChange}
            required
            disabled={loading}
          />
          <small>Upload audio recording to transcribe and generate treatment plan</small>
        </div>

        <div className="form-group">
          <label>Treatment Plan Document (Optional)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleDocumentFileChange}
            disabled={loading}
          />
          <small>Optional: Upload existing treatment plan document</small>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? status : 'Create Treatment Plan with AI'}
        </button>
      </form>

      <div className="info-box">
        <h4>How it works:</h4>
        <ol>
          <li>Upload your voice recording of the therapy session</li>
          <li>AI transcribes the audio using Whisper</li>
          <li>GPT-4 summarizes into clear goals and daily tasks</li>
          <li>AI generates demo video suggestions for each task</li>
          <li>Parents receive easy-to-understand action steps</li>
        </ol>
      </div>
    </div>
  );
};

export default TreatmentPlanForm;
