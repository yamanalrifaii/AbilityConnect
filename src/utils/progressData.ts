// Generate sample progress data for demonstration
export const generateSampleProgressData = (childId: string, days: number = 14) => {
  const sessions = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate realistic progress - starts lower, improves over time
    const dayProgress = i / days; // 0 to 1, where newer = higher
    const completionChance = 0.5 + (dayProgress * 0.4); // 50-90% completion rate

    const feedbackOptions: Array<'easy' | 'struggled' | 'needs_practice'> = ['easy', 'struggled', 'needs_practice'];
    const moodOptions: Array<'happy' | 'neutral' | 'frustrated'> = ['happy', 'neutral', 'frustrated'];

    // Weight feedback based on progress (better over time)
    let feedback: 'easy' | 'struggled' | 'needs_practice';
    const rand = Math.random();
    if (dayProgress > 0.7) {
      // Later days - mostly easy
      feedback = rand < 0.7 ? 'easy' : (rand < 0.9 ? 'needs_practice' : 'struggled');
    } else if (dayProgress > 0.4) {
      // Middle days - mixed
      feedback = rand < 0.4 ? 'easy' : (rand < 0.7 ? 'needs_practice' : 'struggled');
    } else {
      // Early days - more struggle
      feedback = rand < 0.2 ? 'easy' : (rand < 0.6 ? 'needs_practice' : 'struggled');
    }

    // Mood correlates with feedback
    let childMood: 'happy' | 'neutral' | 'frustrated';
    if (feedback === 'easy') {
      childMood = Math.random() < 0.8 ? 'happy' : 'neutral';
    } else if (feedback === 'needs_practice') {
      childMood = Math.random() < 0.5 ? 'neutral' : (Math.random() < 0.7 ? 'happy' : 'frustrated');
    } else {
      childMood = Math.random() < 0.6 ? 'frustrated' : 'neutral';
    }

    sessions.push({
      id: `session_${childId}_${i}`,
      childId,
      taskId: `task_${i % 7}`, // 7 daily tasks cycle
      parentId: 'parent_id',
      completed: Math.random() < completionChance,
      feedback,
      childMood,
      notes: '',
      completedAt: date,
      createdAt: date,
    });
  }

  return sessions.reverse(); // Oldest first
};

// Generate weekly summary data
export const generateWeeklySummary = (sessions: any[]) => {
  const weeks: any[] = [];
  const today = new Date();

  for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (weekIndex * 7) - 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.completedAt);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });

    const completed = weekSessions.filter(s => s.completed).length;
    const total = weekSessions.length;

    weeks.push({
      weekStart,
      weekEnd,
      tasksCompleted: completed,
      totalTasks: total,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      engagementRate: Math.round(Math.random() * 30 + 70), // 70-100%
    });
  }

  return weeks.reverse(); // Oldest first
};

// Calculate skill progress over time
export const calculateSkillProgress = (therapyType: string, sessions: any[]) => {
  const skills: { [key: string]: number[] } = {};

  // Define skills based on therapy type
  let skillNames: string[] = [];

  switch (therapyType) {
    case 'speech':
      skillNames = ['Articulation', 'Vocabulary', 'Sentence Formation', 'Comprehension'];
      break;
    case 'behavior':
      skillNames = ['Following Instructions', 'Social Skills', 'Self-Regulation', 'Task Completion'];
      break;
    case 'emotional':
      skillNames = ['Emotional Recognition', 'Coping Skills', 'Empathy', 'Self-Awareness'];
      break;
    case 'motor':
      skillNames = ['Fine Motor', 'Gross Motor', 'Coordination', 'Balance'];
      break;
    default:
      skillNames = ['Skill 1', 'Skill 2', 'Skill 3', 'Skill 4'];
  }

  // Generate progress data for each skill
  skillNames.forEach((skillName, index) => {
    const progressData = [];
    const baseStart = 40 + (index * 5); // Each skill starts at different baseline

    for (let i = 0; i < 8; i++) {
      // Gradual improvement with some variance
      const progress = Math.min(100, baseStart + (i * 6) + (Math.random() * 10 - 5));
      progressData.push(Math.round(progress));
    }

    skills[skillName] = progressData;
  });

  return skills;
};
