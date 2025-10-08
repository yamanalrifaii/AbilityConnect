import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';
import './Auth.css';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('parent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, name, role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="language-toggle">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="lang-btn"
          >
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
        <h1>{t('appName')}</h1>
        <h2>{t('signUp')}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>{t('iAmA')}</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="parent">{t('parent')}</option>
              <option value="therapist">{t('therapist')}</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('creatingAccount') : t('signUp')}
          </button>
        </form>
        <p className="auth-link">
          {t('alreadyHaveAccount')} <a href="/signin">{t('signIn')}</a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
