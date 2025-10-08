import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Child } from '../../types';
import VoiceRecorder from './VoiceRecorder';
import './Therapist.css';

interface PatientListProps {
  patients: Child[];
  loading: boolean;
  onSelectPatient: (child: Child) => void;
  onRefresh: () => void;
  onMessagePatient?: (child: Child) => void;
}

const PatientList: React.FC<PatientListProps> = ({
  patients,
  loading,
  onSelectPatient,
  onRefresh,
  onMessagePatient,
}) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [recordingForPatient, setRecordingForPatient] = useState<string | null>(null);
  const [filteredPatients, setFilteredPatients] = useState<Child[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientId, setNewPatientId] = useState('');
  const [searchNationalId, setSearchNationalId] = useState('');
  const [searchResults, setSearchResults] = useState<Child[]>([]);
  const [addingPatient, setAddingPatient] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Set all patients as filtered (no local search now)
    setFilteredPatients(patients);
  }, [patients]);

  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearching(true);
    setSearchResults([]);

    try {
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('nationalId', '==', searchNationalId));
      const querySnapshot = await getDocs(q);

      const results: Child[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Child);
      });

      if (results.length === 0) {
        setError('No patient found with this National ID');
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setError(err.message || 'Error searching for patient');
    } finally {
      setSearching(false);
    }
  };

  const handleAssignToMe = async (child: Child) => {
    if (!currentUser) return;

    try {
      const childRef = doc(db, 'children', child.id);
      await updateDoc(childRef, {
        therapistId: currentUser.uid,
      });

      alert(`${child.name} has been added to your patient list!`);
      setSearchResults([]);
      setSearchNationalId('');
      setShowSearchForm(false);
      onRefresh();
    } catch (err: any) {
      alert('Failed to assign patient: ' + err.message);
    }
  };

  const handleAddNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError('');
    setAddingPatient(true);

    try {
      // Check if patient with this ID already exists
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('nationalId', '==', newPatientId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError('A patient with this National ID already exists');
        setAddingPatient(false);
        return;
      }

      // Create new patient
      await addDoc(collection(db, 'children'), {
        name: newPatientName,
        nationalId: newPatientId,
        parentId: '',
        therapistId: currentUser.uid,
        createdAt: new Date(),
      });

      alert(`Patient ${newPatientName} added successfully!`);
      setNewPatientName('');
      setNewPatientId('');
      setShowAddForm(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add patient');
    } finally {
      setAddingPatient(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-list-container">
        <div className="loading">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="patient-list-container">
      <div className="patient-list-header">
        <h2>{t('myPatients')}</h2>
        <div className="header-actions">
          <button
            onClick={() => {
              setShowSearchForm(!showSearchForm);
              setShowAddForm(false);
            }}
            className="btn-search-patient"
          >
            🔍 {t('findPatientById')}
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowSearchForm(false);
            }}
            className="btn-add-patient"
          >
            + {t('addNewPatient')}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showSearchForm && (
        <div className="search-form-panel">
          <h3>Find Patient by National ID</h3>
          <form onSubmit={handleSearchPatient}>
            <div className="form-group">
              <input
                type="text"
                value={searchNationalId}
                onChange={(e) => setSearchNationalId(e.target.value)}
                placeholder="Enter National ID"
                required
              />
            </div>
            <button type="submit" disabled={searching} className="btn-primary">
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Search Results</h4>
              {searchResults.map((child) => (
                <div key={child.id} className="search-result-card">
                  <div>
                    <h5>{child.name}</h5>
                    <p>ID: {child.nationalId}</p>
                    {child.therapistId && <p className="status-assigned">Already assigned</p>}
                  </div>
                  <div>
                    {!child.therapistId && (
                      <button onClick={() => handleAssignToMe(child)} className="btn-assign">
                        Add to My Patients
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddForm && (
        <div className="add-form-panel">
          <h3>Add New Patient</h3>
          <form onSubmit={handleAddNewPatient}>
            <div className="form-group">
              <label>Patient Name *</label>
              <input
                type="text"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Enter patient's full name"
                required
              />
            </div>
            <div className="form-group">
              <label>National ID *</label>
              <input
                type="text"
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
                placeholder="Enter patient's national ID"
                required
              />
              <small>This ID will be used by parents to connect their account</small>
            </div>
            <button type="submit" disabled={addingPatient} className="btn-primary">
              {addingPatient ? 'Adding Patient...' : 'Add Patient'}
            </button>
          </form>
        </div>
      )}

      {filteredPatients.length === 0 && patients.length === 0 ? (
        <div className="empty-state">
          <h3>No Patients Found</h3>
          <p>Get started by searching for a patient or adding a new one using the buttons above.</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="empty-state">
          <h3>No matches found</h3>
          <p>Try adjusting your search or add a new patient.</p>
        </div>
      ) : null}

      <div className="patients-grid">
        {filteredPatients.map((patient) => (
          <div key={patient.id} className="patient-card-large">
            <div className="patient-card-header">
              <div className="patient-avatar">
                <span>{patient.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="patient-details">
                <h3>{patient.name}</h3>
                <p className="patient-id">{t('id')}: {patient.nationalId}</p>
              </div>
            </div>

            <div className="patient-card-actions">
              <button
                onClick={() => setRecordingForPatient(patient.id)}
                className="btn-record"
              >
                🎤 {t('recordSession')}
              </button>
              <button
                onClick={() => onSelectPatient(patient)}
                className="btn-view-plan"
              >
                📋 {t('viewTreatmentPlan')}
              </button>
              <button
                onClick={() => onMessagePatient && onMessagePatient(patient)}
                className="btn-message"
              >
                💬 {t('messageParent')}
              </button>
            </div>

            {recordingForPatient === patient.id && (
              <div className="voice-recorder-modal">
                <VoiceRecorder
                  child={patient}
                  onClose={() => setRecordingForPatient(null)}
                  onComplete={(child) => {
                    setRecordingForPatient(null);
                    onSelectPatient(child);
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientList;
