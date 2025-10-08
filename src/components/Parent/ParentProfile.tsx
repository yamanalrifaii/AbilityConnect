import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child } from '../../types';
import './Parent.css';

interface ParentProfileProps {
  onSelectChild?: (child: Child) => void;
}

const ParentProfile: React.FC<ParentProfileProps> = ({ onSelectChild }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      console.error('Error loading children:', err);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError('');
    setLoading(true);

    try {
      // First, search for existing child with this National ID
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('nationalId', '==', nationalId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Child exists (created by therapist), link it to this parent
        const childDoc = querySnapshot.docs[0];
        const childData = childDoc.data();

        if (childData.parentId && childData.parentId !== currentUser.uid) {
          setError('This child is already linked to another parent account');
          setLoading(false);
          return;
        }

        const childRef = doc(db, 'children', childDoc.id);
        await updateDoc(childRef, {
          parentId: currentUser.uid,
          name: childName, // Update name if parent provides it
        });
      } else {
        // Child doesn't exist yet, create new record
        await addDoc(collection(db, 'children'), {
          name: childName,
          nationalId: nationalId,
          parentId: currentUser.uid,
          createdAt: new Date(),
        });
      }

      setChildName('');
      setNationalId('');
      setShowAddChild(false);
      await loadChildren();
    } catch (err: any) {
      setError(err.message || 'Failed to add child');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parent-profile">
      <h2>{t('myChildren')}</h2>

      {error && <div className="error-message">{error}</div>}

      {children.length === 0 && !showAddChild && (
        <div className="empty-state">
          <p>{t('noChildren')}</p>
        </div>
      )}

      {children.length > 0 && (
        <div className="children-list">
          {children.map((child) => (
            <div
              key={child.id}
              className="child-card clickable"
              onClick={() => onSelectChild && onSelectChild(child)}
            >
              <h3>{child.name}</h3>
              <p>{t('nationalId')}: {child.nationalId}</p>
              {onSelectChild && <p className="click-hint">→ {t('clickToViewTasks')}</p>}
            </div>
          ))}
        </div>
      )}

      {!showAddChild ? (
        <button
          onClick={() => setShowAddChild(true)}
          className="btn-primary"
        >
          {t('addChild+')}
        </button>
      ) : (
        <div className="add-child-form">
          <h3>{t('addChild')}</h3>
          <form onSubmit={handleAddChild}>
            <div className="form-group">
              <label>{t('childName')}</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>{t('nationalId')}</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                required
              />
            </div>
            <div className="button-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? t('adding') : t('addChild')}
              </button>
              <button
                type="button"
                onClick={() => setShowAddChild(false)}
                className="btn-secondary"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ParentProfile;
