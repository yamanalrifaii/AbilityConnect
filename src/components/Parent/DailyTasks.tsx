import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { TreatmentPlan, DailyTask, Child } from '../../types';
import './Parent.css';

interface DailyTasksProps {
  selectedChildFromProfile?: Child | null;
}

const DailyTasks: React.FC<DailyTasksProps> = ({ selectedChildFromProfile }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChildren();
  }, [currentUser]);

  useEffect(() => {
    if (selectedChildFromProfile) {
      setSelectedChild(selectedChildFromProfile);
    }
  }, [selectedChildFromProfile]);

  useEffect(() => {
    if (selectedChild) {
      loadTreatmentPlan(selectedChild.id);
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

  const loadTreatmentPlan = async (childId: string) => {
    setLoading(true);
    try {
      const plansRef = collection(db, 'treatmentPlans');
      const q = query(
        plansRef,
        where('childId', '==', childId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Sort by createdAt in JavaScript to avoid needing Firestore index
        const plans = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));

        plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTreatmentPlan(plans[0] as TreatmentPlan);
      } else {
        setTreatmentPlan(null);
      }
    } catch (err: any) {
      console.error('Error loading treatment plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadICalendar = () => {
    if (!treatmentPlan) return;

    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MediMinds//Therapy Tasks//EN\n';

    treatmentPlan.dailyTasks.forEach((task, index) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + index);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);

      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent += `BEGIN:VEVENT\n`;
      icsContent += `UID:task-${task.id}@mediminds.com\n`;
      icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
      icsContent += `DTSTART:${formatDate(startDate)}\n`;
      icsContent += `DTEND:${formatDate(endDate)}\n`;
      icsContent += `SUMMARY:${task.title}\n`;
      icsContent += `DESCRIPTION:${task.description}\\n\\nWhy it matters: ${task.whyItMatters}\n`;
      icsContent += `BEGIN:VALARM\n`;
      icsContent += `TRIGGER:-PT30M\n`;
      icsContent += `ACTION:DISPLAY\n`;
      icsContent += `DESCRIPTION:Reminder: ${task.title}\n`;
      icsContent += `END:VALARM\n`;
      icsContent += `END:VEVENT\n`;
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'therapy-tasks.ics';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">{t('loading') || 'Loading...'}</div>;
  }

  if (children.length === 0) {
    return (
      <div className="daily-tasks">
        <div className="empty-state">
          <p>{t('pleaseAddChild') || 'Please add a child to your profile first.'}</p>
        </div>
      </div>
    );
  }

  if (!treatmentPlan) {
    return (
      <div className="daily-tasks">
        <h2>{t('dailyTasks')}</h2>
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
        <div className="empty-state">
          <p>{t('noPlan') || 'No treatment plan found. Your therapist will create one soon.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-tasks">
      <h2>{t('dailyTasks')}</h2>

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

      <div className="treatment-summary">
        <h3>{t('treatmentPlanSummary')}</h3>
        <p>{treatmentPlan.summary}</p>
      </div>

      <div className="weekly-goals">
        <h3>{t('weeklyGoals')}</h3>
        <ul>
          {treatmentPlan.weeklyGoals.map((goal, index) => {
            // Support both old (string) and new (object) format
            const isNewFormat = typeof goal === 'object' && 'goal' in goal;
            const goalText = isNewFormat ? goal.goal : goal;
            const category = isNewFormat ? goal.category : null;

            return (
              <li key={index}>
                {goalText}
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

      <button onClick={downloadICalendar} className="btn-primary calendar-btn">
        📅 {t('addToIOSCalendar')}
      </button>

      <div className="tasks-list">
        <h3>{t('dailyTasks')}</h3>
        {treatmentPlan.dailyTasks.map((task, index) => (
          <div key={task.id} className="task-card">
            <div className="task-header">
              <h4>
                {t('day')} {index + 1}: {task.title}
              </h4>
            </div>
            <div className="task-body">
              <p>
                <strong>{t('howToDoIt')}:</strong> {task.description}
              </p>
              <p className="why-it-matters">
                <strong>{t('whyItMatters')}:</strong> {task.whyItMatters}
              </p>
              {task.demoVideoUrl && (
                <div className="video-container">
                  <h5>📹 {t('demoVideo')}</h5>
                  <video controls width="100%">
                    <source src={task.demoVideoUrl} />
                  </video>
                </div>
              )}
            </div>
            <div className="task-footer">
              <span className="goal-tag">
                {t('goal')} {task.weeklyGoalIndex + 1}:{' '}
                {typeof treatmentPlan.weeklyGoals[task.weeklyGoalIndex] === 'object'
                  ? (treatmentPlan.weeklyGoals[task.weeklyGoalIndex] as any).goal
                  : treatmentPlan.weeklyGoals[task.weeklyGoalIndex]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyTasks;
