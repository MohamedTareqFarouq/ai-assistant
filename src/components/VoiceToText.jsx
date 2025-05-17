import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './VoiceToText.css';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const VoiceToText =  () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // const [messages, setMessages] = useState([]);
  useEffect(() => {
    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
    });

    socket.on('n8n-message', (data) => {
      console.log('📨 Message from n8n:', data);
      setTypedText(prev => prev + '\n' + JSON.stringify(data, null, 2)); // ✅
    });
    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
  const {
    transcript,   
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();


  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      setSelectedVoice(availableVoices[0]); // Default to first voice
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      window.speechSynthesis.cancel(); // Cleanup
    };
  }, []);

  // Auto-speak effect when typing
  useEffect(() => {
    if (autoSpeak && typedText && !isSpeaking) {
      const timeoutId = setTimeout(() => {
        speakText(typedText);
      }, 1000); // Wait 1 second after typing stops before speaking

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

  const speakText = async (text) => {
    try {
      if (!text.trim()) {
        setError('No text to speak');
        return;
      }

      const response = await axios.post(`https://to7a2.app.n8n.cloud/webhook/037cbcac-3c87-4055-a6d5-20c54f50a62d`, {
        body: text
    })
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(text);
      speech.voice = selectedVoice;
      speech.rate = 1;
      speech.pitch = 1;

      speech.onstart = () => setIsSpeaking(true);
      speech.onend = () => setIsSpeaking(false);
      speech.onerror = (event) => {
        setError('Error speaking text: ' + event.error);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(speech);
    } catch (err) {
      setError('Failed to initialize speech synthesis');
      console.error('Speech synthesis error:', err);
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
    socket.disconnect();
    setIsConnected(false);
  };

  return (
    <div className="voice-container">
      <div className="header">
        <h2>Professional Voice Assistant</h2>
        <button 
          onClick={handleDisconnect}
          className="control-button"
          disabled={!isConnected}
        >
          {isConnected ? 'Disconnect' : 'Disconnected'}
        </button>
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="close-button">
              ✕
            </button>
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
          placeholder="Type or paste text here..."
          className="text-input"
        />
        <button 
          onClick={() => speakText(typedText)}
          className={`control-button speak ${isSpeaking ? 'speaking' : ''}`}
          disabled={!typedText || isSpeaking}
        >
          {isSpeaking ? 'Speaking...' : 'Speak Typed Text'}
        </button>
      </div>

      <div className="divider">
        <span>OR</span>
      </div>

      <div className="controls">
        <button 
          onClick={handleStartListening}
          className={`control-button ${listening ? 'recording' : ''}`}
        >
          {listening ? (
            <>
              <span className="pulse-dot"></span>
              Stop Recording
            </>
          ) : (
            'Start Recording'
          )}
        </button>

        <button 
          onClick={resetTranscript}
          className="control-button clear"
          disabled={!transcript}
        >
          Clear Text
        </button>

        <button 
          onClick={() => speakText(transcript)}
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
    </div>
  );
};

export default VoiceToText; 