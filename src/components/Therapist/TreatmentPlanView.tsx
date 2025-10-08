import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child, TreatmentPlan } from '../../types';
import VideoUpload from './VideoUpload';
import { generateSampleProgressData, calculateSkillProgress } from '../../utils/progressData';
import './Therapist.css';

interface TreatmentPlanViewProps {
  child: Child;
}

interface SessionData {
  completed: boolean;
  feedback?: string;
  childMood?: string;
  completedAt?: Date;
}

const TreatmentPlanView: React.FC<TreatmentPlanViewProps> = ({ child }) => {
  const { t } = useLanguage();
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingVideoFor, setUploadingVideoFor] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [skillProgress, setSkillProgress] = useState<any>({});
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    loadTreatmentPlan();
  }, [child]);

  const loadTreatmentPlan = async () => {
    setLoading(true);
    try {
      const plansRef = collection(db, 'treatmentPlans');
      const q = query(
        plansRef,
        where('childId', '==', child.id)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Sort by createdAt in JavaScript to avoid needing Firestore index
        const plans = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        }));

        plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const plan = plans[0] as TreatmentPlan;
        setTreatmentPlan(plan);

        // Load progress data
        await loadProgressData(child.id, plan.therapyType || 'behavior');
      } else {
        setTreatmentPlan(null);
      }
    } catch (err) {
      console.error('Error loading treatment plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgressData = async (childId: string, therapyType: string) => {
    try {
      // Try to load real sessions
      const sessionsRef = collection(db, 'therapySessions');
      const q = query(sessionsRef, where('childId', '==', childId));
      const querySnapshot = await getDocs(q);

      let sessionsData: SessionData[] = [];
      querySnapshot.forEach((doc) => {
        sessionsData.push(doc.data() as SessionData);
      });

      // If no real data, generate sample data
      if (sessionsData.length === 0) {
        sessionsData = generateSampleProgressData(childId, 14) as SessionData[];
      }

      setSessions(sessionsData);

      // Calculate skill progress
      const skills = calculateSkillProgress(therapyType, sessionsData);
      setSkillProgress(skills);
    } catch (err) {
      console.error('Error loading progress data:', err);
    }
  };

  const handleVideoUploaded = (taskId: string, url: string) => {
    // Update the treatment plan with the video URL
    if (treatmentPlan) {
      const updatedTasks = treatmentPlan.dailyTasks.map((task) =>
        task.id === taskId ? { ...task, demoVideoUrl: url } : task
      );
      setTreatmentPlan({ ...treatmentPlan, dailyTasks: updatedTasks });
    }
    setUploadingVideoFor(null);
  };

  if (loading) {
    return (
      <div className="treatment-plan-view">
        <div className="loading">Loading treatment plan...</div>
      </div>
    );
  }

  if (!treatmentPlan) {
    return (
      <div className="treatment-plan-view">
        <div className="empty-state">
          <h3>{t('noPlanFound') || 'No Treatment Plan Found'}</h3>
          <p>{t('createPlanByRecording') || 'Create a treatment plan by recording a therapy session for this patient.'}</p>
        </div>
      </div>
    );
  }

  const getTherapyTypeIcon = (type?: string) => {
    switch (type) {
      case 'speech': return '🗣️';
      case 'behavior': return '🧠';
      case 'emotional': return '❤️';
      case 'motor': return '🏃';
      default: return '📋';
    }
  };

  const getTherapyTypeLabel = (type?: string) => {
    switch (type) {
      case 'speech': return t('speech');
      case 'behavior': return t('behavior');
      case 'emotional': return t('emotional');
      case 'motor': return t('motor');
      default: return t('therapy') || 'Therapy';
    }
  };

  const translateSkillName = (skillName: string) => {
    const skillMap: { [key: string]: string } = {
      'Fine Motor': t('fineMotor'),
      'Gross Motor': t('grossMotor'),
      'Coordination': t('coordination'),
      'Balance': t('balance'),
    };
    return skillMap[skillName] || skillName;
  };

  return (
    <div className="treatment-plan-view">
      <div className="plan-header">
        <div>
          <h2>{t('treatmentPlan')}</h2>
          <div className="plan-meta">
            <span>{t('patient') || 'Patient'}: <strong>{child.name}</strong></span>
            <span className="separator">•</span>
            <span>{t('created') || 'Created'}: {treatmentPlan.createdAt.toLocaleDateString()}</span>
            {treatmentPlan.therapyType && (
              <>
                <span className="separator">•</span>
                <span className={`therapy-type-badge ${treatmentPlan.therapyType}`}>
                  {getTherapyTypeIcon(treatmentPlan.therapyType)} {getTherapyTypeLabel(treatmentPlan.therapyType)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="btn-toggle-progress"
          >
            {showProgress ? t('hideProgress') : t('showProgress')} 📊
          </button>
          <button onClick={loadTreatmentPlan} className="btn-refresh">
            {t('refresh')}
          </button>
        </div>
      </div>

      {showProgress && sessions.length > 0 && (
        <div className="progress-section-therapist">
          <h3>{t('patientProgressOverview') || 'Patient Progress Overview'}</h3>

          <div className="progress-stats">
            <div className="stat-card-small">
              <div className="stat-label">{t('totalSessions') || 'Total Sessions'}</div>
              <div className="stat-value-large">{sessions.length}</div>
            </div>
            <div className="stat-card-small">
              <div className="stat-label">{t('completionRate') || 'Completion Rate'}</div>
              <div className="stat-value-large">
                {Math.round((sessions.filter(s => s.completed).length / sessions.length) * 100)}%
              </div>
            </div>
            <div className="stat-card-small">
              <div className="stat-label">{t('easyTasks') || 'Easy Tasks'}</div>
              <div className="stat-value-large">
                {sessions.filter(s => s.feedback === 'easy').length}
              </div>
            </div>
            <div className="stat-card-small">
              <div className="stat-label">{t('needsPractice')}</div>
              <div className="stat-value-large">
                {sessions.filter(s => s.feedback === 'needs_practice').length}
              </div>
            </div>
          </div>

          {Object.keys(skillProgress).length > 0 && (
            <div className="skills-progress-therapist">
              <h4>{t('skillDevelopment') || 'Skill Development'}</h4>
              <div className="skills-grid-therapist">
                {Object.entries(skillProgress).map(([skillName, progressData]: [string, any]) => (
                  <div key={skillName} className="skill-item-therapist">
                    <div className="skill-name-therapist">{translateSkillName(skillName)}</div>
                    <div className="skill-bar-therapist">
                      <div
                        className="skill-fill-therapist"
                        style={{ width: `${progressData[progressData.length - 1]}%` }}
                      />
                    </div>
                    <div className="skill-percentage-therapist">
                      {progressData[progressData.length - 1]}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {treatmentPlan.summary && (
        <div className="plan-summary">
          <h3>{t('summary')}</h3>
          <p>{treatmentPlan.summary}</p>
        </div>
      )}

      {treatmentPlan.weeklyGoals && treatmentPlan.weeklyGoals.length > 0 && (
        <div className="plan-section">
          <h3>{t('weeklyGoals')}</h3>
          <ul className="goals-list">
            {treatmentPlan.weeklyGoals.map((goal, index) => {
              // Support both old (string) and new (object) format
              const isNewFormat = typeof goal === 'object' && 'goal' in goal;
              const goalText = isNewFormat ? goal.goal : goal;
              const category = isNewFormat ? goal.category : null;

              return (
                <li key={index}>
                  <span className="goal-number">{index + 1}</span>
                  <span>{goalText}</span>
                  {category && (
                    <span className={`goal-category-badge ${category}`}>
                      {category === 'speech' && `🗣️ ${t('speech')}`}
                      {category === 'behavior' && `🧠 ${t('behavior')}`}
                      {category === 'emotional' && `❤️ ${t('emotional')}`}
                      {category === 'motor' && `🏃 ${t('motor')}`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="plan-section">
        <h3>{t('dailyTasks')} ({treatmentPlan.dailyTasks?.length || 0})</h3>
        <div className="tasks-grid">
          {treatmentPlan.dailyTasks?.map((task, index) => (
            <div key={task.id} className="task-card-view">
              <div className="task-card-header-view">
                <h4>
                  {t('day')} {index + 1}: {task.title}
                </h4>
                <span className="goal-badge">
                  {t('goal')} {task.weeklyGoalIndex + 1}
                </span>
              </div>

              <div className="task-card-body-view">
                <div className="task-detail">
                  <strong>{t('howToDoIt')}:</strong>
                  <p>{task.description}</p>
                </div>

                <div className="task-detail why-matters">
                  <strong>{t('whyItMatters')}:</strong>
                  <p>{task.whyItMatters}</p>
                </div>

                {task.demoVideoUrl ? (
                  <div className="video-container">
                    <strong>{t('demoVideo')}:</strong>
                    <video controls width="100%">
                      <source src={task.demoVideoUrl} />
                    </video>
                  </div>
                ) : (
                  <div className="video-suggestion-box">
                    {task.demoVideoSuggestion && (
                      <>
                        <strong>{t('aiVideoSuggestion')}:</strong>
                        <p className="ai-suggestion">{task.demoVideoSuggestion}</p>
                      </>
                    )}
                    {uploadingVideoFor === task.id ? (
                      <VideoUpload
                        onVideoUploaded={(url) => handleVideoUploaded(task.id, url)}
                      />
                    ) : (
                      <button
                        onClick={() => setUploadingVideoFor(task.id)}
                        className="btn-upload-video"
                      >
                        📹 {t('uploadDemoVideo')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {treatmentPlan.voiceRecordingUrl && (
        <div className="plan-section">
          <h3>{t('originalRecording')}</h3>
          <audio controls src={treatmentPlan.voiceRecordingUrl} style={{ width: '100%' }} />
        </div>
      )}

      {treatmentPlan.transcription && (
        <div className="plan-section">
          <h3>{t('transcription')}</h3>
          <div className="transcription-box">
            <p>{treatmentPlan.transcription}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentPlanView;
