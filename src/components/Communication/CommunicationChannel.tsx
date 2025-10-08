import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TherapistChat from './TherapistChat';
import ParentChat from './ParentChat';
import './Communication.css';

const CommunicationChannel: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <div>Please sign in</div>;
  }

  return currentUser.role === 'therapist' ? <TherapistChat /> : <ParentChat />;
};

export default CommunicationChannel;
