import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Reset database tables
  await prisma.liveLocation.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.pinnedTask.deleteMany();
  await prisma.message.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  const hashedMockPassword = await bcrypt.hash('password123', 10);

  // 1. Create Mock Users
  const sarah = await prisma.user.create({
    data: {
      username: 'SarahMiller',
      email: 'sarah@example.com',
      passwordHash: hashedMockPassword,
      avatarUrl: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=SarahMiller',
      moodEmoji: '🎧',
      moodText: "listening to 'Low-fi Morning'",
      isAnonymousMode: false,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      username: 'MarcusDesign',
      email: 'marcus@example.com',
      passwordHash: hashedMockPassword,
      avatarUrl: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=MarcusDesign',
      moodEmoji: '☕',
      moodText: 'Coding in Cafe',
      isAnonymousMode: false,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      username: 'AdminAlex',
      email: 'admin@example.com',
      passwordHash: hashedMockPassword,
      avatarUrl: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=AdminAlex',
      moodEmoji: '🚀',
      moodText: 'Launching things',
      isAnonymousMode: false,
    },
  });

  // 2. Create Rooms
  const designRoom = await prisma.room.create({
    data: {
      name: 'Design Collective',
      type: 'group',
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  // 3. Add Members
  await prisma.roomMember.createMany({
    data: [
      { roomId: designRoom.id, userId: adminUser.id, role: 'admin' },
      { roomId: designRoom.id, userId: sarah.id, role: 'member' },
      { roomId: designRoom.id, userId: marcus.id, role: 'member' },
    ],
  });

  // 4. Create Messages
  const msg1 = await prisma.message.create({
    data: {
      roomId: designRoom.id,
      senderId: sarah.id,
      content: 'I think we should lean into the tactile paper feel. It feels more human than just another glass UI.',
      type: 'text',
      isSent: true,
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      roomId: designRoom.id,
      senderId: marcus.id,
      content: "Agreed. Let's try the clay palette for our button elements.",
      type: 'text',
      isSent: true,
    },
  });

  // 5. Create Pinned Task
  await prisma.pinnedTask.create({
    data: {
      messageId: msg1.id,
      roomId: designRoom.id,
      pinnedBy: adminUser.id,
    },
  });

  // 6. Create Poll
  const pollMsg = await prisma.message.create({
    data: {
      roomId: designRoom.id,
      senderId: adminUser.id,
      content: '📊 Poll: Which seed type should we buy for Spring?',
      type: 'poll_ref',
      isSent: true,
    },
  });

  const poll = await prisma.poll.create({
    data: {
      roomId: designRoom.id,
      messageId: pollMsg.id,
      question: 'Which seed type should we buy for Spring?',
      createdBy: adminUser.id,
      options: {
        create: [
          { optionText: 'Lavender 🌱', voteCount: 2 },
          { optionText: 'Sunflower 🌻', voteCount: 1 },
          { optionText: 'Rosemary 🌿', voteCount: 0 },
        ],
      },
    },
    include: { options: true },
  });

  // Create Poll Votes
  await prisma.pollVote.createMany({
    data: [
      { pollId: poll.id, userId: sarah.id, optionId: poll.options[0].id },
      { pollId: poll.id, userId: marcus.id, optionId: poll.options[0].id },
      { pollId: poll.id, userId: adminUser.id, optionId: poll.options[1].id },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
