const { sendNotification } = require('./config/firebase-notification');

async function sendHiMessage() {
  const fcmToken = 'fd21a_QpQ_GQreORWs9mH3:APA91bH3NX9nmGaxjsEKqUt5Sr7TyFGz9sWoV9sBrTbqRWdcl-bgCckYQTlIMZBJOBni0FTmfDKvlIU099S2j5yCV8Dz5VcBV7Pg1UUSqFJQ7nVi3nOh8F8';
  
  try {
    console.log('Sending "hi" message to FCM token...');
    const result = await sendNotification(
      fcmToken,
      'Test Notification',
      'Hi!',
      {
        type: 'test',
        timestamp: Date.now().toString()
      }
    );
    
    console.log('Notification sent successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.responses) {
      result.responses.forEach((response, index) => {
        if (response.success) {
          console.log(`✓ Message sent successfully to token ${index + 1}`);
        } else {
          console.error(`✗ Failed to send to token ${index + 1}:`, response.error);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error sending notification:', error);
    process.exit(1);
  }
}

sendHiMessage();
