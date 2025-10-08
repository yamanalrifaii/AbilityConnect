import React, { useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Child } from '../../types';
import './Therapist.css';

interface PatientSearchProps {
  onSelectPatient: (child: Child) => void;
  onPatientAdded: () => void;
}

const PatientSearch: React.FC<PatientSearchProps> = ({ onSelectPatient, onPatientAdded }) => {
  const { currentUser } = useAuth();
  const [nationalId, setNationalId] = useState('');
  const [searchResults, setSearchResults] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientId, setNewPatientId] = useState('');
  const [addingPatient, setAddingPatient] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSearchResults([]);

    try {
      const childrenRef = collection(db, 'children');
      const q = query(childrenRef, where('nationalId', '==', nationalId));
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
      setLoading(false);
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
      setNationalId('');
      onPatientAdded();
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
        parentId: '', // Parent will need to add this child to their profile
        therapistId: currentUser.uid,
        createdAt: new Date(),
      });

      alert(`Patient ${newPatientName} added successfully!`);
      setNewPatientName('');
      setNewPatientId('');
      setShowAddForm(false);
      onPatientAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to add patient');
    } finally {
      setAddingPatient(false);
    }
  };

  return (
    <div className="patient-search">
      <div className="search-header">
        <h2>Find Patient</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-add-patient"
        >
          {showAddForm ? '← Back to Search' : '+ Add New Patient'}
        </button>
      </div>

      {!showAddForm ? (
        <>
          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label>Child's National ID</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="Enter National ID"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}

          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results</h3>
              {searchResults.map((child) => (
                <div key={child.id} className="patient-card">
                  <div className="patient-info">
                    <h4>{child.name}</h4>
                    <p>National ID: {child.nationalId}</p>
                    {child.therapistId && (
                      <p className="status-assigned">Already assigned to a therapist</p>
                    )}
                  </div>
                  <div className="patient-actions">
                    <button
                      onClick={() => onSelectPatient(child)}
                      className="btn-view"
                    >
                      View
                    </button>
                    {!child.therapistId && (
                      <button
                        onClick={() => handleAssignToMe(child)}
                        className="btn-assign"
                      >
                        Add to My Patients
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="add-patient-form">
          <h3>Add New Patient</h3>
          <p className="form-description">
            Create a new patient profile. The parent can later add this child to their account using the same National ID.
          </p>

          {error && <div className="error-message">{error}</div>}

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

            <button
              type="submit"
              disabled={addingPatient}
              className="btn-primary"
            >
              {addingPatient ? 'Adding Patient...' : 'Add Patient'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PatientSearch;
