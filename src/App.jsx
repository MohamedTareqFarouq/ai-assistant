import React, { useEffect } from 'react';
import VoiceToText from './components/VoiceToText';
import { initSocket } from './utils/socketInit';
import './App.css';

const App = () => {
  useEffect(() => {
    // Initialize the socket when the app starts
    const setupSocket = async () => {
      try {
        await initSocket();
        console.log('Socket connection initialized successfully');
      } catch (error) {
        console.error('Socket initialization failed:', error);
      }
    };
    
    setupSocket();
  }, []);

  return (
    <div className="App">
      <VoiceToText />
    </div>
  );
};

export default App;