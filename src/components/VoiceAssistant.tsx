import React, { useState, useEffect, useRef } from 'react';

const VoiceAssistant: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    // Check if browser supports SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    
    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev: string) => prev + transcript + ' ');
          // Check for keywords to scroll to sections
          checkForKeywords(transcript);
        } else {
          interimTranscript += transcript;
        }
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current.onsoundstart = () => {
      // Start volume animation
      animateVolume();
    };
    
    recognitionRef.current.onsoundend = () => {
      // Stop volume animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setVolume(0);
    };
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const animateVolume = () => {
    // Simulate volume changes for visual feedback
    const newVolume = Math.min(100, Math.max(0, volume + (Math.random() * 20 - 5)));
    setVolume(newVolume);
    animationRef.current = requestAnimationFrame(animateVolume);
  };

  const checkForKeywords = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('draft email') || lowerText.includes('email draft')) {
      scrollToSection('email');
    } else if (lowerText.includes('resume format') || lowerText.includes('format resume')) {
      scrollToSection('resume');
    } else if (lowerText.includes('boolean') || lowerText.includes('skill extract')) {
      scrollToSection('boolean');
    } else if (lowerText.includes('notes') || lowerText.includes('quick notes')) {
      scrollToSection('notes');
    } else if (lowerText.includes('resume match') || lowerText.includes('match resume')) {
      scrollToSection('matcher');
    } else if (lowerText.includes('dashboard') || lowerText.includes('home')) {
      scrollToSection('dashboard');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleListening = () => {
    if (!isSupported) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setVolume(0);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return (
      <div className="fixed bottom-6 right-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg max-w-xs z-30">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium">Voice Assistant Not Supported</p>
            <p className="text-xs mt-1">Try using Chrome, Edge, or Safari</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Voice Assistant Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          className={`flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
          }`}
          onClick={toggleListening}
          aria-label={isListening ? "Stop listening" : "Start voice assistant"}
        >
          <svg 
            className="h-7 w-7 text-white" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
          {isListening && (
            <span className="text-xs text-white font-medium mt-0.5">Listening</span>
          )}
        </button>
        
        {/* Volume Visualization */}
        {isListening && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex items-end justify-center h-12 gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-2 bg-white rounded-t transition-all duration-150"
                style={{ 
                  height: `${Math.min(100, volume + (i * 10))}%`,
                  opacity: volume > 0 ? 0.8 : 0.3
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Transcript Panel */}
      {transcript && (
        <div className="fixed bottom-24 right-6 bg-white border border-gray-200 rounded-2xl shadow-xl p-5 max-w-md z-20 animate-fade-in">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <h3 className="font-bold text-gray-800">Voice Assistant</h3>
            </div>
            <button 
              type="button" 
              className="text-gray-400 hover:text-gray-500 transition-colors"
              onClick={() => setTranscript('')}
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{transcript}</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Try saying: "Go to dashboard", "Open email drafter", etc.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;