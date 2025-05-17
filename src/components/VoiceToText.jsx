import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './VoiceToText.css';
import io from 'socket.io-client';

const VoiceToText = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server. Retrying...');
      setIsConnected(false);
    });

    newSocket.on('n8n-message', (data) => {
      console.log('📨 Message from n8n:', data.message);
      const messageText = typeof data.message === 'string' ? data.message : JSON.stringify(data.message, null, 2);
      setReceivedMessages(prev => [...prev, messageText]);
      setTypedText(prev => {
        const newText = prev ? `${prev}\n${messageText}` : messageText;
        return newText;
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        newSocket.removeAllListeners();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      setSelectedVoice(availableVoices[0]);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (autoSpeak && typedText && !isSpeaking) {
      const timeoutId = setTimeout(() => {
        handleSpeak(typedText);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [typedText, autoSpeak]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="error-container">
        <h2>⚠️ Browser Support Error</h2>
        <p>Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  const handleSpeak = async (text) => {
    if (!text.trim()) {
      setError('No text to speak');
      return;
    }

    try {
      setIsSpeaking(true);
      
      // Send to n8n first
      await axios.post(`https://to7a2.app.n8n.cloud/webhook/037cbcac-3c87-4055-a6d5-20c54f50a62d`, {
        body: text
      });

      // Then handle speech synthesis
      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(text);
      speech.voice = selectedVoice;
      speech.rate = 1;
      speech.pitch = 1;

      speech.onend = () => setIsSpeaking(false);
      speech.onerror = (event) => {
        setError('Error speaking text: ' + event.error);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(speech);
    } catch (err) {
      setError('Failed to initialize speech synthesis');
      console.error('Speech synthesis error:', err);
      setIsSpeaking(false);
    }
  };

  const handleStartListening = () => {
    try {
      setError(null);
      if (!listening) {
        SpeechRecognition.startListening({ continuous: true });
      } else {
        SpeechRecognition.stopListening();
      }
    } catch (err) {
      setError('Error accessing microphone');
      console.error('Speech recognition error:', err);
    }
  };

  const handleTextChange = (e) => {
    setTypedText(e.target.value);
  };

  const handleDisconnect = () => {
    if (socket) {
      socket.disconnect();
      setIsConnected(false);
    }
  };

  const handleReconnect = () => {
    if (socket) {
      socket.connect();
    }
  };

  return (
    <div className="voice-container">
      <div className="header">
        <h2>Professional Voice Assistant</h2>
        <div className="connection-controls">
          <button onClick={handleDisconnect} className="control-button" disabled={!isConnected}>
            {isConnected ? 'Disconnect' : 'Disconnected'}
          </button>
          {!isConnected && (
            <button onClick={handleReconnect} className="control-button">
              Reconnect
            </button>
          )}
        </div>
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="close-button">✕</button>
          </div>
        )}
      </div>

      <div className="text-input-container">
        <div className="input-header">
          <h3>Type or Paste Text</h3>
          <label className="auto-speak-toggle">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
            />
            Auto-Speak
          </label>
        </div>
        <textarea
          value={typedText}
          onChange={handleTextChange}
          placeholder="Type or paste text here... Messages from n8n will also appear here"
          className="text-input"
        />
        <div className="button-group">
          <button 
            onClick={() => handleSpeak(typedText)}
            className={`control-button speak ${isSpeaking ? 'speaking' : ''}`}
            disabled={!typedText || isSpeaking}
          >
            {isSpeaking ? 'Speaking...' : 'Speak Text'}
          </button>
          <button
            onClick={() => setTypedText('')}
            className="control-button clear"
            disabled={!typedText}
          >
            Clear Text
          </button>
        </div>
      </div>

      <div className="divider"><span>OR</span></div>

      <div className="controls">
        <button
          onClick={handleStartListening}
          className={`control-button ${listening ? 'recording' : ''}`}
        >
          {listening ? <><span className="pulse-dot"></span>Stop Recording</> : 'Start Recording'}
        </button>

        <button
          onClick={resetTranscript}
          className="control-button clear"
          disabled={!transcript}
        >
          Clear Text
        </button>

        <button
          onClick={() => handleSpeak(transcript)}
          className={`control-button speak ${isSpeaking ? 'speaking' : ''}`}
          disabled={!transcript || isSpeaking}
        >
          {isSpeaking ? 'Speaking...' : 'Speak Recorded Text'}
        </button>
      </div>

      <div className="voice-settings">
        <label htmlFor="voice-select">Voice:</label>
        <select
          id="voice-select"
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
      </div>

      <div className="transcript-container">
        <h3>Recorded Speech</h3>
        <div className="transcript-box">
          {transcript || (
            <span className="placeholder">
              {listening ? 'Listening...' : 'Click "Start Recording" to begin'}
            </span>
          )}
        </div>
      </div>

      <div className="message-log">
        <h3>Incoming Messages (from n8n)</h3>
        <div className="message-log-box">
          {receivedMessages.length === 0 && <p>No messages yet.</p>}
          {receivedMessages.map((msg, idx) => (
            <pre key={idx} className="message-item">{msg}</pre>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceToText;
