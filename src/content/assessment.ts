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
    question: 'What is the PRIMARY goal of an admissions conversation at PEP?',
    options: [
      'To convince parents that PEP is better than traditional schools',
      'To help families understand PEP so they can decide if it\'s right for them',
      'To fill available seats with committed families',
      'To assess whether parents can afford the fees'
    ],
    correctIndex: 1,
    explanation: 'Our goal is mutual fit, not persuasion. We help families make an informed decision—even if that decision is "PEP isn\'t right for us."',
    module: 'Welcome & Orientation'
  },

  // Module 2: Belief System
  {
    id: 'final-2',
    question: 'What is PEP\'s core belief about children and learning?',
    options: [
      'Children learn best when given complete freedom without any structure',
      'Children need external motivation (rewards/punishments) to learn effectively',
      'Children naturally want to learn and don\'t need to be forced',
      'Children should focus on academics only after age 7'
    ],
    correctIndex: 2,
    explanation: 'Our foundational belief is that children are natural learners. This shapes everything we do—we create environments that support learning rather than forcing it.',
    module: 'The PEP Belief System'
  },
  {
    id: 'final-3',
    question: 'What is PEP\'s "promise" to parents?',
    options: [
      'Your child will be at the top of their class',
      'Your child will get into a top college',
      'Your child will be happy AND successful—rigour with joy',
      'Your child will never experience stress or difficulty'
    ],
    correctIndex: 2,
    explanation: 'We reject the false choice between happiness and success. Our promise is that children can have both—joy and rigour are not opposites.',
    module: 'The PEP Belief System'
  },

  // Module 3: The Science
  {
    id: 'final-4',
    question: 'Research on early reading instruction (e.g., Finland starting at age 7) suggests that:',
    options: [
      'Starting earlier always produces better readers',
      'The age of starting doesn\'t matter at all',
      'Starting later with strong foundations can lead to equal or better outcomes',
      'Reading should not be taught formally at any age'
    ],
    correctIndex: 2,
    explanation: 'Finland delays formal reading instruction until age 7, yet Finnish students outperform many countries that start earlier. Early doesn\'t mean better—readiness and foundation matter more.',
    module: 'The Science'
  },
  {
    id: 'final-5',
    question: 'According to Self-Determination Theory, intrinsic motivation requires which three things?',
    options: [
      'Rewards, recognition, and competition',
      'Autonomy, competence, and relatedness',
      'Structure, discipline, and accountability',
      'Freedom, creativity, and self-expression'
    ],
    correctIndex: 1,
    explanation: 'Deci & Ryan\'s research shows humans need autonomy (control over actions), competence (feeling capable), and relatedness (connection to others) for intrinsic motivation to flourish.',
    module: 'The Science'
  },

  // Module 4: How the Program Works
  {
    id: 'final-6',
    question: 'Why does PEP use mixed-age classrooms (3-year spans)?',
    options: [
      'It\'s more cost-effective for the school',
      'Younger children learn from older ones, older children deepen understanding by teaching',
      'It reduces the need for individual attention',
      'Maria Montessori required it as a strict rule'
    ],
    correctIndex: 1,
    explanation: 'Mixed-age grouping has specific developmental benefits: younger children see what\'s possible, older children consolidate learning by teaching, and everyone develops socially through natural interaction.',
    module: 'How the Program Works'
  },
  {
    id: 'final-7',
    question: 'A parent says: "Montessori seems very unstructured." The accurate response is:',
    options: [
      'Yes, children have complete freedom to do whatever they want',
      'The structure is in the environment and materials, not imposed by adults—it\'s "freedom within limits"',
      'We add more structure than traditional Montessori because Indian children need it',
      'Structure isn\'t important for young children'
    ],
    correctIndex: 1,
    explanation: 'Montessori is highly structured—but the structure is embedded in the prepared environment, the materials, and consistent routines. "Freedom within limits" is the key concept.',
    module: 'How the Program Works'
  },

  // Module 5: Outcomes
  {
    id: 'final-8',
    question: 'When a parent asks "Will my child be at grade level?", the best response is:',
    options: [
      'Yes, absolutely—our students meet or exceed grade level standards',
      'Grade level is meaningless, so we don\'t track it at all',
      'We don\'t use grade level as a measure because it ignores individual development. Your child will progress appropriately for them.',
      'It depends on how smart your child is'
    ],
    correctIndex: 2,
    explanation: 'We\'re honest that we don\'t use "grade level" while acknowledging the parent\'s underlying concern (is my child learning?). We focus on individual progress, not arbitrary benchmarks.',
    module: 'Outcomes'
  },
  {
    id: 'final-9',
    question: 'Which of these is something PEP CAN promise to parents?',
    options: [
      'Your child will get into IIT/IIM',
      'Your child will be reading by age 5',
      'Your child will love coming to school and develop a love of learning',
      'Your child will score above 90% in board exams'
    ],
    correctIndex: 2,
    explanation: 'We can promise things within our control: a joyful environment, children who are known deeply, and a love of learning. We cannot promise external outcomes like specific test scores or college admissions.',
    module: 'Outcomes'
  },

  // Module 6: The Admissions Conversation
  {
    id: 'final-10',
    question: 'In an admissions conversation, you should spend MORE time:',
    options: [
      'Explaining PEP\'s philosophy and methodology',
      'Asking questions and listening to understand the family',
      'Showing the classroom and materials',
      'Discussing fees and logistics'
    ],
    correctIndex: 1,
    explanation: 'Discovery (listening) should take more time than sharing (telling). The more you understand about the family, the more relevant and effective your sharing will be.',
    module: 'The Admissions Conversation'
  },
  {
    id: 'final-11',
    question: 'A parent nods along to everything but asks no questions. You should:',
    options: [
      'Take their agreement at face value and move toward enrollment',
      'Share more information since they seem interested',
      'Gently probe: "What stands out to you? What concerns you?"',
      'End the conversation since they\'re clearly not engaged'
    ],
    correctIndex: 2,
    explanation: 'Silence isn\'t agreement. Parents may nod to be polite while having reservations. Always probe for real reactions before assuming alignment.',
    module: 'The Admissions Conversation'
  },

  // Module 7: Objection Handling
  {
    id: 'final-12',
    question: 'A parent asks: "What if my child refuses to do math?" Your FIRST response should be to:',
    options: [
      'Explain how the math materials are engaging and self-correcting',
      'Ask what makes them think their child might refuse math',
      'Reassure them that children naturally balance themselves over time',
      'Describe how guides encourage children toward avoided areas'
    ],
    correctIndex: 1,
    explanation: 'Following the AEIO framework: after Acknowledging, you Explore. Understanding what\'s behind the question helps you tailor your response effectively.',
    module: 'Objection Handling'
  },

  // Module 8: Qualification
  {
    id: 'final-13',
    question: 'A parent repeatedly asks "How will you ENSURE my child keeps up? How will you MAKE SURE they learn?" This language suggests:',
    options: [
      'They\'re thorough parents who want details—a good sign',
      'They need more information about the curriculum',
      'Possible fundamental misalignment—they may believe children must be forced to learn',
      'They\'re ready to enroll and want reassurance'
    ],
    correctIndex: 2,
    explanation: 'The language of "ensure" and "make sure" often reveals a belief that learning must be forced. This may indicate fundamental misalignment with PEP\'s philosophy.',
    module: 'Qualification'
  },
  {
    id: 'final-14',
    question: 'A family seems misaligned with PEP\'s philosophy. The best approach is to:',
    options: [
      'Try harder to convince them of our approach',
      'Be direct but kind, explain why PEP may not meet their needs, suggest alternatives',
      'Let them enroll and hope they\'ll come around',
      'Be vague and hope they decide not to apply'
    ],
    correctIndex: 1,
    explanation: 'A graceful, direct decline is a service to everyone. Don\'t waste their time, don\'t judge them—be honest about fit and help them find what they\'re looking for.',
    module: 'Qualification'
  },

  // Module 9: What You Must Never Say
  {
    id: 'final-15',
    question: 'A parent asks you to guarantee their child will be reading by age 6. You should:',
    options: [
      'Guarantee it—most of our children read by then anyway',
      'Say "We can\'t make guarantees, but most children read by 7-8. Development varies and we focus on strong foundations."',
      'Refuse to discuss reading timelines at all',
      'Promise they\'ll read by 6 if they attend regularly'
    ],
    correctIndex: 1,
    explanation: 'Never guarantee specific developmental outcomes. Set realistic expectations honestly while addressing their underlying concern about reading development.',
    module: 'What You Must Never Say'
  }
];

export const PASSING_SCORE = 12; // 80% = 12 out of 15
export const TOTAL_QUESTIONS = assessmentQuestions.length;
