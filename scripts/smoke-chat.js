const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

async function ensureDemoUsers() {
  const users = [
    { username: 'demo', fullName: 'Demo User', password: 'demo123', pin: '123456' },
    { username: 'demo2', fullName: 'Demo User 2', password: 'demo123', pin: '654321' },
  ];

  for (const payload of users) {
    const existing = await prisma.user.findUnique({ where: { username: payload.username } });
    if (existing) {
      continue;
    }

    const hashedPassword = await bcrypt.hash(payload.password, 12);
    const hashedPin = await bcrypt.hash(payload.pin, 12);

    await prisma.user.create({
      data: {
        username: payload.username,
        fullName: payload.fullName,
        password: hashedPassword,
        pin: hashedPin,
        about: 'Demo account',
      },
    });
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  const text = await res.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: res.status, body };
}

async function main() {
  await ensureDemoUsers();

  const health = await request('/health');
  if (health.status !== 200) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }

  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'demo', password: 'demo123' }),
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
  }

  const token = loginRes.body?.data?.accessToken;
  if (!token) {
    throw new Error(`No token returned: ${JSON.stringify(loginRes)}`);
  }

  const searchRes = await request(`/api/users/search?q=${encodeURIComponent('demo2')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.status !== 200) {
    throw new Error(`Search failed: ${JSON.stringify(searchRes)}`);
  }

  const otherUser = searchRes.body?.data?.users?.[0];
  if (!otherUser) {
    throw new Error(`No user found for demo2: ${JSON.stringify(searchRes)}`);
  }

  const conversationRes = await request('/api/conversations/direct', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: otherUser.id }),
  });

  if (conversationRes.status !== 200) {
    throw new Error(`Conversation creation failed: ${JSON.stringify(conversationRes)}`);
  }

  const messagesRes = await request('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ receiverId: otherUser.id, text: 'Hello from smoke test' }),
  });

  if (messagesRes.status !== 201) {
    throw new Error(`Send message failed: ${JSON.stringify(messagesRes)}`);
  }

  const historyRes = await request(`/api/messages/user/${encodeURIComponent(otherUser.id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (historyRes.status !== 200) {
    throw new Error(`History failed: ${JSON.stringify(historyRes)}`);
  }

  const savedMessage = historyRes.body?.data?.messages?.find((message) => message.text === 'Hello from smoke test');
  if (!savedMessage) {
    throw new Error(`Message not persisted: ${JSON.stringify(historyRes)}`);
  }

  console.log('SMOKE_OK');
  console.log(JSON.stringify({
    health: health.body,
    login: loginRes.body?.message,
    conversation: conversationRes.body?.data?.conversation?.id,
    messageId: savedMessage.id,
  }, null, 2));
}

main().catch((error) => {
  console.error('SMOKE_FAIL');
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
