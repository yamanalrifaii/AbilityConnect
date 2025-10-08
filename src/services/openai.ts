import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, use a backend API
});

export const transcribeAudio = async (audioFile: File): Promise<string> => {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

export const summarizeTreatmentPlan = async (transcription: string, language: string = 'en') => {
  try {
    const isArabic = language === 'ar';
    const systemPrompt = isArabic
      ? `أنت مساعد مفيد يلخص خطط العلاج للمعالجين لأولياء الأمور.
          استخرج ونظم المعلومات إلى:
          1. ملخص واضح لخطة العلاج
          2. الأهداف الأسبوعية مع فئات نوع العلاج
          3. المهام اليومية مع الأوصاف وشرح "لماذا هذا مهم"
          4. تصنيف نوع العلاج الرئيسي الشامل

          فئات نوع العلاج:
          - "speech": علاج النطق، تطوير اللغة، مهارات التواصل، النطق
          - "behavior": تحليل السلوك التطبيقي (ABA)، تعديل السلوك، المهارات الاجتماعية
          - "emotional": المهارات الاجتماعية العاطفية، التنظيم العاطفي، إدارة المشاعر
          - "motor": العلاج الطبيعي، العلاج الوظيفي، المهارات الحركية الدقيقة/الكبيرة، التنسيق

          لكل هدف، حدد فئة نوع العلاج التي يعالجها.
          يجب أن يكون therapyType الشامل هو الفئة الأكثر بروزاً في الجلسة.

          مهم جداً: يجب أن ترد بكائن JSON صالح فقط، بدون أي نص آخر. استخدم اللغة العربية لجميع النصوص.

          قم بإرجاع الاستجابة ككائن JSON بهذا الهيكل:
          {
            "summary": "ملخص موجز لخطة العلاج",
            "therapyType": "speech" | "behavior" | "emotional" | "motor",
            "weeklyGoals": [
              {
                "goal": "نص الهدف",
                "category": "speech" | "behavior" | "emotional" | "motor"
              }
            ],
            "dailyTasks": [
              {
                "title": "عنوان المهمة",
                "description": "كيفية القيام بالمهمة",
                "whyItMatters": "لماذا هذه المهمة مهمة",
                "weeklyGoalIndex": 0
              }
            ]
          }`
      : `You are a helpful assistant that summarizes therapist treatment plans for parents.
          Extract and organize the information into:
          1. A clear summary of the treatment plan
          2. Weekly goals with therapy type categories
          3. Daily tasks with descriptions and "why it matters" explanations
          4. Overall primary therapy type classification

          Therapy type categories:
          - "speech": Speech therapy, language development, communication skills, articulation
          - "behavior": Applied Behavior Analysis (ABA), behavior modification, social skills
          - "emotional": Social-emotional skills, emotional regulation, feelings management
          - "motor": Physical therapy, occupational therapy, fine/gross motor skills, coordination

          For each goal, determine which therapy type category it addresses.
          The overall therapyType should be the most prominent category in the session.

          IMPORTANT: You must respond with ONLY a valid JSON object, no other text.

          Return the response as a JSON object with this structure:
          {
            "summary": "Brief summary of the treatment plan",
            "therapyType": "speech" | "behavior" | "emotional" | "motor",
            "weeklyGoals": [
              {
                "goal": "Goal text",
                "category": "speech" | "behavior" | "emotional" | "motor"
              }
            ],
            "dailyTasks": [
              {
                "title": "Task title",
                "description": "How to do the task",
                "whyItMatters": "Why this task is important",
                "weeklyGoalIndex": 0
              }
            ]
          }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: transcription,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error('Error summarizing treatment plan:', error);
    throw error;
  }
};

export const generateDemoVideoSuggestion = async (taskDescription: string, language: string = 'en'): Promise<string> => {
  try {
    const isArabic = language === 'ar';
    const systemPrompt = isArabic
      ? 'أنت مساعد مفيد يقترح ما يجب أن يكون في فيديو توضيحي لمهام العلاج. كن محددًا وموجزًا (جملتان إلى ثلاث جمل). يرجى الرد باللغة العربية.'
      : 'You are a helpful assistant that suggests what should be in a demonstration video for therapy tasks. Be specific and concise (2-3 sentences).';

    const userPrompt = isArabic
      ? `اقترح ما يجب أن يظهر في فيديو توضيحي مدته 10-20 ثانية لمهمة العلاج هذه: ${taskDescription}`
      : `Suggest what should be shown in a 10-20 second demonstration video for this therapy task: ${taskDescription}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating video suggestion:', error);
    throw error;
  }
};

export const generateProgressInsights = async (progressData: any): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides insights on therapy progress. Be encouraging and specific.',
        },
        {
          role: 'user',
          content: `Analyze this progress data and provide helpful insights: ${JSON.stringify(progressData)}`,
        },
      ],
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
};

export const chatWithAssistant = async (
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  userContext: any,
  language: string = 'en'
) => {
  try {
    const systemPrompt = language === 'ar'
      ? `أنت مساعد علاجي مفيد. تساعد أولياء الأمور على فهم مهام العلاج لأطفالهم، وتقديم التشجيع، وتسهيل التواصل مع المعالجين.

      سياق المستخدم: ${JSON.stringify(userContext)}

      يمكنك:
      - الإجابة على أسئلة حول مهام اليوم
      - تقديم إرشادات حول التمارين
      - مساعدة أولياء الأمور في تسجيل الملاحظات
      - تشجيع وتحفيز العائلات
      - ربط التواصل بين ولي الأمر والمعالج

      يرجى الرد باللغة العربية.`
      : `You are a helpful therapy assistant chatbot. You help parents understand their child's therapy tasks, provide encouragement, and facilitate communication with therapists.

          User context: ${JSON.stringify(userContext)}

          You can:
          - Answer questions about today's tasks
          - Provide guidance on exercises
          - Help parents log feedback
          - Encourage and motivate families
          - Bridge communication between parent and therapist`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error chatting with assistant:', error);
    throw error;
  }
};
