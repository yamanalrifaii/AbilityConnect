import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child } from '../../types';
import './Parent.css';

const FeedbackForm: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [feedback, setFeedback] = useState<'easy' | 'struggled' | 'needs_practice' | ''>('');
  const [childMood, setChildMood] = useState<'happy' | 'neutral' | 'frustrated' | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadChildren();
  }, [currentUser]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedChild) return;

    setLoading(true);
    setSuccess(false);

    try {
      await addDoc(collection(db, 'therapySessions'), {
        childId: selectedChild.id,
        parentId: currentUser.uid,
        taskDescription: taskDescription,
        feedback: feedback,
        childMood: childMood,
        notes: notes,
        completed: true,
        completedAt: new Date(),
        createdAt: new Date(),
      });

      // Reset form
      setTaskDescription('');
      setFeedback('');
      setChildMood('');
      setNotes('');
      setSuccess(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (children.length === 0) {
    return (
      <div className="feedback-form">
        <div className="empty-state">
          <p>{t('pleaseAddChild')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-form">
      <h2>{t('homeTherapyFeedback')}</h2>

      {success && (
        <div className="success-message">
          {t('feedbackSubmitted')} 🎉
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {children.length > 1 && (
          <div className="form-group">
            <label>{t('selectChild')}</label>
            <select
              value={selectedChild?.id || ''}
              onChange={(e) => {
                const child = children.find((c) => c.id === e.target.value);
                setSelectedChild(child || null);
              }}
              required
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>{t('whichTaskDidYouComplete')}</label>
          <input
            type="text"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder={t('egBalanceExercise')}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('howDidItGo')}</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                value="easy"
                checked={feedback === 'easy'}
                onChange={(e) => setFeedback(e.target.value as 'easy')}
                required
              />
              <span>✅ {t('taskWasEasy')}</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="struggled"
                checked={feedback === 'struggled'}
                onChange={(e) => setFeedback(e.target.value as 'struggled')}
                required
              />
              <span>😓 {t('childStruggled')}</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="needs_practice"
                checked={feedback === 'needs_practice'}
                onChange={(e) => setFeedback(e.target.value as 'needs_practice')}
                required
              />
              <span>📝 {t('needsMorePractice')}</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>{t('childsMood')}</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                value="happy"
                checked={childMood === 'happy'}
                onChange={(e) => setChildMood(e.target.value as 'happy')}
              />
              <span>😊 {t('happy')}</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="neutral"
                checked={childMood === 'neutral'}
                onChange={(e) => setChildMood(e.target.value as 'neutral')}
              />
              <span>😐 {t('neutral')}</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                value="frustrated"
                checked={childMood === 'frustrated'}
                onChange={(e) => setChildMood(e.target.value as 'frustrated')}
              />
              <span>😤 {t('frustrated')}</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>{t('notesFromParent')} ({t('cancel')})</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            rows={4}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t('submitting') : t('submitFeedback')}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
