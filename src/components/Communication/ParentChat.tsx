import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child } from '../../types';
import './Communication.css';

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: any;
}

const ParentChat: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [therapistName, setTherapistName] = useState('Therapist');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChildren();
  }, [currentUser]);

  useEffect(() => {
    if (selectedChild) {
      loadMessages(selectedChild.id);
      loadTherapistName(selectedChild.therapistId);
    }
  }, [selectedChild]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const loadTherapistName = async (therapistId?: string) => {
    if (!therapistId) return;

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', therapistId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const therapist = querySnapshot.docs[0].data();
        setTherapistName(therapist.name || 'Therapist');
      }
    } catch (err) {
      console.error('Error loading therapist:', err);
    }
  };

  const loadMessages = (childId: string) => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('childId', '==', childId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          senderId: data.senderId,
          senderRole: data.senderRole,
          content: data.content,
          createdAt: data.createdAt,
        });
      });

      // Sort messages by createdAt in JavaScript
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      setMessages(msgs);
    });

    return unsubscribe;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedChild || !newMessage.trim()) return;

    if (!selectedChild.therapistId) {
      alert('No therapist assigned to this child yet.');
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        senderRole: 'parent',
        receiverId: selectedChild.therapistId,
        childId: selectedChild.id,
        content: newMessage,
        read: false,
        createdAt: Timestamp.now(),
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (children.length === 0) {
    return (
      <div className="parent-chat-container">
        <div className="empty-state">
          <h3>No Children Found</h3>
          <p>Please add your child to your profile first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-chat-container">
      <div className="chat-header-parent">
        <div className="chat-header-info">
          <div className="chat-avatar-large">
            <span>{therapistName.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2>{therapistName}</h2>
            {selectedChild && (
              <p className="chat-subtitle">Therapist for {selectedChild.name}</p>
            )}
          </div>
        </div>
        {children.length > 1 && (
          <select
            value={selectedChild?.id || ''}
            onChange={(e) => {
              const child = children.find((c) => c.id === e.target.value);
              setSelectedChild(child || null);
            }}
            className="child-selector-dropdown"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="chat-messages-parent">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start a conversation with the therapist!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.senderId === currentUser?.uid ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  <p>{msg.content}</p>
                  <span className="message-time">
                    {msg.createdAt?.toDate().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form-parent">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('typeAMessage')}
        />
        <button type="submit" disabled={!newMessage.trim()}>
          {t('send')}
        </button>
      </form>
    </div>
  );
};

export default ParentChat;
