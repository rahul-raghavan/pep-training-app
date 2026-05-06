export interface CourseLike {
  slug: string;
  title: string;
  created_at?: string;
}

export const TRACK_FLOW = [
  'toddler',
  'primary',
  'elementary',
  'middle',
  'hr',
  'admin',
] as const;

export function trackSortIndex(slug: string): number {
  const idx = TRACK_FLOW.indexOf(slug as (typeof TRACK_FLOW)[number]);
  return idx === -1 ? TRACK_FLOW.length : idx;
}

export function sortProgramTracks<T extends { slug: string; name: string }>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => {
    const byFlow = trackSortIndex(a.slug) - trackSortIndex(b.slug);
    if (byFlow !== 0) return byFlow;
    return a.name.localeCompare(b.name);
  });
}

export function courseGroupLabel(course: CourseLike): string {
  const slug = course.slug;
  const title = course.title.toLowerCase();

  if (slug === 'admissions-training') return 'Admissions';
  if (slug.includes('ptm')) return 'Parent Partnership';
  if (slug === 'storytelling-101') return 'Elementary Training';
  if (slug.startsWith('elem-')) return 'Elementary Training';
  if (slug.startsWith('ms-')) return 'Middle School Training';
  if (
    slug.startsWith('learning-science') ||
    slug === 'how-learning-works' ||
    slug === 'formative-assessment' ||
    slug === 'feedback-student-ownership' ||
    slug === 'designing-durable-learning' ||
    slug === 'leading-teacher-learning' ||
    title.startsWith('learning science')
  ) {
    return 'Learning Science';
  }
  if (slug.includes('test')) return 'Testing';
  return 'Other';
}

function courseGroupRank(course: CourseLike): number {
  switch (courseGroupLabel(course)) {
    case 'Admissions':
      return 10;
    case 'Parent Partnership':
      return 20;
    case 'Elementary Training':
      return 30;
    case 'Middle School Training':
      return 40;
    case 'Learning Science':
      return 50;
    case 'Testing':
      return 90;
    default:
      return 80;
  }
}

const learningScienceOrder: Record<string, number> = {
  'learning-science-101': 101,
  'how-learning-works': 201,
  'formative-assessment': 202,
  'feedback-student-ownership': 301,
  'designing-durable-learning': 401,
  'leading-teacher-learning': 402,
};

function courseFlowRank(course: CourseLike): number {
  const slug = course.slug;
  const numberMatch = slug.match(/(?:elem|ms)-(\d+)/);
  if (numberMatch) return Number(numberMatch[1]);
  if (slug === 'storytelling-101') return 105;
  if (slug === 'ms-philosophy-101') return 101;
  if (slug === 'ms-conduct') return 299;
  if (learningScienceOrder[slug]) return learningScienceOrder[slug];
  if (slug === 'admissions-training') return 10;
  if (slug.includes('ptm')) return 20;
  if (slug.includes('test')) return 999;
  return 500;
}

export function sortCourses<T extends CourseLike>(courses: T[]): T[] {
  return [...courses].sort((a, b) => {
    const byGroup = courseGroupRank(a) - courseGroupRank(b);
    if (byGroup !== 0) return byGroup;

    const byFlow = courseFlowRank(a) - courseFlowRank(b);
    if (byFlow !== 0) return byFlow;

    return a.title.localeCompare(b.title);
  });
}
