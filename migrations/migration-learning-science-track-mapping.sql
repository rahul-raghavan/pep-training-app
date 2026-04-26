-- ============================================================================
-- Migration: map Learning Science courses to Elementary and Middle School
-- ============================================================================

WITH target_tracks AS (
  SELECT id
  FROM program_tracks
  WHERE slug IN ('elementary', 'middle')
),
learning_science_courses AS (
  SELECT id
  FROM programs
  WHERE slug IN (
    'learning-science-101',
    'how-learning-works',
    'formative-assessment',
    'feedback-student-ownership',
    'designing-durable-learning',
    'leading-teacher-learning'
  )
)
INSERT INTO course_programs (program_id, track_id)
SELECT learning_science_courses.id, target_tracks.id
FROM learning_science_courses
CROSS JOIN target_tracks
ON CONFLICT DO NOTHING;
