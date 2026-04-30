const admin = require('firebase-admin');

let app = null;
let messaging = null;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    app = admin.apps[0];
    messaging = app.messaging();
    return;
  }

  const serviceAccount = require('./firebase.json');

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  messaging = app.messaging();
}

initializeFirebase();

async function sendNotification(tokens, title, body, data = {}) {
  if (!messaging) {
    throw new Error('Firebase not initialized');
  }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens: Array.isArray(tokens) ? tokens : [tokens],
  };

  return messaging.sendEachForMulticast(message);
}

async function sendToTopic(topic, title, body, data = {}) {
  if (!messaging) {
    throw new Error('Firebase not initialized');
  }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    topic,
  };

  return messaging.send(message);
}

module.exports = { sendNotification, sendToTopic, messaging };