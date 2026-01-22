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
