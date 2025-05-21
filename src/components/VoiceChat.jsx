import React, { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import axios from 'axios';
import './VoiceChat.css';

const WEBHOOK_URL = 'https://casillas.app.n8n.cloud/webhook/037cbcac-3c87-4055-a6d5-20c54f50a62d';
const POLLING_INTERVAL = 2000; // 2 seconds

const VoiceChat = ({ onSwitchMode }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // Default to true for polling
  const [messages, setMessages] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(0);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  const voices = useRef([]);
  const pollingRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    const synthesis = speechSynthesisRef.current;
    
    const loadVoices = () => {
      voices.current = synthesis.getVoices();
    };

    loadVoices();
    if (synthesis.onvoiceschanged !== undefined) {
      synthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthesis.speaking) {
        synthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text) => {
    if (speechSynthesisRef.current.speaking) {
      speechSynthesisRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const englishVoice = voices.current.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Male')
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (!listening && !isProcessing) {
        SpeechRecognition.startListening({ continuous: true });
      }
    };

    speechSynthesisRef.current.speak(utterance);
  }, [isProcessing, listening]);

  // Handler for new AI messages
  const handleAIResponse = useCallback((data) => {
    const messageText = typeof data.content === 'string' 
      ? data.content 
      : JSON.stringify(data.content, null, 2);

    addMessage('ai', messageText);
    speak(messageText);
  }, [speak]);

  // Setup polling mechanism for messages
  useEffect(() => {
    // Function to poll for new messages
    const pollMessages = async () => {
      try {
        const apiUrl = process.env.NODE_ENV === 'production'
          ? `${window.location.origin}/api/messages?since=${lastMessageTimestamp}`
          : `http://localhost:3000/api/messages?since=${lastMessageTimestamp}`;
          
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        // Handle any new messages
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(message => {
            handleAIResponse(message);
          });
          
          // Update the last message timestamp
          setLastMessageTimestamp(data.lastTimestamp);
        }
        
        // Set as connected since polling succeeded
        setIsConnected(true);
      } catch (error) {
        console.error('Error polling for messages:', error);
        setIsConnected(false);
      }
    };
    
    // Start polling
    pollingRef.current = setInterval(pollMessages, POLLING_INTERVAL);
    
    // Initial poll
    pollMessages();
    
    // Cleanup interval on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [lastMessageTimestamp, handleAIResponse]);

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const handleSendMessage = useCallback(async (text) => {
    if (!text.trim() || isProcessing) return;

    try {
      setIsProcessing(true);
      if (listening) {
        SpeechRecognition.stopListening();
      }
      
      addMessage('user', text);
      resetTranscript();
      
      await axios.post(WEBHOOK_URL, { body: text }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      if (!listening && !speechSynthesisRef.current.speaking) {
        SpeechRecognition.startListening({ continuous: true });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, listening, resetTranscript]);

  useEffect(() => {
    let timeout;
    if (transcript && !isProcessing && !isSpeaking) {
      timeout = setTimeout(() => {
        handleSendMessage(transcript);
      }, 1500);
    }

    return () => clearTimeout(timeout);
  }, [transcript, isProcessing, isSpeaking, handleSendMessage]);

  useEffect(() => {
    if (!listening && !isProcessing && !isSpeaking) {
      SpeechRecognition.startListening({ continuous: true });
    }
  }, [listening, isProcessing, isSpeaking]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="error-screen">
        <p>Browser doesn't support speech recognition. Please use Chrome or Edge.</p>
      </div>
    );
  }

  return (
    <div className="voice-chat">
      <header className="voice-chat-header">
        <button 
          className="mode-switch" 
          onClick={onSwitchMode}
          title="Switch to text mode"
        >
          <i className="fas fa-keyboard" />
        </button>
        <h1>Voice Chat</h1>
        <div className="status-indicators">
          <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className={`voice-status ${listening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
            {isSpeaking ? 'AI Speaking' : (listening ? 'Listening...' : 'Click to start')}
          </div>
        </div>
      </header>

      <main className="voice-chat-main">
        <div className="messages">
          {messages.map(({ id, sender, text, time }) => (
            <div key={id} className={`message ${sender}`}>
              <p>{text}</p>
              <time>{time}</time>
            </div>
          ))}
          {isProcessing && (
            <div className="message ai typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="voice-controls">
          <div className="voice-indicator">
            {transcript && <p className="transcript">{transcript}</p>}
            <div className="status-text">
              {isProcessing ? 'Processing...' : 
               isSpeaking ? 'AI is speaking...' : 
               listening ? 'Listening...' : 'Click microphone to start'}
            </div>
          </div>
          
          <button
            className={`voice-button ${listening ? 'active' : ''} ${isSpeaking ? 'speaking' : ''}`}
            onClick={() => {
              if (isSpeaking) {
                speechSynthesisRef.current.cancel();
                setIsSpeaking(false);
              } else if (listening) {
                SpeechRecognition.stopListening();
              } else {
                SpeechRecognition.startListening({ continuous: true });
              }
            }}
            disabled={isProcessing}
          >
            <i className={`fas ${isSpeaking ? 'fa-volume-up' : (listening ? 'fa-stop' : 'fa-microphone')}`} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default VoiceChat;