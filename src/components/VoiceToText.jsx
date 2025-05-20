import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './VoiceToText.css';
import io from 'socket.io-client';

const WEBHOOK_URL = 'https://casillas.app.n8n.cloud/webhook/037cbcac-3c87-4055-a6d5-20c54f50a62d';
const SOCKET_URL = 'http://localhost:5000';

const VoiceToText = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('n8n-message', handleAIResponse);
    
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const handleAIResponse = useCallback((data) => {
    const messageText = typeof data.message === 'string' 
      ? data.message 
      : JSON.stringify(data.message, null, 2);

    addMessage('ai', messageText);
  }, []);

  const handleSendMessage = async (text) => {
    if (!text.trim() || isProcessing) return;

    try {
      setIsProcessing(true);
      addMessage('user', text);
      
      await axios.post(WEBHOOK_URL, { body: text }, {
        headers: { 'Content-Type': 'application/json' }
      });

      setInputText('');
    } catch (error) {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceInput = useCallback(() => {
    if (!listening) {
      SpeechRecognition.startListening({ continuous: true });
    } else {
      SpeechRecognition.stopListening();
      if (transcript.trim()) {
        handleSendMessage(transcript);
      }
      resetTranscript();
    }
  }, [listening, transcript]);

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      text,
      time: new Date().toLocaleTimeString()
    }]);
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="error-screen">
        <p>Browser doesn't support speech recognition. Please use Chrome or Edge.</p>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <header className="chat-header">
        <h1>AI Assistant</h1>
        <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      <main className="chat-main">
        <div className="messages">
          {messages.map(({ id, sender, text, time }) => (
            <div key={id} className={`message ${sender}`}>
              <p>{text}</p>
              <time>{time}</time>
            </div>
          ))}
        </div>

        <div className="input-area">
          {error && <div className="error">{error}</div>}
          
          <div className="input-container">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }
              }}
              placeholder="Type a message..."
              disabled={isProcessing}
            />
            
            <div className="actions">
              <button
                onClick={handleVoiceInput}
                className={`voice ${listening ? 'active' : ''}`}
                disabled={isProcessing}
              >
                <i className={`fas ${listening ? 'fa-stop' : 'fa-microphone'}`} />
              </button>

              <button
                onClick={() => handleSendMessage(inputText)}
                className="send"
                disabled={(!inputText.trim() && !transcript) || isProcessing}
              >
                <i className="fas fa-paper-plane" />
              </button>
            </div>
          </div>

          {transcript && (
            <div className="transcript">
              {transcript}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VoiceToText;
