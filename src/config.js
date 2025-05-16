// Configuration for the AI Assistant
const N8N_WEBHOOK_URL = 'https://casillas.app.n8n.cloud/webhook/voice-input';

// Validate the webhook URL
if (!N8N_WEBHOOK_URL) {
  console.error('N8N webhook URL is not configured!');
}

export const config = {
  n8n: {
    webhookUrl: N8N_WEBHOOK_URL,
    isConfigured: !!N8N_WEBHOOK_URL
  },
  speech: {
    language: 'en-US',
    continuous: true,
    interimResults: true
  }
}; 