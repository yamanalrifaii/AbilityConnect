import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child } from '../../types';
import './Therapist.css';

interface FeedbackSession {
  id: string;
  childId: string;
  childName?: string;
  taskDescription: string;
  feedback: 'easy' | 'struggled' | 'needs_practice';
  childMood?: 'happy' | 'neutral' | 'frustrated';
  notes?: string;
  completedAt: Date;
}

const TherapistFeedback: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [feedbackList, setFeedbackList] = useState<FeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'easy' | 'struggled' | 'needs_practice'>('all');

  useEffect(() => {
    loadFeedback();
  }, [currentUser]);

  const loadFeedback = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Get therapist's patients
      const childrenRef = collection(db, 'children');
      const childrenQuery = query(childrenRef, where('therapistId', '==', currentUser.uid));
      const childrenSnapshot = await getDocs(childrenQuery);

      const childrenMap: Record<string, string> = {};
      childrenSnapshot.forEach((doc) => {
        const data = doc.data();
        childrenMap[doc.id] = data.name;
      });

      // Get feedback for all patients
      const sessionsRef = collection(db, 'therapySessions');
      const sessionsSnapshot = await getDocs(sessionsRef);

      const feedback: FeedbackSession[] = [];
      sessionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (childrenMap[data.childId]) {
          feedback.push({
            id: doc.id,
            childId: data.childId,
            childName: childrenMap[data.childId],
            taskDescription: data.taskDescription,
            feedback: data.feedback,
            childMood: data.childMood,
            notes: data.notes,
            completedAt: data.completedAt?.toDate() || new Date(),
          });
        }
      });

      // Sort by date
      feedback.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

      setFeedbackList(feedback);
    } catch (err) {
      console.error('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackIcon = (feedback: string) => {
    switch (feedback) {
      case 'easy':
        return '✅';
      case 'struggled':
        return '😓';
      case 'needs_practice':
        return '📝';
      default:
        return '📋';
    }
  };

  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'happy':
        return '😊';
      case 'neutral':
        return '😐';
      case 'frustrated':
        return '😤';
      default:
        return '';
    }
  };

  const filteredFeedback = selectedFilter === 'all'
    ? feedbackList
    : feedbackList.filter((f) => f.feedback === selectedFilter);

  if (loading) {
    return (
      <div className="therapist-feedback">
        <div className="loading">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="therapist-feedback">
      <div className="feedback-header">
        <h2>{t('parentFeedback')}</h2>
        <button onClick={loadFeedback} className="btn-refresh">
          {t('refresh')}
        </button>
      </div>

      <div className="feedback-filters">
        <button
          className={selectedFilter === 'all' ? 'active' : ''}
          onClick={() => setSelectedFilter('all')}
        >
          {t('all')} ({feedbackList.length})
        </button>
        <button
          className={selectedFilter === 'easy' ? 'active' : ''}
          onClick={() => setSelectedFilter('easy')}
        >
          ✅ {t('easy')} ({feedbackList.filter((f) => f.feedback === 'easy').length})
        </button>
        <button
          className={selectedFilter === 'struggled' ? 'active' : ''}
          onClick={() => setSelectedFilter('struggled')}
        >
          😓 {t('struggled')} ({feedbackList.filter((f) => f.feedback === 'struggled').length})
        </button>
        <button
          className={selectedFilter === 'needs_practice' ? 'active' : ''}
          onClick={() => setSelectedFilter('needs_practice')}
        >
          📝 {t('needsPractice')} ({feedbackList.filter((f) => f.feedback === 'needs_practice').length})
        </button>
      </div>

      {filteredFeedback.length === 0 ? (
        <div className="empty-state">
          <h3>{t('noFeedback') || 'No Feedback Yet'}</h3>
          <p>{t('feedbackWillAppear') || 'Parent feedback will appear here once they complete therapy sessions.'}</p>
        </div>
      ) : (
        <div className="feedback-list">
          {filteredFeedback.map((item) => (
            <div key={item.id} className="feedback-card">
              <div className="feedback-card-header">
                <div>
                  <h4>{item.childName}</h4>
                  <p className="feedback-date">
                    {item.completedAt.toLocaleDateString()} {t('at') || 'at'}{' '}
                    {item.completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="feedback-icons">
                  <span className="feedback-status">{getFeedbackIcon(item.feedback)}</span>
                  {item.childMood && (
                    <span className="mood-status">{getMoodIcon(item.childMood)}</span>
                  )}
                </div>
              </div>

              <div className="feedback-card-body">
                <div className="feedback-task">
                  <strong>{t('task')}:</strong> {item.taskDescription}
                </div>

                <div className="feedback-status-label">
                  <strong>{t('status')}:</strong>{' '}
                  <span className={`status-badge ${item.feedback}`}>
                    {item.feedback === 'easy' && t('taskWasEasy')}
                    {item.feedback === 'struggled' && t('childStruggled')}
                    {item.feedback === 'needs_practice' && t('needsPractice')}
                  </span>
                </div>

                {item.childMood && (
                  <div className="feedback-mood">
                    <strong>{t('childMood')}:</strong>{' '}
                    <span className={`mood-badge ${item.childMood}`}>
                      {item.childMood === 'happy' && t('happy')}
                      {item.childMood === 'neutral' && t('neutral')}
                      {item.childMood === 'frustrated' && (t('frustrated') || 'Frustrated')}
                    </span>
                  </div>
                )}

                {item.notes && (
                  <div className="feedback-notes">
                    <strong>{t('notesFromParent') || 'Notes from parent'}:</strong>
                    <p>{item.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TherapistFeedback;
