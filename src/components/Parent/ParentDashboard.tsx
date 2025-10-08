import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import ParentProfile from './ParentProfile';
import DailyTasks from './DailyTasks';
import FeedbackForm from './FeedbackForm';
import ProgressDashboard from './ProgressDashboard';
import CommunicationChannel from '../Communication/CommunicationChannel';
import Chatbot from '../Chatbot/Chatbot';
import './Dashboard.css';

type TabType = 'profile' | 'tasks' | 'feedback' | 'progress' | 'communication' | 'chatbot';

const ParentDashboard: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSelectChild = (child: any) => {
    setSelectedChild(child);
    setActiveTab('tasks');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>{t('appName')} - {t('parent')} Portal</h1>
        <div className="user-info">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="lang-btn-navbar"
          >
            {language === 'en' ? 'ع' : 'EN'}
          </button>
          <span>{t('welcome')}, {currentUser?.name}</span>
          <button onClick={handleSignOut} className="btn-secondary">
            {t('signOut')}
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          {t('profile')}
        </button>
        <button
          className={activeTab === 'tasks' ? 'active' : ''}
          onClick={() => setActiveTab('tasks')}
        >
          {t('dailyTasks')}
        </button>
        <button
          className={activeTab === 'feedback' ? 'active' : ''}
          onClick={() => setActiveTab('feedback')}
        >
          {t('submitFeedback')}
        </button>
        <button
          className={activeTab === 'progress' ? 'active' : ''}
          onClick={() => setActiveTab('progress')}
        >
          {t('progress')}
        </button>
        <button
          className={activeTab === 'communication' ? 'active' : ''}
          onClick={() => setActiveTab('communication')}
        >
          {t('messages')}
        </button>
        <button
          className={activeTab === 'chatbot' ? 'active' : ''}
          onClick={() => setActiveTab('chatbot')}
        >
          🤖 {t('aiAssistant')}
        </button>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'profile' && <ParentProfile onSelectChild={handleSelectChild} />}
        {activeTab === 'tasks' && <DailyTasks selectedChildFromProfile={selectedChild} />}
        {activeTab === 'feedback' && <FeedbackForm />}
        {activeTab === 'progress' && <ProgressDashboard />}
        {activeTab === 'communication' && <CommunicationChannel />}
        {activeTab === 'chatbot' && <Chatbot fullPage={true} />}
      </div>
    </div>
  );
};

export default ParentDashboard;
