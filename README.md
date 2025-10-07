# AbilityConnect - Therapy Communication Platform

A comprehensive web application for better communication between parents and therapists, featuring AI-powered treatment plan generation, progress tracking, and real-time communication.

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
cd mediminds
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

### 9. Build for Production

```bash
npm run build
```

## Usage Guide

### For Therapists

1. **Sign Up**: Create an account and select "Therapist" role
2. **Sign In**: Log in to access the therapist dashboard
3. **Search Patient**: Enter the child's National ID to find them
4. **Create Treatment Plan**:
   - Upload a voice recording of your therapy session
   - Optionally attach a treatment plan document
   - The AI will:
     - Transcribe your recording
     - Generate a summary
     - Create weekly goals
     - Generate daily tasks with "why it matters" explanations
     - Suggest demo video content
5. **Upload Videos**: Upload demonstration videos for specific tasks
6. **Communicate**: Message parents directly about progress

### For Parents

1. **Sign Up**: Create an account and select "Parent" role
2. **Sign In**: Log in to access the parent dashboard
3. **Add Child**: Go to Profile and add your child's information
4. **View Tasks**:
   - Navigate to "Daily Tasks"
   - See treatment plan summary and weekly goals
   - Review daily tasks with descriptions and explanations
   - Watch demo videos if available
   - Download tasks to iOS Calendar
5. **Submit Feedback**:
   - After completing tasks, go to "Submit Feedback"
   - Rate task difficulty and child's mood
   - Add optional notes
6. **Track Progress**:
   - View completion rates and trends
   - See AI-generated insights
7. **Chat with AI**: Click the chatbot icon for instant help
8. **Message Therapist**: Use the Messages tab to communicate

## Important Notes

### iOS Calendar Integration

The iOS Calendar integration works by generating `.ics` files that can be imported into any calendar application. Users need to:
1. Click "Add to iOS Calendar"
2. Download the `.ics` file
3. Open the file on their iOS device
4. Import to Calendar app


### Video Storage

Videos are stored directly in Firebase Storage. For large-scale production:
- Consider using a CDN
- Implement video compression
- Add video processing pipeline
- Consider cost optimization strategies

## Database Schema

### Collections

- **users**: User profiles (parent/therapist)
- **children**: Child profiles
- **treatmentPlans**: Treatment plans with AI-generated content
- **therapySessions**: Session feedback from parents
- **messages**: Communication between parents and therapists

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check your `.env` file configuration
2. **OpenAI API errors**: Verify your API key and quota
3. **Audio transcription fails**: Ensure audio file is in supported format (MP3, WAV, M4A, etc.)
4. **Build errors**: Delete `node_modules` and run `npm install` again

## Future Enhancements

- Native mobile apps (iOS/Android)
- Video chat for remote therapy sessions
- Multi-language support
- Gamification for children
- Advanced analytics dashboard


