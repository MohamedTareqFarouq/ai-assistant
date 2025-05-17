import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './VoiceToText.css';
import io from 'socket.io-client';

const WEBHOOK_URL = 'https://casillas.app.n8n.cloud/webhook/037cbcac-3c87-4055-a6d5-20c54f50a62d';
const SOCKET_URL = 'http://localhost:5000';

const VoiceToText = () => {
  // State Management
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  // Speech Recognition Setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Socket Connection Setup
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const handleConnect = () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
      setError(null);
    };

    const handleConnectError = (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server. Retrying...');
      setIsConnected(false);
    };

    const handleMessage = (data) => {
      console.log('📨 Message from n8n:', data.message);
      const messageText = typeof data.message === 'string' 
        ? data.message 
        : JSON.stringify(data.message, null, 2);

      // Format and add the AI response
      const formattedMessage = `\n\n🤖 AI: ${messageText}`;
      setReceivedMessages(prev => [...prev, messageText]);
      setTypedText(prev => prev + formattedMessage);

      // Auto-speak if enabled
      if (autoSpeak && !isSpeaking) {
        handleSpeak(messageText, true);
      }
    };

    const handleDisconnect = () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    };

    // Socket event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('connect_error', handleConnectError);
    newSocket.on('n8n-message', handleMessage);
    newSocket.on('disconnect', handleDisconnect);

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.off('connect', handleConnect);
        newSocket.off('connect_error', handleConnectError);
        newSocket.off('n8n-message', handleMessage);
        newSocket.off('disconnect', handleDisconnect);
        newSocket.disconnect();
      }
    };
  }, [autoSpeak, isSpeaking]);

  // Voice Setup
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Select default voice (prefer English)
      const defaultVoice = availableVoices.find(voice => voice.lang.startsWith('en-')) || availableVoices[0];
      setSelectedVoice(defaultVoice);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Handlers
  const handleSpeak = async (text, isAiResponse = false) => {
    if (!text.trim()) {
      setError('Please enter some text to speak');
      return;
    }

    // Prevent double submission
    if (isProcessing || isSpeaking) {
      console.log('Request already in progress');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null); // Clear any previous errors
      
      // Only send to n8n if it's user input
      if (!isAiResponse) {
        const userMessage = `\n\n👤 You: ${text}`;
        setTypedText(prev => prev + userMessage);
        
        // Create an AbortController for the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
          await axios.post(WEBHOOK_URL, { body: text }, {
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          clearTimeout(timeoutId);
          return; // Don't speak the user's input text
        } catch (error) {
          if (error.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else if (error.response) {
            setError(`Server error: ${error.response.data.message || 'Unknown error'}`);
          } else if (error.request) {
            setError('Network error. Please check your connection.');
          } else {
            setError('Failed to send message. Please try again.');
          }
          setIsProcessing(false);
          return;
        }
      }

      // Only speak if it's an AI response
      if (isAiResponse) {
        setIsSpeaking(true);
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        
        const speech = new SpeechSynthesisUtterance(text);
        speech.voice = selectedVoice;
        speech.rate = 1;
        speech.pitch = 1;

        speech.onend = () => {
          setIsSpeaking(false);
          setIsProcessing(false);
        };

        speech.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setError(`Speech synthesis error: ${event.error}`);
          setIsSpeaking(false);
          setIsProcessing(false);
        };

        window.speechSynthesis.speak(speech);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Operation error:', err);
      setError('Failed to process the request. Please try again.');
      setIsSpeaking(false);
      setIsProcessing(false);
    }
  };

  const handleStartListening = useCallback(() => {
    try {
      setError(null);
      if (!listening) {
        SpeechRecognition.startListening({ continuous: true });
      } else {
        SpeechRecognition.stopListening();
      }
    } catch (err) {
      setError('Failed to access microphone. Please check your permissions.');
      console.error('Speech recognition error:', err);
    }
  }, [listening]);

  const handleClearAll = useCallback(() => {
    setTypedText('');
    setReceivedMessages([]);
    resetTranscript();
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsProcessing(false);
    setError(null);
  }, [resetTranscript]);

  const handleConnectionToggle = useCallback(() => {
    if (socket) {
      if (isConnected) {
        socket.disconnect();
      } else {
        socket.connect();
      }
    }
  }, [socket, isConnected]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="error-container">
        <h2>⚠️ Browser Support Error</h2>
        <p>Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  return (
    <div className="voice-container">
      <header className="app-header">
        <div className="header-content">
          <h1>AI Voice Assistant</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
            <button 
              onClick={handleConnectionToggle}
              className={`connection-toggle ${isConnected ? 'disconnect' : 'connect'}`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="close-button">
              ✕
            </button>
          </div>
        )}
      </header>

      <main className="app-content">
        <section className="conversation-section">
          <div className="section-header">
            <h2>Conversation</h2>
            <div className="voice-controls">
              <select
                className="voice-select"
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = voices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice);
                }}
              >
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              
              <label className="auto-speak-toggle">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                />
                <span>Auto-Speak Responses</span>
              </label>
            </div>
          </div>

          <div className="conversation-container">
            <textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your message here or use voice input..."
              className="conversation-input"
              disabled={isSpeaking || isProcessing}
            />

            <div className="action-buttons">
              <button
                onClick={() => handleSpeak(typedText)}
                className={`action-button primary ${isSpeaking ? 'speaking' : ''}`}
                disabled={!typedText || isSpeaking || isProcessing}
              >
                {isProcessing ? (
                  <>🔄 Processing...</>
                ) : isSpeaking ? (
                  <>🔊 Speaking...</>
                ) : (
                  <>📤 Send Message</>
                )}
              </button>

              <button
                onClick={handleClearAll}
                className="action-button secondary"
                disabled={(!typedText && !transcript) || isSpeaking || isProcessing}
              >
                🗑️ Clear Chat
              </button>
            </div>
          </div>
        </section>

        <section className="voice-input-section">
          <h2>Voice Input</h2>
          <div className="voice-input-controls">
            <button
              onClick={handleStartListening}
              className={`action-button ${listening ? 'recording primary' : 'secondary'}`}
              disabled={isSpeaking || isProcessing}
            >
              {listening ? (
                <>
                  <span className="recording-indicator" />
                  🎤 Stop Recording
                </>
              ) : (
                <>🎙️ Start Recording</>
              )}
            </button>

            {transcript && (
              <div className="transcript-preview">
                <h3>Current Recording</h3>
                <p>{transcript}</p>
                <div className="transcript-actions">
                  <button
                    onClick={() => {
                      handleSpeak(transcript);
                      resetTranscript();
                    }}
                    className="action-button primary"
                    disabled={isSpeaking || isProcessing}
                  >
                    {isProcessing ? (
                      <>🔄 Processing...</>
                    ) : (
                      <>📤 Send Recording</>
                    )}
                  </button>
                  <button
                    onClick={resetTranscript}
                    className="action-button secondary"
                  >
                    🗑️ Clear Recording
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default VoiceToText;
