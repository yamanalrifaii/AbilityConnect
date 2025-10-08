import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import PatientSearch from './PatientSearch';
import TreatmentPlanView from './TreatmentPlanView';
import PatientList from './PatientList';
import CommunicationChannel from '../Communication/CommunicationChannel';
import TherapistFeedback from './TherapistFeedback';
import { Child } from '../../types';
import './Therapist.css';

type ViewType = 'myPatients' | 'treatmentPlan' | 'messages' | 'feedback';

const TherapistDashboard: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [activeView, setActiveView] = useState<ViewType>('myPatients');
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [myPatients, setMyPatients] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser && activeView === 'myPatients') {
      loadMyPatients();
    }
  }, [currentUser, activeView]);

  const loadMyPatients = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('therapistId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      const patients: Child[] = [];
      querySnapshot.forEach((doc) => {
        patients.push({ id: doc.id, ...doc.data() } as Child);
      });

      setMyPatients(patients);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (child: Child) => {
    setSelectedChild(child);
    setActiveView('treatmentPlan');
  };

  const handleBackToList = () => {
    setSelectedChild(null);
    setActiveView('myPatients');
    loadMyPatients();
  };

  const handleMessagePatient = (child: Child) => {
    setSelectedChild(child);
    setActiveView('messages');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="therapist-header">
        <div className="header-content">
          <h1>{t('appName')} - {t('therapist')} Portal</h1>
          <div className="user-info">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="lang-btn-navbar"
            >
              {language === 'en' ? 'ع' : 'EN'}
            </button>
            <span>{t('welcome')}, {currentUser?.name}</span>
            <button onClick={handleSignOut} className="btn-signout">
              {t('signOut')}
            </button>
          </div>
        </div>
      </header>

      {activeView !== 'treatmentPlan' && (
        <nav className="therapist-nav">
          <button
            className={activeView === 'myPatients' ? 'active' : ''}
            onClick={() => setActiveView('myPatients')}
          >
            {t('myPatients')}
          </button>
          <button
            className={activeView === 'messages' ? 'active' : ''}
            onClick={() => setActiveView('messages')}
          >
            💬 {t('messages')}
          </button>
          <button
            className={activeView === 'feedback' ? 'active' : ''}
            onClick={() => setActiveView('feedback')}
          >
            📝 {t('feedback')}
          </button>
        </nav>
      )}

      <div className="therapist-content">
        {activeView === 'myPatients' && (
          <PatientList
            patients={myPatients}
            loading={loading}
            onSelectPatient={handleSelectPatient}
            onRefresh={loadMyPatients}
            onMessagePatient={handleMessagePatient}
          />
        )}

        {activeView === 'treatmentPlan' && selectedChild && (
          <>
            <button onClick={handleBackToList} className="back-button">
              ← {t('backToMyPatients')}
            </button>
            <TreatmentPlanView child={selectedChild} />
          </>
        )}

        {activeView === 'messages' && <CommunicationChannel />}

        {activeView === 'feedback' && <TherapistFeedback />}
      </div>
    </div>
  );
};

export default TherapistDashboard;
