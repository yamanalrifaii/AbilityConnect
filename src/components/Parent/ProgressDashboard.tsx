import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child, TreatmentPlan } from '../../types';
import { generateProgressInsights } from '../../services/openai';
import { generateSampleProgressData, generateWeeklySummary, calculateSkillProgress } from '../../utils/progressData';
import './Parent.css';

interface SessionData {
  completed: boolean;
  feedback?: string;
  childMood?: string;
  completedAt?: Date;
}

const ProgressDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState<any[]>([]);
  const [skillProgress, setSkillProgress] = useState<any>({});
  const [therapyType, setTherapyType] = useState<string>('behavior');

  useEffect(() => {
    loadChildren();
  }, [currentUser]);

  useEffect(() => {
    if (selectedChild) {
      loadProgress(selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    if (!currentUser) return;

    try {
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('parentId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      const childrenData: Child[] = [];
      querySnapshot.forEach((doc) => {
        childrenData.push({ id: doc.id, ...doc.data() } as Child);
      });

      setChildren(childrenData);
      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0]);
      }
    } catch (err: any) {
      console.error('Error loading children:', err);
    }
  };

  const loadProgress = async (childId: string) => {
    setLoading(true);
    try {
      // Load treatment plan to get therapy type
      const plansRef = collection(db, 'treatmentPlans');
      const plansQuery = query(plansRef, where('childId', '==', childId));
      const plansSnapshot = await getDocs(plansQuery);

      let currentTherapyType = 'behavior';
      if (!plansSnapshot.empty) {
        const plans = plansSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            therapyType: data.therapyType as string | undefined,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        });
        plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        currentTherapyType = plans[0].therapyType || 'behavior';
        setTherapyType(currentTherapyType);
      }

      // Try to load real sessions first
      const sessionsRef = collection(db, 'therapySessions');
      const q = query(sessionsRef, where('childId', '==', childId));
      const querySnapshot = await getDocs(q);

      let sessionsData: SessionData[] = [];
      querySnapshot.forEach((doc) => {
        sessionsData.push(doc.data() as SessionData);
      });

      // If no real data, generate sample data for demonstration
      if (sessionsData.length === 0) {
        sessionsData = generateSampleProgressData(childId, 14) as SessionData[];
      }

      setSessions(sessionsData);

      // Generate weekly summary
      const weekly = generateWeeklySummary(sessionsData);
      setWeeklySummary(weekly);

      // Calculate skill progress
      const skills = calculateSkillProgress(currentTherapyType, sessionsData);
      setSkillProgress(skills);

      // Generate AI insights
      if (sessionsData.length > 0) {
        const progressData = {
          totalSessions: sessionsData.length,
          completionRate: sessionsData.filter((s) => s.completed).length / sessionsData.length,
          feedbackSummary: {
            easy: sessionsData.filter((s) => s.feedback === 'easy').length,
            struggled: sessionsData.filter((s) => s.feedback === 'struggled').length,
            needsPractice: sessionsData.filter((s) => s.feedback === 'needs_practice').length,
          },
          moodSummary: {
            happy: sessionsData.filter((s) => s.childMood === 'happy').length,
            neutral: sessionsData.filter((s) => s.childMood === 'neutral').length,
            frustrated: sessionsData.filter((s) => s.childMood === 'frustrated').length,
          },
        };

        const aiInsights = await generateProgressInsights(progressData);
        setInsights(aiInsights);
      }
    } catch (err: any) {
      console.error('Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (children.length === 0) {
    return (
      <div className="progress-dashboard">
        <div className="empty-state">
          <p>{t('pleaseAddChild')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  const completedCount = sessions.filter((s) => s.completed).length;
  const completionRate = sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0;

  const easyCount = sessions.filter((s) => s.feedback === 'easy').length;
  const struggledCount = sessions.filter((s) => s.feedback === 'struggled').length;
  const needsPracticeCount = sessions.filter((s) => s.feedback === 'needs_practice').length;

  const happyCount = sessions.filter((s) => s.childMood === 'happy').length;
  const neutralCount = sessions.filter((s) => s.childMood === 'neutral').length;
  const frustratedCount = sessions.filter((s) => s.childMood === 'frustrated').length;

  return (
    <div className="progress-dashboard">
      <h2>{t('progressDashboard')}</h2>

      {children.length > 1 && (
        <div className="child-selector">
          <label>{t('selectChild')}:</label>
          <select
            value={selectedChild?.id || ''}
            onChange={(e) => {
              const child = children.find((c) => c.id === e.target.value);
              setSelectedChild(child || null);
            }}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>{t('noSessionsRecorded')}</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{t('completionRate')}</h3>
              <div className="stat-value">{completionRate}%</div>
              <p>
                {completedCount} {t('ofTasksCompleted').replace('{count}', sessions.length.toString())}
              </p>
            </div>

            <div className="stat-card">
              <h3>{t('taskDifficulty')}</h3>
              <div className="progress-bars">
                <div className="progress-item">
                  <span>✅ {t('easy')}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill easy"
                      style={{ width: `${(easyCount / sessions.length) * 100}%` }}
                    />
                  </div>
                  <span>{easyCount}</span>
                </div>
                <div className="progress-item">
                  <span>😓 {t('struggled')}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill struggled"
                      style={{ width: `${(struggledCount / sessions.length) * 100}%` }}
                    />
                  </div>
                  <span>{struggledCount}</span>
                </div>
                <div className="progress-item">
                  <span>📝 {t('needsPractice')}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill needs-practice"
                      style={{ width: `${(needsPracticeCount / sessions.length) * 100}%` }}
                    />
                  </div>
                  <span>{needsPracticeCount}</span>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <h3>{t('childMood')}</h3>
              <div className="progress-bars">
                <div className="progress-item">
                  <span>😊 {t('happy')}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill happy"
                      style={{ width: `${(happyCount / sessions.length) * 100}%` }}
                    />
                  </div>
                  <span>{happyCount}</span>
                </div>
                <div className="progress-item">
                  <span>😐 {t('neutral')}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill neutral"
                      style={{ width: `${(neutralCount / sessions.length) * 100}%` }}
                    />
                  </div>
                  <span>{neutralCount}</span>
                </div>
                <div className="progress-item">
                  <span>😤 {t('frustrated')}</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill frustrated"
                      style={{ width: `${(frustratedCount / sessions.length) * 100}%` }}
                    />
                  </div>
                  <span>{frustratedCount}</span>
                </div>
              </div>
            </div>
          </div>

          {weeklySummary.length > 0 && (
            <div className="weekly-summary">
              <h3>{t('weeklyProgressTrends')}</h3>
              <div className="week-cards">
                {weeklySummary.map((week, index) => (
                  <div key={index} className="week-card">
                    <div className="week-header">{t('week')} {index + 1}</div>
                    <div className="week-completion">{week.completionRate}%</div>
                    <div className="week-stats">
                      {week.tasksCompleted}/{week.totalTasks} {t('tasks')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(skillProgress).length > 0 && (
            <div className="skill-progress-section">
              <h3>{t('skillDevelopmentProgress')}</h3>
              <div className="skills-grid">
                {Object.entries(skillProgress).map(([skillName, progressData]: [string, any]) => (
                  <div key={skillName} className="skill-card">
                    <h4>{skillName}</h4>
                    <div className="skill-progress-bar">
                      <div
                        className="skill-progress-fill"
                        style={{ width: `${progressData[progressData.length - 1]}%` }}
                      />
                    </div>
                    <div className="skill-score">{progressData[progressData.length - 1]}%</div>
                    <div className="skill-trend">
                      {progressData[progressData.length - 1] > progressData[0] ? `📈 ${t('improving')}` : `📊 ${t('stable')}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights && (
            <div className="ai-insights">
              <h3>{t('aiInsights')} 🤖</h3>
              <p>{insights}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProgressDashboard;
