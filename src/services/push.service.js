const webPush = require("web-push");
const prisma = require("../config/prisma");

let configured = false;
async function configure() {
  if (configured) return;
  let config = await prisma.pushConfig.findUnique({ where: { id: 1 } });
  if (!config) {
    const keys = webPush.generateVAPIDKeys();
    config = await prisma.pushConfig.create({ data: { id: 1, publicKey: keys.publicKey, privateKey: keys.privateKey } });
  }
  webPush.setVapidDetails("mailto:support@ideaz.local", config.publicKey, config.privateKey);
  configured = true;
}

async function getPublicKey() { await configure(); return (await prisma.pushConfig.findUnique({ where: { id: 1 } })).publicKey; }
async function subscribe(userId, subscription) {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) throw Object.assign(new Error("Push subscription invalid hai."), { statusCode: 400 });
  return prisma.pushSubscription.upsert({ where: { endpoint: subscription.endpoint }, update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }, create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } });
}
async function unsubscribe(userId, endpoint) { return prisma.pushSubscription.deleteMany({ where: { userId, endpoint } }); }
async function sendToUser(userId, payload) {
  await configure();
  const rows = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(rows.map(async (row) => {
    try { await webPush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 60 }); }
    catch (error) { if (error.statusCode === 404 || error.statusCode === 410) await prisma.pushSubscription.delete({ where: { id: row.id } }).catch(() => {}); }
  }));
}
module.exports = { getPublicKey, subscribe, unsubscribe, sendToUser };
