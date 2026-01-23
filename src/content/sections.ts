import { Section } from './types';

export const sections: Section[] = [
  {
    id: 'welcome',
    title: 'Welcome & Orientation',
    estimatedMinutes: 30,
    content: [
      {
        type: 'text',
        content: `# Welcome to PEP Admissions Training

You're about to learn how to have meaningful conversations with families considering PEP for their children. This isn't about memorizing a sales pitch—it's about understanding our beliefs so deeply that you can communicate them naturally and authentically.`
      },
      {
        type: 'callout',
        variant: 'info',
        content: `**How to use this training:** Work through each section at your own pace. You'll encounter knowledge checks (to verify understanding) and voice exercises (to practice speaking). Take the voice exercises seriously—they're the closest thing to a real conversation.`
      },
      {
        type: 'text',
        content: `## Why Admissions Matters

At PEP, admissions isn't about filling seats. It's about finding the right families—families who share our beliefs and will partner with us in their child's education.

**Great admissions means:**
- Families who understand and embrace our approach
- Children whose parents support what we do at home
- A community of aligned families who reinforce each other
- Fewer mismatched expectations and conflicts later

**Poor admissions costs us:**
- Wrong-fit families who struggle and eventually leave
- Time spent managing conflicts instead of educating children
- Broken commitments that affect everyone
- Reputation damage when families leave unhappy`
      },
      {
        type: 'text',
        content: `## What Great Admissions Looks Like

A great admissions conversation isn't a presentation—it's a dialogue. You're not trying to convince anyone. You're trying to help families understand what PEP is, so they can decide if it's right for them.

**You're doing it right when:**
- You spend more time listening than talking
- Parents feel genuinely understood
- You can articulate their specific hopes and concerns
- They leave with a clear picture of what PEP is (and isn't)
- The conversation feels like a conversation, not a pitch

**You're doing it wrong when:**
- You're doing all the talking
- You're overselling or making promises we can't keep
- You're trying to overcome objections through persuasion
- Parents leave confused about what makes us different
- You haven't learned anything about their child`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**Remember:** Our goal is not to enroll every family who walks through the door. Our goal is to enroll the *right* families. A family that's wrong for PEP will be unhappy, and their unhappiness affects everyone—their child, other children, teachers, and other parents.`
      },
      {
        type: 'text',
        content: `## The Training Path

This training covers:

1. **Welcome & Orientation** (this section) — What great admissions looks like
2. **The PEP Belief System** — Our core beliefs that shape everything
3. **The Science** — Why our approach works (developmental research)
4. **How the Program Works** — Daily life, methods, materials
5. **Outcomes** — What we deliver and how to talk about it
6. **The Admissions Conversation** — Flow, structure, key messages
7. **Objection Handling** — Common questions and how to respond
8. **Qualification** — Identifying good-fit and wrong-fit families
9. **What You Must Never Say** — Hard rules and escalation paths

After completing this self-study, you'll shadow live conversations and eventually be certified to conduct them independently.`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'welcome-mc-1',
        question: 'What is the primary goal of an admissions conversation at PEP?',
        options: [
          'To help families understand PEP so they can decide if it\'s right for them',
          'To address all of the parent\'s concerns and objections effectively',
          'To build rapport and leave a positive impression of the school',
          'To identify families who can afford our fees and commit long-term'
        ],
        correctIndex: 0,
        explanation: 'Our goal is mutual fit, not persuasion. Addressing concerns, building rapport, and assessing commitment are all part of the process—but the primary goal is helping families make an informed decision, even if that decision is "PEP isn\'t right for us."'
      },
      {
        type: 'multiple_choice',
        id: 'welcome-mc-2',
        question: 'A parent leaves an admissions conversation feeling very positive about PEP. Is this a sign of a successful conversation?',
        options: [
          'Yes—a positive impression means they\'re likely to enroll',
          'Only if they also have a clear and accurate picture of what PEP is and isn\'t',
          'Only if they asked lots of questions during the conversation',
          'No—the goal is to be neutral, not to create positive feelings'
        ],
        correctIndex: 1,
        explanation: 'A positive impression alone isn\'t enough. A parent could leave feeling great but have misconceptions about what we do. Success is when they leave with both a positive feeling AND an accurate understanding—including what we don\'t do and who we\'re not right for.'
      }
    ]
  },
  {
    id: 'belief-system',
    title: 'The PEP Belief System',
    estimatedMinutes: 45,
    content: [
      {
        type: 'text',
        content: `# The PEP Belief System

Everything at PEP flows from a single core belief. If you understand this belief deeply, you can answer almost any question a parent asks. If you don't, you'll be reciting facts without understanding why they matter.`
      },
      {
        type: 'text',
        content: `## The Founding Story

PEP was founded by Rahul and Chetan—both IIT and IIM graduates who went through traditional schooling, succeeded by its measures, and saw what it cost.

They weren't dropouts rejecting a system that failed them. They were toppers who won the game and realized the game itself was broken.

After years in traditional careers, they trained as Montessori teachers—not administrators, not investors, but teachers. They spent 10+ years in classrooms, learning the craft.

Today, PEP has 400+ students across four campuses. But the mission hasn't changed: **help each child discover and accomplish their unique potential.**`
      },
      {
        type: 'callout',
        variant: 'tip',
        content: `**Why this matters:** Many "alternative schools" are founded by people who struggled in traditional education. Our founders succeeded—and still rejected it. This gives us credibility with high-achieving parents who want something different.`
      },
      {
        type: 'text',
        content: `## The Core Belief

Here is the belief that changes everything:

> **Children want to learn. They don't need to be forced.**

Think about it. Watch any baby, any toddler. They learn language—the most complex skill humans ever acquire—without curricula, tests, or teachers. They learn social norms, physics (how objects fall), cause and effect. No one forces them. They can't help but learn.

**This is not wishful thinking. This is how humans are built.**

Traditional education operates on the opposite belief: that children *don't* want to learn, so they must be made to learn. Coerced. Persuaded. Tested. Ranked. Punished and rewarded.

This belief poisons everything. It turns learning—which should be joyful—into something to be endured. It creates anxiety, kills curiosity, and produces students who can pass tests but hate studying.

**We start with the opposite belief. And when you truly believe children want to learn, everything about school looks different.**`
      },
      {
        type: 'quote',
        content: 'We are not here to teach. We are here to guide. Our job is to create an environment where children can do what they naturally want to do—learn.',
        attribution: 'PEP founding principle'
      },
      {
        type: 'text',
        content: `## What PEP Stands For

PEP stands for **Personalized Education Path**.

This isn't a clever name—it's a description of what we do:

- **Personalized:** Each child is different. Their education should be too.
- **Education:** Real learning, not just activity. We care about outcomes.
- **Path:** A journey with a destination. We know where we're going.

Every child gets their own path. Not one of 40 in a class moving at the same pace. Not a fixed curriculum applied regardless of readiness. A path designed for this child, at this moment, based on where they are.`
      },
      {
        type: 'text',
        content: `## The Enemy

Every strong belief has an enemy. Ours is:

> **Traditional schooling's central lie: that learning requires suffering.**

This shows up everywhere:
- "No pain, no gain"
- "You have to struggle now to succeed later"
- "Childhood is preparation for life, not life itself"
- "If they're having fun, they're not really learning"

Parents are told they must choose: either their child is happy (but academically weak), or their child is successful (but stressed and anxious).

**This is a false choice.** It's only true if you believe children must be forced to learn. Once you accept that children *want* to learn, you realize that happiness and achievement aren't in conflict—they reinforce each other.

A happy child learns better. A child who loves learning achieves more. Joy and rigour are not opposites.`
      },
      {
        type: 'text',
        content: `## The Promise

Our promise to parents:

> **Rigour with joy. Excellence without suffering. Your child will be happy AND successful.**

Not one or the other. Both. That's what PEP delivers.

We don't achieve this through wishful thinking. We achieve it through system design:
- Small groups matched to level (never bored, never lost)
- Individual attention (each child known deeply)
- Appropriate challenge (hard enough to grow, not so hard it breaks them)
- Science-forward methods (we use what works)

The result: children who love learning AND excel academically. Children who are happy today AND building real capability for tomorrow.`
      },
      {
        type: 'callout',
        variant: 'info',
        content: `**The single takeaway:** After any conversation with a PEP family, they should believe: "My child will be happy AND successful here." Not one or the other. Both. That's the promise.`
      },
      {
        type: 'text',
        content: `## How to Communicate These Beliefs

When talking to parents, don't recite these beliefs as facts. Invite them into the belief:

**Don't say:** "We believe children want to learn."

**Do say:** "Think about your own child when they were a toddler. Did anyone force them to learn to walk? To talk? They couldn't help themselves—they wanted to learn. We believe that drive never goes away. It just gets crushed by the wrong environment."

The goal is for parents to *discover* the belief through their own experience, not to accept it because you told them.`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'belief-mc-1',
        question: 'PEP believes "children naturally want to learn." How is this different from saying "children should learn whatever they want"?',
        options: [
          'It\'s not different—both mean following the child\'s interests completely',
          'PEP provides structure and expectations, but doesn\'t use force or coercion as motivation',
          'PEP only allows choice in non-academic areas like art and play',
          'The difference is mainly in how we talk to parents, not in practice'
        ],
        correctIndex: 1,
        explanation: 'Our belief that children want to learn doesn\'t mean "no structure." It means we don\'t need threats, rewards, or pressure as primary motivators. We still have clear expectations and a structured environment—we just trust that children will engage when the environment is right.'
      },
      {
        type: 'multiple_choice',
        id: 'belief-mc-2',
        question: 'Why is it significant that PEP\'s founders succeeded in traditional education before rejecting it?',
        options: [
          'It proves they\'re smart enough to run a school',
          'It shows they understand both systems and chose this one deliberately',
          'It helps justify our higher fees to parents',
          'It\'s mainly useful for marketing to IIT/IIM parents'
        ],
        correctIndex: 1,
        explanation: 'Many alternative schools are founded by people who struggled in traditional education. Our founders won that game—IIT, IIM, successful careers—and still rejected it. This gives credibility: they\'re not making excuses for failure, they\'re making a deliberate choice based on seeing both sides.'
      },
      {
        type: 'multiple_choice',
        id: 'belief-mc-3',
        question: 'What is the "enemy" in PEP\'s positioning?',
        options: [
          'Traditional schools like DPS and NPS that compete with us',
          'The belief that children must suffer to succeed—that joy and rigour are opposites',
          'Parents who prioritize grades and test scores over holistic development',
          'The government\'s rigid curriculum requirements'
        ],
        correctIndex: 1,
        explanation: 'Our enemy is a belief, not a competitor or a group of people. The lie that "learning requires suffering" is what we fight. This framing lets us be against an idea without attacking other schools or parents directly.'
      },
      {
        type: 'voice',
        id: 'belief-voice-1',
        scenario: 'A parent asks: "Can you tell me the story of how PEP started? Why was it founded?"',
        guidance: `A good response should include:
- Founders' background (IIT/IIM, succeeded in traditional system)
- Key insight (they won the game but saw the game was broken)
- Training as Montessori teachers (not just administrators)
- Years of experience (10+ years, 400+ students)
- The mission (help each child discover their unique potential)

Keep it conversational, not a recitation of facts.`,
        aiPrompt: `Evaluate if the trainee covered the key elements of PEP's founding story:
1. Founders' credentials (IIT/IIM background)
2. The insight that despite succeeding, they rejected traditional education
3. That they trained as actual teachers
4. Experience (10+ years, 400+ students, 4 campuses)
5. The mission

Also evaluate tone: is it conversational and engaging, or does it sound like reading from a script?`
      },
      {
        type: 'voice',
        id: 'belief-voice-2',
        scenario: 'A parent says: "Every school claims to be different. What actually makes PEP different from, say, DPS or NPS?"',
        guidance: `A good response should:
- Start with the core belief (children want to learn)
- Contrast with traditional education's belief (children must be forced)
- Explain what this looks like in practice (not classes of 40, individual attention)
- Touch on the promise (rigour with joy, not a choice between happy and successful)

Don't bash competitors directly. Focus on what we believe and how it shapes what we do.`,
        aiPrompt: `Evaluate if the trainee:
1. Articulated PEP's core belief clearly
2. Contrasted it with traditional education's approach
3. Gave concrete examples of how the belief shows up in practice
4. Mentioned the promise (happiness AND success, not either/or)
5. Avoided directly attacking competitors by name

Also check: did they sound confident and clear, or uncertain and rambling?`
      },
      {
        type: 'voice',
        id: 'belief-voice-3',
        scenario: 'A parent says: "I went to a traditional school and I turned out fine. Why should I do something different for my child?"',
        guidance: `This is a common response from high-achieving parents. A good answer:
- Acknowledge their success (don't dismiss their experience)
- Gently surface the costs they may have experienced (stress, anxiety, lost love of learning)
- Point out that "turning out fine" and "thriving" are different
- Our founders had the same background—they succeeded AND saw the cost

Key: don't argue. Invite reflection.`,
        aiPrompt: `Evaluate if the trainee:
1. Acknowledged the parent's success respectfully
2. Gently raised the potential costs of traditional education (not accusatory)
3. Distinguished between "surviving" and "thriving"
4. Connected to founders' story (they succeeded too, and still chose differently)
5. Maintained a curious, inviting tone (not defensive or preachy)

This is a delicate question—tone matters enormously.`
      }
    ]
  },
  {
    id: 'the-science',
    title: 'The Science',
    estimatedMinutes: 40,
    content: [
      {
        type: 'text',
        content: `# The Science Behind PEP

Our approach isn't based on philosophy alone. It's grounded in decades of developmental research. When parents ask "why do you do it this way?", you should be able to point to evidence—not just beliefs.`
      },
      {
        type: 'callout',
        variant: 'info',
        content: `**Why this matters:** Many parents are skeptical of "alternative" education because it sounds like wishful thinking. Showing them the science builds credibility and helps them trust the process.`
      },
      {
        type: 'text',
        content: `## How Children Actually Learn

**1. The Brain's Natural Learning System**

Children are born with an incredibly powerful learning system. A baby's brain forms over 1 million new neural connections per second in the first few years. This isn't random—it's driven by curiosity, exploration, and interaction with the environment.

Traditional schooling often works *against* this natural system by:
- Forcing learning before the brain is ready (developmentally inappropriate expectations)
- Replacing intrinsic motivation with external rewards/punishments
- Fragmenting knowledge into disconnected subjects
- Prioritizing memorization over understanding

**2. Sensitive Periods**

Maria Montessori identified what she called "sensitive periods"—windows of time when children are naturally drawn to particular types of learning. During these periods, learning is effortless and joyful.

Examples:
- **Language (0-6 years):** Children absorb language without formal instruction
- **Order (1-3 years):** Children crave routine and organization
- **Small objects (1-4 years):** Fascination with tiny things develops fine motor skills
- **Social development (2.5-5 years):** Learning to work with others

**When we force learning outside these windows, it requires enormous effort. When we support learning during these windows, it happens naturally.**`
      },
      {
        type: 'text',
        content: `## The Research on Intrinsic Motivation

Decades of psychology research (Deci & Ryan's Self-Determination Theory) shows that humans have three core psychological needs:

1. **Autonomy** — The need to feel in control of our own actions
2. **Competence** — The need to feel capable and effective
3. **Relatedness** — The need to feel connected to others

When these needs are met, intrinsic motivation flourishes. When they're thwarted (through coercion, comparison, or isolation), motivation dies.

**Traditional schooling thwarts all three:**
- No autonomy: "Do this because I said so"
- Competence threatened: Rankings, comparisons, public failure
- Relatedness undermined: Competition instead of collaboration

**PEP supports all three:**
- Autonomy: Choice within structure, ownership of learning
- Competence: Appropriate challenge, mastery-based progression
- Relatedness: Mixed-age groups, collaborative environment`
      },
      {
        type: 'quote',
        content: 'The more we try to control children through rewards and punishments, the more we undermine the intrinsic motivation that drives real learning.',
        attribution: 'Alfie Kohn, Punished by Rewards'
      },
      {
        type: 'text',
        content: `## The Problem with Early Academics

Research consistently shows that pushing academics too early backfires:

**The Finland Example:**
Finnish children don't start formal reading instruction until age 7. By age 15, they outperform students from countries that start at age 4-5. Early instruction doesn't help—it may actually harm.

**The Play Research:**
Children who spend more time in play-based learning in early years show better academic outcomes, better social skills, and less anxiety than children in academic-focused preschools. The advantage grows over time.

**Why does early pressure backfire?**
- Creates anxiety and negative associations with learning
- Teaches children that learning is something done *to* them, not *by* them
- Misses the window for developing executive function through play
- Replaces broad development with narrow skill drilling`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**Key point for parents:** "Early" doesn't mean "better." A child who learns to read at 7 after years of rich language exposure will likely become a better reader than a child drilled on phonics at 4. Development can't be rushed—only supported or damaged.`
      },
      {
        type: 'text',
        content: `## The Montessori Evidence

The Montessori method has over 100 years of practice and substantial research support:

**Key Studies:**
- **Lillard & Else-Quest (2006):** Montessori children outperformed peers in reading, math, and social problem-solving
- **Lillard (2012):** Classic Montessori implementation linked to better executive function, reading, math, and social understanding
- **Longitudinal studies:** Montessori students show sustained advantages through high school and beyond

**Why Montessori works:**
- Multi-age classrooms (learning from and teaching peers)
- Self-paced progression (no artificial timelines)
- Hands-on materials (concrete before abstract)
- Intrinsic motivation (choice within structure)
- Uninterrupted work periods (deep focus, not fragmented attention)`
      },
      {
        type: 'text',
        content: `## Talking to Parents About the Science

**When a parent asks: "Where's the proof this works?"**

Don't get defensive. Welcome the question:

"That's exactly the right question to ask. Let me share what the research shows..."

Then choose 1-2 key points relevant to their concern:
- If worried about reading: The Finland example
- If worried about motivation: The intrinsic motivation research
- If worried about outcomes: The Montessori studies

**End with:** "But the real proof is in our students. I'd encourage you to meet some of our older children and see for yourself."`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'science-mc-1',
        question: 'A parent says: "My neighbor\'s child started reading at 4. Shouldn\'t we start early to give kids an advantage?" Based on the research, the best response is:',
        options: [
          '"Every child is different—some are ready earlier than others"',
          '"Early reading instruction doesn\'t predict long-term reading ability, and can create negative associations with learning"',
          '"We focus on the whole child, not just academics"',
          '"Reading isn\'t the most important skill at that age"'
        ],
        correctIndex: 1,
        explanation: 'The research-backed answer addresses their assumption directly: early doesn\'t mean better. Finland shows that later formal instruction can lead to better outcomes. The other answers deflect rather than educate.'
      },
      {
        type: 'multiple_choice',
        id: 'science-mc-2',
        question: 'Self-Determination Theory identifies three core psychological needs. Which of these is NOT one of them?',
        options: [
          'Autonomy — feeling in control of your own actions',
          'Competence — feeling capable and effective',
          'Achievement — feeling successful compared to others',
          'Relatedness — feeling connected to others'
        ],
        correctIndex: 2,
        explanation: 'Achievement (especially comparative achievement) is NOT a core need—and in fact, comparison-based achievement systems undermine intrinsic motivation. The three needs are Autonomy, Competence, and Relatedness.'
      },
      {
        type: 'voice',
        id: 'science-voice-1',
        scenario: 'A parent says: "This all sounds nice, but is there actual research behind it? How do I know this isn\'t just an experiment on my child?"',
        guidance: `A good response should:
- Welcome the question (don't be defensive)
- Reference specific research (Montessori studies, Finland example, motivation research)
- Keep it accessible (don't lecture)
- Offer to share more if they're interested
- Mention that they can see the proof in current students

Be confident but not arrogant. Parents asking for evidence are often your best prospects—they're rigorous thinkers.`,
        aiPrompt: `Evaluate if the trainee:
1. Welcomed the question without defensiveness
2. Referenced at least one specific piece of research or evidence
3. Explained it in accessible terms (not jargon-heavy)
4. Showed confidence in the approach
5. Offered concrete ways to verify (meet students, see outcomes)

Also evaluate: Did they sound like they believe what they're saying, or were they reciting facts?`
      }
    ]
  },
  {
    id: 'how-program-works',
    title: 'How the Program Works',
    estimatedMinutes: 45,
    content: [
      {
        type: 'text',
        content: `# How the Program Works

Parents need to understand what their child's day actually looks like. Abstract philosophy is important, but they also want to know: What will my child *do* here?`
      },
      {
        type: 'text',
        content: `## The Daily Structure

A typical day at PEP is structured but not rigid:

**Morning Circle (15-20 min)**
- Community gathering
- Songs, discussions, calendar
- Setting intentions for the day

**Work Period 1 (2-2.5 hours)**
- Children choose from prepared activities
- Teachers observe and guide
- Deep, uninterrupted focus time

**Snack & Outdoor Time (45 min)**
- Healthy snack (brought from home or provided)
- Free play outdoors
- Gross motor development

**Work Period 2 (1.5-2 hours)**
- Continued self-directed work
- Small group lessons
- One-on-one time with teachers

**Lunch & Rest**
- Community meal
- Younger children: rest time
- Older children: quiet activities

**Afternoon Activities**
- Story time
- Group projects
- Specialist activities (music, art, movement)

**Closing Circle**
- Reflection on the day
- Sharing work
- Transition to home`
      },
      {
        type: 'callout',
        variant: 'info',
        content: `**Key insight for parents:** The long, uninterrupted work periods are essential. This is when deep learning happens. It's the opposite of traditional schools where every 40 minutes a bell rings and children switch contexts.`
      },
      {
        type: 'text',
        content: `## The Prepared Environment

The classroom isn't random. Every element is intentional:

**Materials are:**
- Self-correcting (child knows if they got it right without adult judgment)
- Concrete to abstract (manipulatives before worksheets)
- Beautiful and inviting (children treat them with respect)
- Limited in quantity (one of each, creating natural turn-taking)

**The space is:**
- Child-sized (furniture, shelves, tools)
- Organized and orderly (everything has a place)
- Calm and uncluttered (not overstimulating)
- Accessible (children can get what they need independently)

**Why this matters:**
When children can act independently in their environment, they develop confidence, responsibility, and self-regulation. They don't need to ask permission for everything.`
      },
      {
        type: 'text',
        content: `## Mixed-Age Classrooms

Children are grouped in 3-year age bands (3-6, 6-9, 9-12) rather than single-age grades. This is intentional:

**Benefits for younger children:**
- See what's possible (modeling by older children)
- Aspire to more challenging work
- Receive help from peers, not just adults

**Benefits for older children:**
- Teaching deepens understanding
- Develop leadership and responsibility
- Practice patience and communication

**Benefits for all:**
- No artificial "grade level" pressure
- Natural social learning
- Reduced competition, increased collaboration

**How to explain to parents:**
"Think about how children learn in families—from siblings, from watching older kids in the neighborhood. That's natural. Same-age grouping is actually the artificial construct."`
      },
      {
        type: 'text',
        content: `## The Role of the Teacher

At PEP, teachers are called "guides" because that's what they do:

**What guides DO:**
- Observe each child carefully
- Prepare the environment
- Give individual and small-group lessons
- Connect children with materials they're ready for
- Model behavior and language
- Document progress

**What guides DON'T DO:**
- Lecture to the whole class
- Give grades or marks
- Compare children to each other
- Force children to work on specific things
- Interrupt deep concentration

**The guide's job is to know each child so well that they can offer exactly the right challenge at exactly the right moment.**`
      },
      {
        type: 'callout',
        variant: 'tip',
        content: `**Parent concern:** "If children choose their own work, won't they just play all day?"

**Your response:** "A prepared environment means all the choices are good choices. And our guides know each child well enough to notice if someone is avoiding an area—and to find ways to spark interest. Choice doesn't mean no guidance."`
      },
      {
        type: 'text',
        content: `## Curriculum Areas

While children have choice, the environment covers all essential areas:

**Practical Life**
- Pouring, cutting, folding, buttoning
- Cooking, cleaning, caring for the environment
- Builds concentration, coordination, independence

**Sensorial**
- Exploring with all senses
- Discrimination, matching, grading
- Foundation for later abstract concepts

**Language**
- Spoken language, vocabulary
- Writing before reading (hand prepares the mind)
- Grammar through materials, then abstraction

**Mathematics**
- Concrete materials (golden beads, stamp game)
- Understanding quantity before symbols
- Operations through manipulation, then abstraction

**Cultural Studies**
- Geography, history, biology, science
- Art, music, movement
- Global awareness and curiosity`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'program-mc-1',
        question: 'A parent asks: "What if my child only chooses art and never does math?" The best response is:',
        options: [
          '"We require children to do some math every day"',
          '"Art is just as valuable as math for development"',
          '"Our guides know each child well and find ways to spark interest in avoided areas—choice doesn\'t mean no guidance"',
          '"Children naturally balance themselves over time"'
        ],
        correctIndex: 2,
        explanation: 'This response addresses the real concern (will my child learn math?) while explaining how choice works within a guided system. The other answers either contradict our philosophy or don\'t address the concern.'
      },
      {
        type: 'multiple_choice',
        id: 'program-mc-2',
        question: 'Why are PEP classrooms mixed-age (3-year spans) rather than single-age?',
        options: [
          'It\'s more cost-effective for the school',
          'Younger children learn from older ones, older children deepen understanding by teaching, and everyone develops socially',
          'It reduces competition for grades',
          'Maria Montessori required it in her method'
        ],
        correctIndex: 1,
        explanation: 'Mixed-age grouping has specific developmental benefits for both younger and older children. It\'s not about cost or tradition—it\'s about how children actually learn best.'
      },
      {
        type: 'voice',
        id: 'program-voice-1',
        scenario: 'A parent asks: "Can you walk me through what a typical day looks like for a 5-year-old at PEP?"',
        guidance: `Describe the flow of the day:
- Morning circle
- Long work periods (emphasize "uninterrupted")
- Snack and outdoor play
- Lunch and rest
- Afternoon activities
- Closing circle

Make it vivid—help them picture their child there. Mention specifics like "choosing their own work from the shelves" and "working on a rug on the floor."`,
        aiPrompt: `Evaluate if the trainee:
1. Gave a clear sense of the day's structure
2. Mentioned key elements (work periods, outdoor time, community gatherings)
3. Emphasized child choice and independence
4. Made it vivid and concrete (not abstract)
5. Sounded warm and inviting

Did the parent get a real picture of what their child's day would look like?`
      },
      {
        type: 'voice',
        id: 'program-voice-2',
        scenario: 'A parent says: "I\'ve heard Montessori is very unstructured. My child needs structure. Is PEP right for us?"',
        guidance: `This is a common misconception. Clarify:
- Montessori is highly structured—but the structure is in the environment, not imposed by adults
- The prepared environment, the materials, the routines—all are carefully designed
- Children thrive because the structure is consistent and predictable
- "Freedom within limits" is the key phrase

Don't be defensive. Acknowledge their need for structure is valid, then show how PEP provides it.`,
        aiPrompt: `Evaluate if the trainee:
1. Acknowledged the parent's concern as valid
2. Corrected the misconception (Montessori IS structured)
3. Explained where the structure comes from (environment, materials, routines)
4. Used the concept of "freedom within limits"
5. Reassured without being dismissive

This is about reframing, not arguing. Did they do that effectively?`
      }
    ]
  },
  {
    id: 'outcomes',
    title: 'Outcomes',
    estimatedMinutes: 35,
    content: [
      {
        type: 'text',
        content: `# Outcomes: What PEP Delivers

Parents care about philosophy, but they also care about results. This section covers what PEP students actually achieve—and how to talk about it honestly.`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**Critical principle:** Never oversell. Never promise specific outcomes. Always be honest about what we can and can't guarantee. Broken promises create angry families.`
      },
      {
        type: 'text',
        content: `## What We Can Promise

**1. Your child will love coming to school.**
Not just "not hate it"—actually love it. They'll be excited to come, sad on holidays, eager to share what they did.

**2. Your child will develop a love of learning.**
Curiosity won't be killed. They'll remain interested in the world, ask questions, explore deeply.

**3. Your child will be known.**
Not one of 40 faces. Teachers will know your child's interests, struggles, personality. You'll get real observations, not generic report cards.

**4. Your child will develop at their own pace.**
No artificial pressure to hit milestones before they're ready. But also no holding back when they're ready to soar.

**5. Your child will build character.**
Independence, responsibility, empathy, resilience—not through lectures but through daily practice.`
      },
      {
        type: 'text',
        content: `## What We Cannot Promise

**"Will my child be at grade level?"**

Honest answer: We don't use "grade level" as a measure because it's an arbitrary standard that ignores individual development. Some children will be "ahead" in some areas, "behind" in others. What we can promise is that each child will be progressing appropriately for *them*.

**"Will my child get into a top college?"**

Honest answer: We can't promise college admissions any more than any school can. What we can say is that PEP students develop the qualities that matter for long-term success: curiosity, self-direction, resilience, and deep knowledge in areas they care about.

**"Will my child pass board exams?"**

Honest answer: If your child stays through our high school program, they will be prepared for board exams. But board preparation isn't our primary focus—developing capable, curious humans is. If board results are your primary concern, we may not be the right fit.`
      },
      {
        type: 'text',
        content: `## Academic Outcomes

**Reading & Writing:**
- Children typically read fluently by age 7-8 (some earlier, some later)
- Writing develops naturally through the materials
- By age 9-10, most children are voracious readers

**Mathematics:**
- Strong conceptual understanding (not just procedures)
- Children can explain *why* math works, not just *how*
- May look "behind" on paper tests but have deeper understanding

**General Knowledge:**
- Broad exposure through cultural curriculum
- Deep dives into areas of interest
- Strong research and learning-how-to-learn skills`
      },
      {
        type: 'text',
        content: `## Non-Academic Outcomes

These matter as much as academics—arguably more:

**Independence:**
- Children who can manage themselves
- Don't need constant adult direction
- Take responsibility for their belongings, their work, their mistakes

**Social Skills:**
- Collaboration, not competition
- Conflict resolution through words
- Empathy developed through mixed-age interaction

**Executive Function:**
- Focus and concentration
- Planning and organization
- Self-regulation

**Character:**
- Integrity (doing right when no one's watching)
- Resilience (bouncing back from difficulty)
- Curiosity (remaining interested in the world)`
      },
      {
        type: 'callout',
        variant: 'tip',
        content: `**When parents focus only on academics:**

"I hear that academics are important to you—they're important to us too. But let me ask: what do you want for your child in 20 years? The qualities that lead to a fulfilling life—curiosity, resilience, self-direction—those are what we focus on. And those qualities also lead to academic success, just not through the traditional path."`
      },
      {
        type: 'text',
        content: `## Talking About Outcomes

**Do:**
- Share specific observations ("I've seen children who...")
- Offer to connect them with current families
- Be honest about what we can and can't promise
- Reframe "outcomes" as "who your child becomes"

**Don't:**
- Promise specific test scores or college admissions
- Compare PEP students to traditional school students
- Dismiss their concerns about academics
- Oversell or make guarantees you can't keep

**The best "outcome" pitch:**
"Come meet our students. Spend time in our classrooms. You'll see children who are focused, curious, kind, and capable. That's the outcome we deliver."`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'outcomes-mc-1',
        question: 'A parent asks: "Will my child be at grade level?" The best response is:',
        options: [
          '"Yes, absolutely—our students meet or exceed grade level standards"',
          '"We don\'t believe in grade levels, so that\'s not how we measure progress"',
          '"We don\'t use grade level as a measure because it ignores individual development. Your child will progress appropriately for them—some areas may be ahead, some may take more time."',
          '"Grade level is an artificial construct created by traditional schools"'
        ],
        correctIndex: 2,
        explanation: 'This answer is honest without being dismissive. It reframes the question while acknowledging the parent\'s underlying concern (is my child learning?). The other answers are either dishonest, defensive, or dismissive.'
      },
      {
        type: 'multiple_choice',
        id: 'outcomes-mc-2',
        question: 'Which of these is something we CAN promise to parents?',
        options: [
          'Your child will get into a top college',
          'Your child will be ahead of grade level',
          'Your child will love coming to school and develop a love of learning',
          'Your child will pass board exams with top marks'
        ],
        correctIndex: 2,
        explanation: 'We can promise things within our control: a joyful environment, known children, love of learning. We cannot promise external outcomes like college admissions or test scores.'
      },
      {
        type: 'voice',
        id: 'outcomes-voice-1',
        scenario: 'A parent says: "I\'m worried my child will fall behind. All their cousins are doing so much homework and extra classes. How will my child keep up?"',
        guidance: `This requires reframing "keeping up":
- Acknowledge the concern (don't dismiss it)
- Question what "keeping up" means (keeping up in what? For what?)
- Explain that deep understanding beats surface coverage
- Share what PEP students DO develop
- Offer to introduce them to older students/families

Don't argue. Don't bash the cousins' approach. Just paint a different picture of success.`,
        aiPrompt: `Evaluate if the trainee:
1. Acknowledged the parent's concern as valid
2. Gently questioned the frame ("keeping up" compared to what?)
3. Explained what depth of learning looks like vs. coverage
4. Described positive outcomes PEP students achieve
5. Offered concrete ways to see evidence (meet families, observe)

Did they reframe without being dismissive or preachy?`
      }
    ]
  },
  {
    id: 'admissions-conversation',
    title: 'The Admissions Conversation',
    estimatedMinutes: 45,
    content: [
      {
        type: 'text',
        content: `# The Admissions Conversation

Now that you understand our beliefs, science, program, and outcomes—how do you actually conduct an admissions conversation? This section covers the flow, key moments, and practical techniques.`
      },
      {
        type: 'text',
        content: `## The Conversation Structure

A good admissions conversation has five phases:

**1. Welcome & Warm-up (5-10 min)**
- Greet warmly, offer water/tea
- Light conversation (how did you hear about us? where do you live?)
- Help them feel comfortable before diving deep

**2. Discovery: Learn About Them (15-20 min)**
- Ask about their child
- Ask about their concerns
- Ask about their hopes
- LISTEN more than you talk

**3. Share: Tell the PEP Story (15-20 min)**
- Tailored to what you learned in discovery
- Focus on what matters to THEM
- Use their language, address their concerns

**4. Experience: Show, Don't Tell (20-30 min)**
- Tour the environment
- Observe a classroom if possible
- Meet teachers or other families

**5. Close: Next Steps (5-10 min)**
- Answer remaining questions
- Explain the process
- Don't pressure—let them decide`
      },
      {
        type: 'callout',
        variant: 'info',
        content: `**The golden rule:** Spend more time in Discovery than in Share. The more you understand about them, the more relevant your Share will be. A parent who feels heard is a parent who trusts you.`
      },
      {
        type: 'text',
        content: `## Discovery Questions

Great questions to understand the family:

**About the child:**
- "Tell me about [child's name]. What are they like?"
- "What does [child] love to do? What are they curious about?"
- "What's something [child] finds challenging?"
- "How does [child] respond when things get difficult?"

**About their current situation:**
- "Where is [child] in school now? What's working well?"
- "What made you start looking for something different?"
- "Is there something specific you wish was different?"

**About their hopes:**
- "When you imagine [child] at 18, what do you hope for them?"
- "What does a great education look like to you?"
- "What matters most to you in choosing a school?"

**About their concerns:**
- "What questions do you have about PEP?"
- "What concerns you about this approach?"
- "What would you need to see or hear to feel confident?"`
      },
      {
        type: 'text',
        content: `## Tailoring Your Share

Don't give the same presentation to every family. Based on what you learn in discovery, emphasize different things:

**If they're concerned about academics:**
→ Lead with outcomes, mention the research, offer to show materials

**If they're concerned about socialization:**
→ Emphasize mixed-age groups, collaboration, the community

**If they're fleeing a bad school experience:**
→ Lead with how we're different, validate their concerns, show the environment

**If they're high-achievers worried about "rigor":**
→ Lead with founders' background, explain "rigour with joy," introduce them to older students

**If they're skeptical and asking hard questions:**
→ Welcome the questions, share the science, be direct and honest`
      },
      {
        type: 'text',
        content: `## Key Messages to Convey

Regardless of the family, certain messages should come through:

**1. We believe children want to learn.**
This is the foundation. If they don't get this, nothing else makes sense.

**2. Your child will be known here.**
Not one of 40. Deeply known. You'll get real observations, not generic reports.

**3. We're not anti-academic. We're anti-suffering.**
Joy and rigour aren't opposites. Your child will learn—and love learning.

**4. This is a long-term commitment.**
PEP isn't a "break" from real school. It's a complete approach to education.

**5. Fit matters to us.**
We're not trying to convince everyone. We're looking for families who share our beliefs.`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**What to watch for:** Parents who nod along but never ask questions may be agreeing to be polite. Gently probe: "I've shared a lot—what stands out to you? What concerns you?" Silence isn't agreement.`
      },
      {
        type: 'text',
        content: `## Common Mistakes

**1. Talking too much**
If you've been talking for 10 minutes straight, stop. Ask a question. Let them respond.

**2. Getting defensive**
When parents challenge the approach, don't argue. Get curious. "Tell me more about that concern."

**3. Overselling**
Resist the urge to promise everything. Honesty builds trust. "We can't guarantee grade level, but here's what we can promise..."

**4. Ignoring red flags**
If a parent reveals beliefs that conflict with ours, don't gloss over it. Explore it. Better to discover misalignment now than after enrollment.

**5. Rushing**
An admissions conversation should feel spacious. If you're hurrying to cover everything, you're doing it wrong.`
      },
      {
        type: 'text',
        content: `## The Tour

The classroom tour is often the most powerful part:

**What to point out:**
- Children's concentration and focus
- The beauty and order of the environment
- Mixed-age interaction
- Independence (children getting materials, working alone)
- The calm atmosphere

**What to say:**
- "Notice how focused that child is..."
- "Watch how she puts the materials back when she's done..."
- "See how the older child is helping the younger one..."

**What to avoid:**
- Interrupting children's work
- Talking loudly in the classroom
- Rushing through the space

**Let the environment speak for itself.** Often the best thing you can do is be quiet and let them observe.`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'conversation-mc-1',
        question: 'In an admissions conversation, you should spend more time:',
        options: [
          'Sharing information about PEP\'s philosophy and approach',
          'Asking questions and listening to understand the family',
          'Showing them the classroom and materials',
          'Answering their questions about the program'
        ],
        correctIndex: 1,
        explanation: 'Discovery (listening and asking) should take more time than Share (telling). The more you understand about them, the more relevant your sharing will be. A parent who feels heard is a parent who trusts you.'
      },
      {
        type: 'multiple_choice',
        id: 'conversation-mc-2',
        question: 'A parent nods along to everything you say but never asks questions or raises concerns. You should:',
        options: [
          'Take their agreement at face value—they\'re clearly aligned',
          'Continue sharing more information since they seem interested',
          'Gently probe: "What stands out to you? What concerns you?"',
          'Move quickly to enrollment since they seem ready'
        ],
        correctIndex: 2,
        explanation: 'Silence isn\'t agreement. Parents may nod to be polite while having serious reservations. Always probe for real reactions before assuming alignment.'
      },
      {
        type: 'voice',
        id: 'conversation-voice-1',
        scenario: 'You\'re starting an admissions conversation. A mother and father have just sat down with you. How do you open the conversation?',
        guidance: `The opening sets the tone. A good opening:
- Welcomes them warmly
- Makes light conversation to put them at ease
- Transitions into discovery questions about their child
- Positions yourself as curious, not selling

Don't launch straight into "Let me tell you about PEP." Start by learning about them.`,
        aiPrompt: `Evaluate if the trainee:
1. Started warmly and put the parents at ease
2. Asked about them/their child before talking about PEP
3. Showed genuine curiosity
4. Avoided launching into a sales pitch
5. Set a conversational, not presentational, tone

The opening should feel like the start of a dialogue, not a presentation.`
      },
      {
        type: 'voice',
        id: 'conversation-voice-2',
        scenario: 'During discovery, a parent says: "We\'re looking at PEP because our son hates his current school. He cries every morning." How do you respond, and what do you explore further?',
        guidance: `This reveals important information. A good response:
- Acknowledges the difficulty ("That must be hard for all of you")
- Explores further (What does he hate? When did it start? What does he enjoy?)
- Doesn't immediately promise PEP will fix it
- Notes this as context for later sharing

This is discovery—your job is to understand, not solve yet.`,
        aiPrompt: `Evaluate if the trainee:
1. Showed empathy for the difficult situation
2. Asked follow-up questions to understand more
3. Didn't immediately pivot to "PEP will solve this"
4. Gathered useful information for tailoring later
5. Made the parent feel heard and understood

This is a discovery moment—did they explore or did they sell?`
      }
    ]
  },
  {
    id: 'objection-handling',
    title: 'Objection Handling',
    estimatedMinutes: 50,
    content: [
      {
        type: 'text',
        content: `# Objection Handling

Every admissions conversation will include questions, concerns, and objections. This section covers the most common ones and how to respond effectively.`
      },
      {
        type: 'callout',
        variant: 'info',
        content: `**Mindset shift:** Objections aren't obstacles—they're opportunities. A parent who raises concerns is engaged and thinking seriously. A parent who asks no questions may not be paying attention.`
      },
      {
        type: 'text',
        content: `## The AEIO Framework

For any objection, follow this pattern:

**A — Acknowledge**
Validate the concern. Don't dismiss or argue. "That's a fair question..." / "I understand that concern..." / "Many parents ask that..."

**E — Explore**
Ask questions to understand what's really behind the concern. "Tell me more about what worries you..." / "What would reassure you?"

**I — Inform**
Share relevant information, research, or examples. Tailor to their specific concern.

**O — Offer Evidence**
Give them a way to verify: meet families, observe classrooms, talk to teachers, see student work.`
      },
      {
        type: 'text',
        content: `## Objection: "When will my child learn to read/write?"

**What they're really asking:** "Will my child be left behind? Are you paying attention to academics?"

**Response framework:**
- **Acknowledge:** "Reading readiness is something every parent thinks about."
- **Explore:** "What's prompting that question? Is there a timeline you have in mind?"
- **Inform:** "Children develop at different rates. Our approach builds strong foundations—phonemic awareness, vocabulary, fine motor skills—so that when reading clicks, it clicks solidly. Most children read fluently by 7-8, some earlier, some later."
- **Offer:** "Would you like to meet some of our older students and see their reading and writing?"`
      },
      {
        type: 'text',
        content: `## Objection: "How will my child be at par with grade level?"

**What they're really asking:** "Will my child be able to compete? Will they be behind if we switch schools?"

**Response framework:**
- **Acknowledge:** "Wanting to know your child is progressing is completely natural."
- **Explore:** "When you say 'at par,' what are you comparing to? What would 'on track' look like to you?"
- **Inform:** "We don't use grade level because it's an arbitrary standard that ignores individual development. A child might be 'ahead' in reading and 'behind' in math—but both are progressing appropriately for them. What we focus on is: Is this child growing? Are they curious? Are they building real understanding?"
- **Offer:** "I'd love to show you how we track individual progress. It's much more detailed than a report card."`
      },
      {
        type: 'text',
        content: `## Objection: "What about board exams?"

**What they're really asking:** "Will my child be able to succeed in the 'real world' system?"

**Response framework:**
- **Acknowledge:** "Board exams are a reality in our system, and it's smart to think about that."
- **Explore:** "How far away are boards for your child? What's your main concern—that they won't be prepared, or that the transition will be hard?"
- **Inform:** "If a child stays with us through high school, they'll be prepared for boards. But I'll be honest: board prep isn't our primary focus. We focus on developing capable, curious learners who can handle any challenge—including exams when the time comes."
- **Offer:** "Would you like to speak with families whose children have gone through boards after PEP?"`
      },
      {
        type: 'text',
        content: `## Objection: "What if they choose not to do math/language?"

**What they're really asking:** "Will you let my child avoid important things? Is there any structure?"

**Response framework:**
- **Acknowledge:** "That's a question every parent asks—it shows you're thinking carefully."
- **Explore:** "What makes you think they might avoid those areas?"
- **Inform:** "Choice doesn't mean no guidance. Our environment is prepared so all choices are good choices. And our guides know each child—if someone is avoiding an area, we notice. We find ways to spark interest, introduce materials differently, connect it to what they love. We don't force, but we don't ignore either."
- **Offer:** "Would you like to observe how a guide works with a child who's resistant to something?"`
      },
      {
        type: 'text',
        content: `## Objection: "How will they handle competition in the real world?"

**What they're really asking:** "Are you sheltering my child? Will they be able to cope?"

**Response framework:**
- **Acknowledge:** "That's a thoughtful question. The world is competitive."
- **Explore:** "What kind of competition are you thinking about? What do you want your child to be able to handle?"
- **Inform:** "We believe the best way to prepare for competition is to build real capability—not to practice competing. A child who knows themselves, has deep skills, and is resilient will handle competition far better than a child who's been ranked and sorted their whole life. We're not sheltering—we're building."
- **Offer:** "I'd encourage you to meet some of our older students. See if they seem sheltered or capable."`
      },
      {
        type: 'text',
        content: `## Objection: "It's so expensive. Is it worth it?"

**What they're really asking:** "Can you justify this cost? Will I get value?"

**Response framework:**
- **Acknowledge:** "Education is a significant investment. It's right to think carefully about it."
- **Explore:** "What would make it feel 'worth it' to you? What are you comparing to?"
- **Inform:** "Our fees reflect small class sizes, highly trained guides, quality materials, and individual attention. In traditional schools, your child is one of 40. Here, they're known. That level of attention costs more—but the difference in experience is dramatic."
- **Offer:** "I'd suggest visiting a traditional school and visiting us on the same week. See the difference for yourself."`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**Red flag objections:** Some objections reveal fundamental misalignment. If a parent keeps returning to "but how will you MAKE them learn?" or "but what's their RANK?"—no amount of handling will help. Note it, explore it, but don't oversell. Misaligned families don't convert.`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'objection-mc-1',
        question: 'A parent asks: "What if my child refuses to do math?" The FIRST thing you should do is:',
        options: [
          'Explain how guides help children who avoid certain areas',
          'Ask what makes them think their child might refuse math',
          'Reassure them that children eventually balance themselves',
          'Describe the math materials and how engaging they are'
        ],
        correctIndex: 1,
        explanation: 'In the AEIO framework, after Acknowledging, you Explore. Understanding what\'s behind the question helps you tailor your response. Maybe they\'ve seen avoidance behavior; maybe they\'re just worried hypothetically. Find out first.'
      },
      {
        type: 'multiple_choice',
        id: 'objection-mc-2',
        question: 'A parent keeps asking: "But how do you MAKE SURE they learn? How do you ENSURE they cover everything?" This is:',
        options: [
          'A normal concern that can be addressed with the right explanation',
          'A sign they need more information about the curriculum',
          'A potential red flag showing fundamental misalignment with PEP\'s beliefs',
          'An opportunity to explain the research on intrinsic motivation'
        ],
        correctIndex: 2,
        explanation: 'The language of "make sure" and "ensure" reveals a belief that children must be forced to learn. This may indicate fundamental misalignment. It\'s worth exploring, but don\'t oversell—some beliefs don\'t change.'
      },
      {
        type: 'voice',
        id: 'objection-voice-1',
        scenario: 'A parent says: "My child\'s cousins are all doing so much homework and extra tuition. They know multiplication tables, they\'re reading chapter books. Won\'t my child fall behind?"',
        guidance: `Use the AEIO framework:
- Acknowledge the concern (comparison anxiety is real)
- Explore what "behind" means to them
- Inform about depth vs. breadth, intrinsic motivation
- Offer evidence (meet older students, see outcomes)

Don't bash the cousins' approach. Don't be defensive. Reframe what "ahead" means.`,
        aiPrompt: `Evaluate if the trainee:
1. Acknowledged the parent's concern without dismissing it
2. Explored what's really worrying them
3. Reframed "behind/ahead" with a different view of success
4. Gave concrete information without lecturing
5. Offered a way to verify (meet students, see work)

Did they follow AEIO or did they get defensive/dismissive?`
      },
      {
        type: 'voice',
        id: 'objection-voice-2',
        scenario: 'A parent says: "I believe in what you\'re doing, but my husband thinks it\'s too risky. He wants a \'real\' school with exams and grades. How do I convince him?"',
        guidance: `This is tricky. Don't:
- Give arguments to use against the spouse
- Take sides in a marital disagreement

Do:
- Acknowledge that both parents being aligned matters
- Offer for the skeptical spouse to visit
- Suggest they both come together
- Express that we want families where both parents believe in this

Hidden message: If parents are fundamentally split, PEP may not be right for them right now.`,
        aiPrompt: `Evaluate if the trainee:
1. Avoided taking sides or giving "ammunition"
2. Emphasized the importance of both parents being aligned
3. Offered for the spouse to visit and experience PEP directly
4. Didn't try to "close the sale" over the spouse's objection
5. Subtly indicated that alignment matters for admission

This tests judgment, not just knowledge. Did they handle the politics well?`
      }
    ]
  },
  {
    id: 'qualification',
    title: 'Qualification',
    estimatedMinutes: 40,
    content: [
      {
        type: 'text',
        content: `# Qualification: Finding the Right Families

Not every family is right for PEP—and that's okay. This section helps you identify good-fit and wrong-fit families, and handle both gracefully.`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**The cost of wrong fits:** A misaligned family creates problems for everyone: their child struggles, teachers spend energy on conflict instead of teaching, other families are affected, and ultimately the family leaves angry. It's better to decline gracefully than to enroll badly.`
      },
      {
        type: 'text',
        content: `## Green Flags (Likely Good Fit)

**Philosophy alignment:**
- They question traditional education (not just their current school)
- They talk about who their child IS, not just what they should BECOME
- They value curiosity, creativity, independence as much as academics
- They ask thoughtful questions and listen to answers

**Realistic expectations:**
- They understand this is a different approach, not a magic solution
- They're thinking long-term (not "let's try it for a year")
- They acknowledge their own anxiety but don't let it drive decisions

**Family readiness:**
- Both parents are aligned (or at least genuinely open)
- They've done research and chosen PEP deliberately
- They're excited about the philosophy, not just escaping a problem

**Good questions they ask:**
- "How do children spend their time here?"
- "How will you get to know my child?"
- "What if my child struggles with something?"
- "How can we support this approach at home?"`
      },
      {
        type: 'text',
        content: `## Yellow Flags (Proceed with Caution)

**Intellectual agreement but emotional anxiety:**
- "I believe in this, BUT..." (the 'but' reveals doubt)
- Keeps returning to grade level, comparisons, timelines
- Agrees with everything but seems uncomfortable

**External pressure:**
- Extended family is skeptical and influential
- Spouse is reluctant or absent from conversation
- They're worried about what others will think

**Escapism:**
- Running FROM a bad experience more than running TO something
- "Anything is better than their current school"
- No clear understanding of what PEP actually is

**Short-term thinking:**
- "Let's try it for a year and see"
- Mentions switching back to "regular school" for boards
- Sees PEP as a phase, not a commitment

**For yellow flags:** Consider requiring additional steps before admission—workshops, classroom observations, conversations with current families. Some yellow flags convert to green. Others self-select out.`
      },
      {
        type: 'text',
        content: `## Red Flags (Likely Wrong Fit)

**Fundamental belief misalignment:**
- "How will you MAKE them learn?"
- "Children need pressure to succeed"
- "If they're having fun, are they really learning?"
- Dismisses the philosophy but likes the facilities/location

**Fixing mindset:**
- They want PEP to "fix" their child's behavior/attitude
- Talk about the child as a problem to be solved
- Expectations of rapid transformation

**Outcome obsession:**
- Only asks about board results, college placements
- Grade level is the primary measure of success
- Wants unconventional methods to achieve conventional goals

**Comparison driven:**
- Constantly references what other children are doing
- Measures their child against cousins/neighbors
- "Will they keep up?"

**Control orientation:**
- Wants detailed reports on what child did every day
- Uncomfortable with child having choice
- Asks about homework, tests, rankings

**Red flag language:**
- "At par with," "grade level," "keep up"
- "Make sure," "ensure," "guarantee"
- "Eventually they'll need to face reality"
- "This is fine for now, but later..."`
      },
      {
        type: 'text',
        content: `## How to Decline Gracefully

Sometimes you need to suggest that PEP isn't the right fit. Here's how:

**Don't:**
- Tell them they're wrong or bad parents
- Criticize their beliefs or values
- Make them feel judged
- Ghost them or be unclear

**Do:**
- Be direct but kind
- Frame it as fit, not judgment
- Acknowledge what they're looking for is valid (just not what we offer)
- Suggest alternatives if you can

**Example language:**

"Based on our conversation, I'm not sure PEP is the right fit for what you're looking for. It sounds like board preparation and grade-level benchmarks are really important to you—and there's nothing wrong with that. But that's not our focus. I'd hate for you to invest in PEP and then be frustrated that we're not delivering what matters most to you. Would you like me to suggest some other schools that might be better aligned?"`
      },
      {
        type: 'callout',
        variant: 'tip',
        content: `**The graceful decline is a service.** You're saving them time, money, and frustration. You're saving their child from being in the wrong environment. And you're protecting your community. A good decline is a kindness.`
      },
      {
        type: 'text',
        content: `## Qualification Throughout the Conversation

Don't wait until the end to qualify. Throughout the conversation, notice:

**Listen for:**
- Language patterns (ensure, make sure, at par)
- Emotional reactions to what you share
- Questions they ask (and don't ask)
- How they talk about their child

**Probe gently:**
- "What would make you feel confident this is working?"
- "How would you feel if your child was 'behind' in one area but thriving overall?"
- "What would make you consider leaving PEP?"

**Trust your instincts:** If something feels off, explore it. Don't ignore discomfort in pursuit of enrollment.`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'qual-mc-1',
        question: 'A parent says: "We love the philosophy, but we\'ll probably move to a regular school for board prep in 8th grade." This is:',
        options: [
          'A green flag—they\'re being honest and thoughtful',
          'A yellow flag—they like PEP but see it as temporary',
          'A red flag—they don\'t really believe in the approach',
          'Neutral—many families do this and it works fine'
        ],
        correctIndex: 1,
        explanation: 'This reveals they see PEP as a phase, not a commitment. It\'s not a red flag (they\'re honest and may genuinely appreciate the early years), but it\'s worth exploring. Will they undermine the approach by preparing to leave? Will their anxiety transfer to the child?'
      },
      {
        type: 'multiple_choice',
        id: 'qual-mc-2',
        question: 'You realize a family is not a good fit for PEP. The best approach is to:',
        options: [
          'Continue the conversation and let them decide not to enroll',
          'Be direct but kind, explain why PEP may not meet their needs, and suggest alternatives',
          'Point out the flaws in their thinking so they understand why they\'re wrong',
          'Be vague and let them figure it out from the slow response to their application'
        ],
        correctIndex: 1,
        explanation: 'A graceful, direct decline is a service to everyone. Don\'t waste their time, don\'t judge them, and don\'t ghost them. Be honest about fit and help them find what they\'re actually looking for.'
      },
      {
        type: 'voice',
        id: 'qual-voice-1',
        scenario: 'A parent keeps saying: "I just want to make sure my child will be at par with other kids her age. How will you ensure she doesn\'t fall behind?" You\'ve explained your approach twice already. How do you handle this?',
        guidance: `This is a qualification moment. The repeated concern suggests fundamental misalignment.

Options:
- Probe deeper: "It sounds like being at grade level is really important to you. Tell me more about what's driving that."
- Be honest: "I'm noticing this is a big concern for you. I want to be straight: if grade-level benchmarks are your primary measure, you may be frustrated with us."
- Name the gap: "We may have a different definition of success than what you're looking for."

Don't keep explaining. The issue isn't information—it's alignment.`,
        aiPrompt: `Evaluate if the trainee:
1. Recognized this as a qualification moment, not just another objection
2. Probed to understand the depth of the concern
3. Was honest about potential misalignment
4. Didn't keep explaining the same thing hoping it would land
5. Maintained respect while being direct

This tests the ability to recognize and name misalignment. Did they do that?`
      }
    ]
  },
  {
    id: 'never-say',
    title: 'What You Must Never Say',
    estimatedMinutes: 25,
    content: [
      {
        type: 'text',
        content: `# What You Must Never Say

Some statements are off-limits—because they're inaccurate, damaging, or create expectations we can't meet. This section covers hard rules.`
      },
      {
        type: 'callout',
        variant: 'warning',
        content: `**These are not guidelines—they are rules.** Violating these can damage the school's reputation, create legal liability, or set up families for failure. If you're unsure about something, escalate to leadership. Don't improvise.`
      },
      {
        type: 'text',
        content: `## Never Make Guarantees About Outcomes

**Never say:**
- "Your child WILL read by age X"
- "Your child WILL get into [college/school]"
- "Your child WILL be at grade level"
- "Your child WILL be ready for boards"

**Why:** We cannot guarantee developmental outcomes. Every child is different. Making promises we can't keep creates angry families and potential legal issues.

**Instead say:**
- "Most children read fluently by 7-8, though there's natural variation"
- "Our students develop the qualities that support long-term success"
- "We focus on each child's individual progress, not arbitrary benchmarks"`
      },
      {
        type: 'text',
        content: `## Never Criticize Other Schools by Name

**Never say:**
- "DPS is terrible because..."
- "NPS just teaches to the test..."
- "Those schools don't really care about children..."

**Why:** It's unprofessional, potentially defamatory, and undermines our credibility. We compete on what we ARE, not what others AREN'T.

**Instead say:**
- "Traditional schools operate on different beliefs than ours..."
- "Many schools prioritize different outcomes..."
- "Our approach differs from conventional schooling in these ways..."`
      },
      {
        type: 'text',
        content: `## Never Diagnose or Promise to Fix Children

**Never say:**
- "It sounds like your child has ADHD/dyslexia/autism"
- "We can fix your child's behavior problems"
- "Your child just needs the right environment and they'll be normal"

**Why:** We're not qualified to diagnose. Promising to "fix" children sets up unrealistic expectations and is disrespectful to the child.

**Instead say:**
- "I'd recommend speaking with a specialist about that concern"
- "We work with each child as they are, wherever they are"
- "Our environment supports many different kinds of learners"`
      },
      {
        type: 'text',
        content: `## Never Discuss Fees as Negotiable

**Never say:**
- "We might be able to work something out on fees"
- "There may be discounts available"
- "Let me check if we can reduce the cost"

**Why:** Fee discussions should go through proper channels. Implying negotiability creates awkwardness and inequality.

**Instead say:**
- "Our fees are set to reflect the quality of what we offer. I can connect you with our admissions office to discuss payment options if needed."`
      },
      {
        type: 'text',
        content: `## Never Contradict School Policy

**Never say:**
- "I personally think..." (when it contradicts PEP policy)
- "Between us..." (sharing unofficial information)
- "That rule is silly, but..." (undermining school decisions)

**Why:** Mixed messages confuse families and undermine trust in the institution.

**If you disagree with a policy:** Discuss it internally. Don't share disagreement with prospective families.`
      },
      {
        type: 'text',
        content: `## Never Pressure or Oversell

**Never say:**
- "Spots are filling up fast, you should decide now"
- "This is your only chance"
- "Every parent who visits enrolls"
- "You'd be crazy not to choose PEP"

**Why:** High-pressure tactics attract wrong-fit families and damage our reputation. Families should choose us thoughtfully, not desperately.

**Instead:** Let the experience speak for itself. If they need pressure to enroll, they're probably not right for us.`
      },
      {
        type: 'text',
        content: `## When to Escalate

Some situations require you to involve leadership. Escalate when:

- **A parent asks for something outside your authority** (fee discounts, policy exceptions)
- **A parent makes accusations or threats**
- **A parent reveals something concerning about the child** (abuse, serious behavioral issues)
- **You're unsure whether to admit a family** (borderline cases)
- **A parent asks questions you can't answer** (legal, policy-related)
- **Something feels wrong** (trust your instincts)

**How to escalate gracefully:**
"That's a great question, and I want to make sure you get an accurate answer. Let me connect you with [name] who can help with that."

Never pretend to know something you don't. Never make promises outside your authority. When in doubt, escalate.`
      }
    ],
    exercises: [
      {
        type: 'multiple_choice',
        id: 'never-mc-1',
        question: 'A parent asks: "Can you guarantee my child will be reading by age 6?" The correct response is:',
        options: [
          '"Yes, our approach ensures children read early"',
          '"Most children in our program are reading by 6"',
          '"We focus on building strong foundations. Most children read by 7-8, though there\'s natural variation based on each child\'s development."',
          '"We don\'t focus on timelines like that"'
        ],
        correctIndex: 2,
        explanation: 'Never guarantee specific outcomes. The correct answer sets realistic expectations, explains our approach, and acknowledges individual variation—without dismissing their concern or making promises we can\'t keep.'
      },
      {
        type: 'multiple_choice',
        id: 'never-mc-2',
        question: 'A parent says: "I think my child might have ADHD. Can PEP help with that?" The correct response is:',
        options: [
          '"Yes, our approach is great for children with ADHD"',
          '"I\'d recommend speaking with a specialist about that. We work with each child as they are, and our environment supports many different kinds of learners."',
          '"We\'ve had a lot of success with ADHD children"',
          '"What makes you think they have ADHD?"'
        ],
        correctIndex: 1,
        explanation: 'Never diagnose or claim expertise in conditions you\'re not qualified to assess. Recommend they consult specialists, and reassure that we work with children as they are without making promises about "fixing" anything.'
      },
      {
        type: 'voice',
        id: 'never-voice-1',
        scenario: 'A parent says: "I visited DPS last week. It was terrible—the classrooms were chaotic, the teachers seemed stressed. PEP is so much better, right?"',
        guidance: `The parent is inviting you to criticize a competitor. Don't take the bait.

Do:
- Acknowledge their observation without validating the criticism
- Redirect to what PEP offers
- Stay professional

Don't:
- Agree that DPS is terrible
- Add your own criticisms
- Compare directly

Example: "It sounds like that wasn't the right fit for what you're looking for. Let me tell you about what you'd see here..."`,
        aiPrompt: `Evaluate if the trainee:
1. Avoided agreeing with the criticism of DPS
2. Didn't add their own criticisms
3. Redirected to PEP's positive qualities
4. Maintained professionalism
5. Didn't seem evasive or preachy

The trap is tempting—did they avoid it while staying warm and engaged?`
      }
    ]
  }
];

export function getSection(id: string): Section | undefined {
  return sections.find(s => s.id === id);
}

export function getSectionIndex(id: string): number {
  return sections.findIndex(s => s.id === id);
}

export function getNextSection(currentId: string): Section | undefined {
  const currentIndex = getSectionIndex(currentId);
  if (currentIndex === -1 || currentIndex === sections.length - 1) {
    return undefined;
  }
  return sections[currentIndex + 1];
}

export function getPreviousSection(currentId: string): Section | undefined {
  const currentIndex = getSectionIndex(currentId);
  if (currentIndex <= 0) {
    return undefined;
  }
  return sections[currentIndex - 1];
}
