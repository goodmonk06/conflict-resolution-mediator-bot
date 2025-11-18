import { PrismaClient, SourceType, SignalType, CaseStatus, ActionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.mediationStep.deleteMany();
  await prisma.mediationCase.deleteMany();
  await prisma.conflictSignal.deleteMany();
  await prisma.conversationThread.deleteMany();

  // Create demo conversation threads
  const thread1 = await prisma.conversationThread.create({
    data: {
      communityId: 'community-alpha',
      externalThreadId: 'thread-001',
      sourceType: SourceType.chat,
    },
  });

  const thread2 = await prisma.conversationThread.create({
    data: {
      communityId: 'community-alpha',
      externalThreadId: 'thread-002',
      sourceType: SourceType.forum,
    },
  });

  const thread3 = await prisma.conversationThread.create({
    data: {
      communityId: 'community-beta',
      externalThreadId: 'thread-003',
      sourceType: SourceType.chat,
    },
  });

  console.log('✅ Created conversation threads');

  // Create conflict signals
  const signal1 = await prisma.conflictSignal.create({
    data: {
      threadId: thread1.id,
      timestamp: new Date('2025-11-15T10:30:00Z'),
      signalType: SignalType.potential,
      summaryMarkdown: '## Potential Conflict Detected\n\nDisagreement over code review standards. Two team members have different interpretations of the style guide.',
      score: 0.65,
      metaJson: {
        keywords: ['code review', 'standards', 'disagreement'],
        participants: ['user123', 'user456'],
        messageCount: 8,
      },
    },
  });

  const signal2 = await prisma.conflictSignal.create({
    data: {
      threadId: thread1.id,
      timestamp: new Date('2025-11-15T14:20:00Z'),
      signalType: SignalType.escalated,
      summaryMarkdown: '## Escalation Detected\n\nThe discussion has become more heated. Personal remarks are appearing in the conversation.',
      score: 0.82,
      metaJson: {
        keywords: ['personal attack', 'frustration', 'escalation'],
        participants: ['user123', 'user456'],
        messageCount: 15,
      },
    },
  });

  const signal3 = await prisma.conflictSignal.create({
    data: {
      threadId: thread2.id,
      timestamp: new Date('2025-11-16T09:15:00Z'),
      signalType: SignalType.potential,
      summaryMarkdown: '## Potential Conflict Detected\n\nDebate about project priorities. Marketing and engineering teams have conflicting views on feature priorities.',
      score: 0.58,
      metaJson: {
        keywords: ['priorities', 'roadmap', 'cross-team'],
        participants: ['marketing-lead', 'eng-lead'],
        messageCount: 12,
      },
    },
  });

  const signal4 = await prisma.conflictSignal.create({
    data: {
      threadId: thread3.id,
      timestamp: new Date('2025-11-17T11:00:00Z'),
      signalType: SignalType.potential,
      summaryMarkdown: '## Potential Conflict Detected\n\nMisunderstanding about task ownership. Two contributors claim responsibility for the same deliverable.',
      score: 0.55,
      metaJson: {
        keywords: ['ownership', 'responsibility', 'duplicate work'],
        participants: ['contributor-a', 'contributor-b'],
        messageCount: 6,
      },
    },
  });

  console.log('✅ Created conflict signals');

  // Create mediation cases
  const case1 = await prisma.mediationCase.create({
    data: {
      threadId: thread1.id,
      status: CaseStatus.in_progress,
      assignedMediatorRef: 'mediator@example.com',
      notesMarkdown: '## Case Notes\n\nThis case started as a technical disagreement but escalated to personal remarks. Priority: High.\n\n**Next Steps:**\n- Schedule 1:1 calls with both parties\n- Review the style guide for clarity\n- Facilitate a resolution meeting',
    },
  });

  const case2 = await prisma.mediationCase.create({
    data: {
      threadId: thread2.id,
      status: CaseStatus.open,
      assignedMediatorRef: null,
      notesMarkdown: null,
    },
  });

  const case3 = await prisma.mediationCase.create({
    data: {
      threadId: thread3.id,
      status: CaseStatus.dismissed,
      assignedMediatorRef: 'mediator@example.com',
      notesMarkdown: '## Case Notes\n\nParties resolved this on their own before mediation was needed. Dismissed as resolved.',
    },
  });

  console.log('✅ Created mediation cases');

  // Create mediation steps for case1
  await prisma.mediationStep.create({
    data: {
      caseId: case1.id,
      orderIndex: 0,
      actionType: ActionType.reach_out,
      notesMarkdown: 'Initial outreach completed via DM.',
      suggestedMessageMarkdown: `Hi [Name],

I've noticed some tension in the recent thread about code review standards. I'd like to help facilitate a productive resolution.

Would you be open to a brief 1:1 call to share your perspective? I'm here to listen and help find common ground.

Best regards,
[Mediator Name]`,
      completedAt: new Date('2025-11-15T16:00:00Z'),
    },
  });

  await prisma.mediationStep.create({
    data: {
      caseId: case1.id,
      orderIndex: 1,
      actionType: ActionType.clarify,
      notesMarkdown: 'Scheduled calls with both parties. Gathering their perspectives separately.',
      suggestedMessageMarkdown: `During our 1:1, I'd like to understand:

1. What specific aspects of the code review process are most important to you?
2. What outcome would you consider a successful resolution?
3. Are there any misunderstandings we can clear up?

This is a safe space to share your thoughts openly.`,
      completedAt: null,
    },
  });

  await prisma.mediationStep.create({
    data: {
      caseId: case1.id,
      orderIndex: 2,
      actionType: ActionType.reframe,
      notesMarkdown: null,
      suggestedMessageMarkdown: `Hi team,

I appreciate both of you taking the time to share your perspectives. It's clear you both care deeply about code quality.

Let's reframe this: Rather than "who's right," let's focus on "what serves the team best." I've noticed some common ground:

- You both value consistent, high-quality code
- You both want efficient review processes
- You both respect each other's expertise

Would you be open to a joint conversation to align on specific guidelines?`,
      completedAt: null,
    },
  });

  await prisma.mediationStep.create({
    data: {
      caseId: case1.id,
      orderIndex: 3,
      actionType: ActionType.schedule_call,
      notesMarkdown: null,
      suggestedMessageMarkdown: `Let's schedule a 30-minute video call to discuss this together.

**Proposed times:**
- [Option 1]
- [Option 2]
- [Option 3]

The goal is to create a shared understanding and document any updates to our style guide.`,
      completedAt: null,
    },
  });

  await prisma.mediationStep.create({
    data: {
      caseId: case1.id,
      orderIndex: 4,
      actionType: ActionType.agreement,
      notesMarkdown: null,
      suggestedMessageMarkdown: `## Resolution Agreement

Based on our conversation, we've agreed to:

1. [Agreement point 1]
2. [Agreement point 2]
3. [Agreement point 3]

**Action Items:**
- [ ] Update style guide documentation
- [ ] Share updates with the broader team
- [ ] Review effectiveness in 2 weeks

Thank you both for your collaboration and professionalism.`,
      completedAt: null,
    },
  });

  console.log('✅ Created mediation steps');

  console.log('\n🎉 Seed data created successfully!\n');
  console.log('Summary:');
  console.log(`- ${await prisma.conversationThread.count()} conversation threads`);
  console.log(`- ${await prisma.conflictSignal.count()} conflict signals`);
  console.log(`- ${await prisma.mediationCase.count()} mediation cases`);
  console.log(`- ${await prisma.mediationStep.count()} mediation steps`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
