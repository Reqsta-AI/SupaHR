import React, { useState, useEffect, useRef } from 'react';

// Define the interface for the API response
interface OrganizedNote {
  _id: string;
  noteType: string;
  summary: string;
  entities: {
    candidates: string[];
    colleagues: string[];
    roles: string[];
    companies: string[];
  };
  tasks: string[];
  priority: string;
  tags: string[];
  createdAt: string;
  originalNote: string;
}

// Define props interface
interface SmartOrganizerProps {
  userId: string | null;
  triggerRefresh?: () => void; // Add optional triggerRefresh prop
}

const SmartOrganizer: React.FC<SmartOrganizerProps> = ({ userId, triggerRefresh }) => {
  // Form state
  const [noteInput, setNoteInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [aiOutput, setAiOutput] = useState<OrganizedNote | null>(null);
  const [history, setHistory] = useState<OrganizedNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load history from backend API on component mount
  useEffect(() => {
    fetchHistory();
    
    // Initialize speech recognition
    initializeSpeechRecognition();
    
    return () => {
      // Clean up recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [userId]);

  // Initialize speech recognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        
        setInterimTranscript(interim);
        
        if (finalTranscript) {
          setNoteInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
          setInterimTranscript('');
        }
        
        // Reset silence timeout when we get results
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Set a new timeout to stop recognition after 1.5 seconds of silence
        if (isListening) {
          silenceTimeoutRef.current = setTimeout(() => {
            if (isListening) {
              stopListening();
            }
          }, 1500);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError('Speech recognition error: ' + event.error);
        stopListening();
      };
      
      recognition.onend = () => {
        // Only restart if we're still supposed to be listening
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {
            console.error('Error restarting recognition', e);
            stopListening();
          }
        }
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
      setError('Speech recognition is not supported in your browser');
    }
  };

  // Start voice recognition
  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in your browser');
      return;
    }
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setInterimTranscript('');
      setError('');
      
      // Set initial silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      silenceTimeoutRef.current = setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, 1500);
    } catch (err) {
      console.error('Error starting speech recognition', err);
      setError('Failed to start voice recognition');
      setIsListening(false);
    }
  };

  // Stop voice recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition', e);
      }
    }
    
    setIsListening(false);
    setInterimTranscript('');
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      // Only clear input if it's empty or we want to start fresh
      startListening();
    }
  };

  // Fetch all organized notes from backend
  const fetchHistory = async () => {
    if (!userId) {
      setHistory([]);
      return;
    }
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/notes?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setHistory(data);
        // Also save to localStorage as backup
        localStorage.setItem('smartOrganizerHistory', JSON.stringify(data));
      } else {
        // Fallback to localStorage if API fails
        const savedHistory = localStorage.getItem('smartOrganizerHistory');
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
      }
    } catch (err) {
      console.error('Failed to fetch history from API:', err);
      // Fallback to localStorage
      const savedHistory = localStorage.getItem('smartOrganizerHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a specific note by ID
  const loadNote = async (id: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/notes/${id}?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setAiOutput(data);
        setNoteInput(data.originalNote);
      } else {
        setError(data.message || 'Failed to load note');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error loading note:', err);
    }
  };

  // Delete a specific note by ID
  const deleteNote = async (id: string) => {
    if (!userId) return;
    
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/notes/${id}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from history
        setHistory(prev => prev.filter(note => note._id !== id));
        // If the deleted note is currently displayed, clear it
        if (aiOutput && aiOutput._id === id) {
          setAiOutput(null);
        }
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete note');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error deleting note:', err);
    }
  };

  // Organize the note using AI
  const organizeNote = async () => {
    if (!noteInput.trim() || !userId) return;
    
    // Stop voice recognition when processing note
    if (isListening) {
      stopListening();
    }
    
    setIsProcessing(true);
    setProcessingStep(0);
    setError('');
    setAiOutput(null);
    
    // Simulate processing steps
    const stepInterval = setInterval(() => {
      setProcessingStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 500);
    
    // Retry logic
    let retries = 0;
    const maxRetries = 1;
    
    while (retries <= maxRetries) {
      try {
        const response = await fetch('https://ai-nuto.vercel.app/api/organize-notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: noteInput, userId }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setAiOutput(data);
          // Add to history
          setHistory(prev => [data, ...prev]);
          
          // Clear input after successful processing
          setNoteInput('');
          setInterimTranscript('');
          
          // Call triggerRefresh if provided
          if (triggerRefresh) {
            triggerRefresh();
          }
          
          clearInterval(stepInterval);
          setIsProcessing(false);
          return; // Success, exit retry loop
        } else {
          if (retries < maxRetries) {
            retries++;
            console.log(`API request failed, retrying... (${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
          }
          setError(data.message || 'Failed to organize note');
          clearInterval(stepInterval);
          setIsProcessing(false);
          return;
        }
      } catch (err) {
        if (retries < maxRetries) {
          retries++;
          console.log(`API request failed, retrying... (${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          continue;
        }
        setError('Failed to connect to the server. Please make sure the backend is running.');
        console.error('Error organizing note:', err);
        clearInterval(stepInterval);
        setIsProcessing(false);
        return;
      }
    }
  };

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('hiring') || lowerTag.includes('interview')) return 'bg-indigo-100 text-indigo-800';
    if (lowerTag.includes('follow')) return 'bg-blue-100 text-blue-800';
    if (lowerTag.includes('salary') || lowerTag.includes('negotiation')) return 'bg-green-100 text-green-800';
    if (lowerTag.includes('review') || lowerTag.includes('feedback')) return 'bg-purple-100 text-purple-800';
    if (lowerTag.includes('urgent') || lowerTag.includes('high')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [noteInput]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <span className="mr-2 sm:mr-3">🧠</span> Smart Organizer
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">AI-powered note organization and insights</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="flex flex-col">
          <div className="mb-4 sm:mb-6 relative">
            <label htmlFor="noteInput" className="block text-base sm:text-lg font-medium text-gray-800 mb-2 sm:mb-3">
              Your Note
            </label>
            <textarea
              ref={textareaRef}
              id="noteInput"
              rows={4}
              className="w-full px-3 py-2 sm:px-5 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm resize-none"
              placeholder="e.g., Interview with John Doe for Software Engineer position. Candidate has 5 years of experience with React and Node.js. Strong communication skills. Follow up next week."
              value={noteInput}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteInput(e.target.value)}
              disabled={!userId}
            />
            {/* Live Transcript Overlay */}
            {isListening && interimTranscript && (
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 shadow-md">
                <div className="text-blue-800 font-medium text-sm sm:text-base">Listening...</div>
                <div className="text-blue-600 text-sm">{interimTranscript}</div>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={`flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                isListening 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              onClick={toggleVoiceRecognition}
              disabled={!userId}
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 ${isListening ? 'text-blue-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="whitespace-nowrap">{isListening ? 'Stop Listening' : 'Voice Input'}</span>
            </button>
            
            <button
              type="button"
              disabled={!noteInput.trim() || isProcessing || !userId}
              className={`flex-1 py-3 px-4 sm:py-4 sm:px-6 rounded-xl sm:rounded-2xl font-bold text-white text-base sm:text-lg shadow-lg sm:shadow-xl transition-all duration-300 flex items-center justify-center ${
                !noteInput.trim() || isProcessing || !userId
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl transform hover:-translate-y-0.5'
              }`}
              onClick={organizeNote}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-6 sm:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm sm:text-base">
                    {processingStep === 0 && 'Analyzing...'}
                    {processingStep === 1 && 'Extracting entities...'}
                    {processingStep === 2 && 'Categorizing...'}
                    {processingStep === 3 && 'Prioritizing...'}
                    {processingStep === 4 && 'Finalizing...'}
                  </span>
                </>
              ) : (
                'Organize Note'
              )}
            </button>
          </div>
          
          {!userId && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl text-yellow-700 text-sm sm:text-base">
              <p className="font-medium">Authentication Required:</p>
              <p>Please sign in to use the smart organizer feature.</p>
            </div>
          )}
          
          {error && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-red-700 text-sm sm:text-base">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl h-full p-4 sm:p-6 border-2 border-dashed border-gray-300">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
              <span className="mr-2">👁️</span> Preview
            </h3>
            {aiOutput ? (
              <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-5 h-[300px] sm:h-[400px] overflow-y-auto shadow-inner">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Summary</h4>
                    <p className="text-gray-700 text-sm sm:text-base">{aiOutput.summary}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Entities</h4>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div>
                        <h5 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Candidates</h5>
                        <div className="flex flex-wrap gap-1">
                          {aiOutput.entities.candidates.map((candidate, index) => (
                            <span key={index} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                              {candidate}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Colleagues</h5>
                        <div className="flex flex-wrap gap-1">
                          {aiOutput.entities.colleagues.map((colleague, index) => (
                            <span key={index} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                              {colleague}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Roles</h5>
                        <div className="flex flex-wrap gap-1">
                          {aiOutput.entities.roles.map((role, index) => (
                            <span key={index} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Companies</h5>
                        <div className="flex flex-wrap gap-1">
                          {aiOutput.entities.companies.map((company, index) => (
                            <span key={index} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                              {company}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Tasks</h4>
                    <ul className="list-disc pl-4 sm:pl-5 space-y-1">
                      {aiOutput.tasks.map((task, index) => (
                        <li key={index} className="text-gray-700 text-sm sm:text-base">{task}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <span className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getPriorityColor(aiOutput.priority)}`}>
                      Priority: {aiOutput.priority}
                    </span>
                    {aiOutput.tags.map((tag, index) => (
                      <span key={index} className={`inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] sm:h-[400px] text-gray-500">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base sm:text-lg">Your organized note will appear here</p>
                <p className="text-xs sm:text-sm mt-1 sm:mt-2">Enter a note and click "Organize Note"</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* History Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-wrap justify-between items-center mb-4 sm:mb-6 gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">📜</span> Note History
          </h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 sm:pl-10 sm:pr-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!userId}
              />
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2 top-2 sm:left-3 sm:top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-colors"
              onClick={() => setShowHistory(!showHistory)}
              disabled={!userId}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
            <button
              type="button"
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-indigo-700 bg-indigo-50 rounded-lg sm:rounded-xl hover:bg-indigo-100 transition-colors"
              onClick={fetchHistory}
              disabled={loadingHistory || !userId}
            >
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {!userId ? (
          <div className="text-center py-6 sm:py-8">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">Authentication Required</h3>
            <p className="mt-1 text-gray-500 text-sm sm:text-base">Please sign in to view your note history.</p>
          </div>
        ) : showHistory && (
          history.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No organized notes</h3>
              <p className="mt-1 text-gray-500 text-sm sm:text-base">Get started by organizing your first note.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {history
                .filter(note => 
                  searchTerm === '' || 
                  note.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  note.originalNote.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((note) => (
                  <div 
                    key={note._id} 
                    className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                    onClick={() => loadNote(note._id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 truncate max-w-[70%] text-sm sm:text-base">
                        {note.summary || 'Untitled Note'}
                      </h3>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note._id);
                        }}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">
                      {note.originalNote}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium ${getPriorityColor(note.priority)}`}>
                        {note.priority}
                      </span>
                      {note.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          )
        )}
      </div>
      
      {/* Floating Mic Button */}
      <button
        className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all duration-300 z-10 ${
          isListening 
            ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        onClick={toggleVoiceRecognition}
        aria-label="Voice Input"
        disabled={!userId}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    </div>
  );
};

export default SmartOrganizer;