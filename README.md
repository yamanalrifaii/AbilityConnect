# AbilityConnect - Pediatric Home Therapy Companian 

AbilityConnect transforms how therapists and parents collaborate on child therapy. Therapists simply record their session notes—AI transcribes, summarizes, and creates actionable daily tasks automatically. Parents see exactly what to do each day, track their child's progress through visual dashboards, and communicate directly with therapists, ensuring consistent therapy execution at home.

## Features

### For Therapists
- **Patient Search**: Find patients using their National ID
- **AI-Powered Treatment Plans**:
  - Upload voice recordings of therapy sessions
  - Automatic transcription using OpenAI Whisper
  - GPT-4 generates clear summaries, weekly goals, and daily tasks
  - AI suggests demo video content for each task
- **Video Upload**: Upload demonstration videos (stored in Firebase Storage)
- **Communication**: Direct messaging with parents

### For Parents
- **Profile Management**: Add and manage children
- **Daily Tasks**:
  - View AI-generated daily home therapy tasks
  - Clear "why it matters" explanations
  - Demo videos and suggestions
  - Download tasks to iOS Calendar (.ics file)
- **Feedback System**:
  - Submit feedback after each therapy session
  - Track task difficulty and child's mood
- **Progress Dashboard**:
  - View completion rates
  - Track task difficulty trends
  - Monitor child's mood patterns
  - AI-generated progress insights
- **Communication**: Direct messaging with therapist
- **AI Chatbot**:
  - 24/7 support for questions
  - Task guidance
  - Encouragement and motivation

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **AI**: OpenAI (GPT-4 for summarization, Whisper for transcription)
- **Routing**: React Router v6
- **Styling**: Custom CSS

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- OpenAI API account

### 1. Clone the Repository
```bash
git clone https://github.com/yamanalrifaii/AbilityConnect.git
cd AbilityConnect
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication**: Enable Email/Password authentication
   - **Firestore Database**: Create a database in production mode
   - **Storage**: Enable Firebase Storage

4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the Firebase configuration object

### 4. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Make sure you have access to:
   - GPT-4 API
   - Whisper API

### 5. Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id

REACT_APP_OPENAI_API_KEY=your_openai_api_key
```

### 6. Firestore Security Rules

Set up the following security rules in Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Children collection
    match /children/{childId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (resource.data.parentId == request.auth.uid ||
         resource.data.therapistId == request.auth.uid);
    }

    // Treatment plans
    match /treatmentPlans/{planId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Therapy sessions
    match /therapySessions/{sessionId} {
      allow read, write: if request.auth != null;
    }

    // Messages
    match /messages/{messageId} {
      allow read: if request.auth != null &&
        (resource.data.senderId == request.auth.uid ||
         resource.data.receiverId == request.auth.uid);
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        resource.data.receiverId == request.auth.uid;
    }
  }
}
```

### 7. Storage Security Rules

Set up the following security rules in Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /voice-recordings/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /demo-videos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /documents/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 8. Run the Application

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)



