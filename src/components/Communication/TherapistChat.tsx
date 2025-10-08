import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child } from '../../types';
import './Communication.css';

interface Conversation {
  child: Child;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  parentName: string;
}

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: any;
}

const TherapistChat: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.child.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!currentUser) return;

    try {
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('therapistId', '==', currentUser.uid));
      const childrenSnapshot = await getDocs(q);

      const convos: Conversation[] = [];

      for (const childDoc of childrenSnapshot.docs) {
        const child = { id: childDoc.id, ...childDoc.data() } as Child;

        // Get last message
        const messagesRef = collection(db, 'messages');
        const messagesQuery = query(
          messagesRef,
          where('childId', '==', child.id)
        );
        const messagesSnapshot = await getDocs(messagesQuery);

        let lastMessage = t('noMessages');
        let lastMessageTime = new Date();
        let unreadCount = 0;

        if (!messagesSnapshot.empty) {
          // Sort messages by createdAt in JavaScript
          const messages = messagesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => {
              const timeA = a.createdAt?.toMillis?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || 0;
              return timeB - timeA; // Descending order for latest first
            });

          const lastMsg = messages[0] as any;
          lastMessage = lastMsg.content;
          lastMessageTime = lastMsg.createdAt?.toDate() || new Date();

          // Count unread messages
          unreadCount = messages.filter(
            (msg: any) => !msg.read && msg.receiverId === currentUser.uid
          ).length;
        }

        convos.push({
          child,
          lastMessage,
          lastMessageTime,
          unreadCount,
          parentName: `${child.name}'s parent`,
        });
      }

      // Sort by last message time
      convos.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      setConversations(convos);
    } catch (err) {
      console.error('Error loading conversations:', err);
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
    if (!currentUser || !selectedConversation || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        senderRole: 'therapist',
        receiverId: selectedConversation.child.parentId,
        childId: selectedConversation.child.id,
        content: newMessage,
        read: false,
        createdAt: Timestamp.now(),
      });

      setNewMessage('');
      loadConversations(); // Refresh to update last message
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.parentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="therapist-chat-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>{t('chat')}</h2>
        </div>
        <div className="chat-search">
          <input
            type="text"
            placeholder={`🔍 ${t('searchParents')}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="conversations-list">
          {filteredConversations.map((conv) => (
            <div
              key={conv.child.id}
              className={`conversation-item ${selectedConversation?.child.id === conv.child.id ? 'active' : ''}`}
              onClick={() => setSelectedConversation(conv)}
            >
              <div className="conversation-avatar">
                <span>{conv.child.name.charAt(0).toUpperCase()}</span>
                {conv.unreadCount > 0 && <div className="online-indicator" />}
              </div>
              <div className="conversation-details">
                <div className="conversation-header">
                  <h4>{conv.parentName}</h4>
                  <span className="conversation-time">{formatTime(conv.lastMessageTime)}</span>
                </div>
                <div className="conversation-preview">
                  <p>{conv.lastMessage}</p>
                  {conv.unreadCount > 0 && (
                    <span className="unread-badge">{conv.unreadCount}</span>
                  )}
                </div>
                <div className="conversation-child-tag">{conv.child.name}'s parent</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar">
                  <span>{selectedConversation.child.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3>{selectedConversation.parentName}</h3>
                  <p className="chat-subtitle">{selectedConversation.child.name}'s parent</p>
                </div>
              </div>
            </div>

            <div className="chat-messages">
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
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('typeMessage')}
              />
              <button type="submit" disabled={!newMessage.trim()}>
                {t('send')}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty-state">
            <h3>{t('selectConversation')}</h3>
            <p>{t('chooseParent')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistChat;
