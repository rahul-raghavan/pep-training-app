export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  module: string; // Which module this relates to
}

export const assessmentQuestions: AssessmentQuestion[] = [
  // Module 1: Welcome & Orientation
  {
    id: 'final-1',
    question: 'What is the PRIMARY goal of an admissions conversation?',
    options: [
      'Convince parents PEP is better than alternatives',
      'Help families decide if PEP is right for them',
      'Fill available seats with committed families',
      'Build rapport and leave a positive impression'
    ],
    correctIndex: 1,
    explanation: 'Our goal is mutual fit, not persuasion. We help families make informed decisions—even if that decision is "PEP isn\'t right for us."',
    module: 'Welcome & Orientation'
  },

  // Module 2: Belief System
  {
    id: 'final-2',
    question: 'What is PEP\'s core belief about children?',
    options: [
      'Children learn best with complete freedom',
      'Children need external motivation to learn',
      'Children naturally want to learn without force',
      'Children should delay academics until age 7'
    ],
    correctIndex: 2,
    explanation: 'Our foundational belief is that children are natural learners. We create environments that support learning rather than forcing it.',
    module: 'The PEP Belief System'
  },
  {
    id: 'final-3',
    question: 'What is PEP\'s "promise" to parents?',
    options: [
      'Your child will be at the top of their class',
      'Your child will get into a top college',
      'Your child will be happy AND successful',
      'Your child will never struggle or feel difficulty'
    ],
    correctIndex: 2,
    explanation: 'We reject the false choice between happiness and success. Joy and rigour are not opposites—children can have both.',
    module: 'The PEP Belief System'
  },

  // Module 3: The Science
  {
    id: 'final-4',
    question: 'Why does Montessori phonics often lead to early reading?',
    options: [
      'It pushes children to read before competitors',
      'It follows the child\'s readiness, not a forced timeline',
      'It uses more intensive drilling than other methods',
      'It starts instruction earlier than traditional schools'
    ],
    correctIndex: 1,
    explanation: 'Montessori phonics works because it responds to the child\'s sensitive period for language—when they\'re ready, learning is natural and joyful.',
    module: 'The Science'
  },
  {
    id: 'final-5',
    question: 'Self-Determination Theory says intrinsic motivation requires:',
    options: [
      'Rewards, recognition, and competition',
      'Autonomy, competence, and relatedness',
      'Structure, discipline, and accountability',
      'Freedom, creativity, and self-expression'
    ],
    correctIndex: 1,
    explanation: 'Deci & Ryan\'s research shows humans need autonomy, competence, and relatedness for intrinsic motivation to flourish.',
    module: 'The Science'
  },

  // Module 4: How the Program Works
  {
    id: 'final-6',
    question: 'Why are classrooms mixed-age (3-year spans)?',
    options: [
      'It\'s more cost-effective for the school',
      'Younger learn from older; older deepen learning by teaching',
      'It reduces the need for individual attention',
      'Maria Montessori required it strictly'
    ],
    correctIndex: 1,
    explanation: 'Mixed-age grouping has specific developmental benefits for all children—it\'s how learning naturally happens in families and communities.',
    module: 'How the Program Works'
  },
  {
    id: 'final-7',
    question: 'Parent: "Montessori seems unstructured." Best response?',
    options: [
      '"Yes, children have freedom to do whatever they want"',
      '"Structure is in the environment—freedom within limits"',
      '"We add structure for Indian children who need it"',
      '"Structure isn\'t important for young children"'
    ],
    correctIndex: 1,
    explanation: 'Montessori is highly structured—but structure is in the prepared environment, materials, and routines, not imposed moment-to-moment by adults.',
    module: 'How the Program Works'
  },

  // Module 5: Outcomes
  {
    id: 'final-8',
    question: 'Parent: "Will my child be at grade level?" Best response?',
    options: [
      '"Yes—our students meet or exceed standards"',
      '"Grade level is meaningless; we don\'t track it"',
      '"Some areas ahead, some may take time—we track individual progress"',
      '"It depends entirely on your child\'s abilities"'
    ],
    correctIndex: 2,
    explanation: 'Be honest that we don\'t use "grade level" while acknowledging their concern. We focus on individual progress, not arbitrary benchmarks.',
    module: 'Outcomes'
  },
  {
    id: 'final-9',
    question: 'Which can PEP actually promise parents?',
    options: [
      'Your child will excel in competitive exams',
      'Your child will read fluently by age 5',
      'Your child will love learning and be known deeply',
      'Your child will transition easily to any school'
    ],
    correctIndex: 2,
    explanation: 'We promise what\'s in our control: joyful environment, individual attention, love of learning. We cannot promise exam results or specific timelines.',
    module: 'Outcomes'
  },

  // Module 6: The Admissions Conversation
  {
    id: 'final-10',
    question: 'In admissions, where should you spend MORE time?',
    options: [
      'Explaining PEP\'s philosophy',
      'Asking questions and listening',
      'Showing the classroom',
      'Discussing logistics and fees'
    ],
    correctIndex: 1,
    explanation: 'Discovery (listening) should take more time than sharing. Understanding them makes your sharing more relevant and effective.',
    module: 'The Admissions Conversation'
  },
  {
    id: 'final-11',
    question: 'Parent nods along but asks no questions. You should:',
    options: [
      'Take agreement at face value—they\'re aligned',
      'Share more since they seem interested',
      'Probe: "What stands out? What concerns you?"',
      'Move toward next steps—they\'re ready'
    ],
    correctIndex: 2,
    explanation: 'Silence isn\'t agreement. Parents may nod politely while having reservations. Always probe for real reactions.',
    module: 'The Admissions Conversation'
  },

  // Module 7: Objection Handling
  {
    id: 'final-12',
    question: 'Parent: "What if my child refuses math?" First response?',
    options: [
      'Explain how engaging the math materials are',
      'Ask what makes them think their child might refuse',
      'Reassure them children balance themselves over time',
      'Describe how guides encourage avoided areas'
    ],
    correctIndex: 1,
    explanation: 'AEIO framework: after Acknowledge, you Explore. Understanding what\'s behind the question helps you respond effectively.',
    module: 'Objection Handling'
  },

  // Module 8: Qualification
  {
    id: 'final-13',
    question: 'Parent keeps asking "How will you ENSURE they learn?" This suggests:',
    options: [
      'They\'re thorough parents—a good sign',
      'They need more curriculum details',
      'Possible misalignment—belief that learning must be forced',
      'They\'re ready to enroll and want reassurance'
    ],
    correctIndex: 2,
    explanation: 'Language like "ensure" and "make sure" often reveals belief that learning requires force—potential fundamental misalignment.',
    module: 'Qualification'
  },
  {
    id: 'final-14',
    question: 'Family seems misaligned with PEP. Best approach?',
    options: [
      'Try harder to convince them',
      'Be direct and kind; explain the mismatch honestly',
      'Let them enroll—they\'ll come around',
      'Be vague; hope they don\'t apply'
    ],
    correctIndex: 1,
    explanation: 'A graceful, direct decline serves everyone. Don\'t waste their time—be honest about fit and suggest alternatives.',
    module: 'Qualification'
  },

  // Module 9: What You Must Never Say
  {
    id: 'final-15',
    question: 'Parent asks you to guarantee reading by age 6. You should:',
    options: [
      'Guarantee it—most children read by then anyway',
      'Say most read by preschool exit, with natural variation',
      'Refuse to discuss reading timelines at all',
      'Promise if they attend regularly'
    ],
    correctIndex: 1,
    explanation: 'Never guarantee developmental outcomes. Set realistic expectations while addressing their underlying concern.',
    module: 'What You Must Never Say'
  }
];

export const PASSING_SCORE = 12; // 80% = 12 out of 15
export const TOTAL_QUESTIONS = assessmentQuestions.length;
