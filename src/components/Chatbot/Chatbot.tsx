import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { chatWithAssistant } from '../../services/openai';
import { Child, TreatmentPlan } from '../../types';
import './Chatbot.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotProps {
  fullPage?: boolean;
}

const Chatbot: React.FC<ChatbotProps> = ({ fullPage = false }) => {
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(fullPage);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getInitialMessage = () => {
    return language === 'ar'
      ? 'مرحباً! أنا مساعدك العلاجي. يمكنني مساعدتك في مهام اليوم والإجابة على الأسئلة وتقديم التشجيع. كيف يمكنني مساعدتك اليوم؟'
      : "Hi! I'm your therapy assistant. I can help you with today's tasks, answer questions, and provide encouragement. How can I help you today?";
  };

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: getInitialMessage(),
      },
    ]);
  }, [language]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'parent') {
      loadUserContext();
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserContext = async () => {
    if (!currentUser) return;

    try {
      // Load children
      const childrenRef = collection(db, 'children');
      const childrenQuery = query(childrenRef, where('parentId', '==', currentUser.uid));
      const childrenSnapshot = await getDocs(childrenQuery);

      const children: Child[] = [];
      childrenSnapshot.forEach((doc) => {
        children.push({ id: doc.id, ...doc.data() } as Child);
      });

      // Load treatment plans for children
      const treatmentPlans: TreatmentPlan[] = [];
      for (const child of children) {
        const plansRef = collection(db, 'treatmentPlans');
        const plansQuery = query(plansRef, where('childId', '==', child.id));
        const plansSnapshot = await getDocs(plansQuery);

        plansSnapshot.forEach((doc) => {
          treatmentPlans.push({ id: doc.id, ...doc.data() } as TreatmentPlan);
        });
      }

      setUserContext({
        userName: currentUser.name,
        role: currentUser.role,
        children: children.map((c) => ({ name: c.name, id: c.id })),
        treatmentPlans: treatmentPlans.map((tp) => ({
          childId: tp.childId,
          weeklyGoals: tp.weeklyGoals,
          dailyTasks: tp.dailyTasks.map((t) => ({
            title: t.title,
            description: t.description,
            whyItMatters: t.whyItMatters,
          })),
        })),
      });
    } catch (err) {
      console.error('Error loading user context:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAssistant(
        [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        userContext,
        language
      );

      const assistantMessage: ChatMessage = { role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error chatting:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: language === 'ar'
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : "I'm sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = language === 'ar' ? [
    'ما هي مهمة اليوم؟',
    'كيف أقوم بهذا التمرين؟',
    'لماذا هذه المهمة مهمة؟',
    'طفلي يواجه صعوبة، ماذا أفعل؟',
  ] : [
    "What's today's task?",
    'How do I do this exercise?',
    'Why is this task important?',
    'My child is struggling, what should I do?',
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <>
      {!isOpen && !fullPage && (
        <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}

      {(isOpen || fullPage) && (
        <div className={fullPage ? "chatbot-container-fullpage" : "chatbot-container"}>
          {!fullPage && (
            <div className="chatbot-header">
              <h3>{language === 'ar' ? 'المساعد العلاجي' : 'Therapy Assistant'}</h3>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
          )}

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chat-message ${message.role}`}>
                <div className="message-bubble">
                  {message.role === 'assistant' && <span className="bot-icon">🤖</span>}
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="message-bubble">
                  <span className="bot-icon">🤖</span>
                  <p className="typing">{language === 'ar' ? 'جاري التفكير...' : 'Thinking...'}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="suggested-questions">
              <p>{language === 'ar' ? 'جرب السؤال:' : 'Try asking:'}</p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  className="suggested-question"
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'ar' ? 'اسأل أي شيء...' : 'Ask me anything...'}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {language === 'ar' ? 'إرسال' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
