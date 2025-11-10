import React, { useState, useEffect, useRef } from 'react';

// Define the interface for email drafts
interface EmailDraft {
  _id: string;
  subject: string;
  body: string;
  description: string;
  createdAt: string;
  message?: string; // Add optional message property for error handling
}

// Define props interface
interface EmailDrafterProps {
  userId: string | null;
}

const EmailDrafter: React.FC<EmailDrafterProps> = ({ userId }) => {
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [emailHistory, setEmailHistory] = useState<EmailDraft[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load email history on component mount
  useEffect(() => {
    fetchEmailHistory();
  }, [userId]);

  // Fetch all email drafts
  const fetchEmailHistory = async () => {
    if (!userId) {
      setEmailHistory([]);
      return;
    }
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/hr/emails?userId=${userId}`);
      const data: EmailDraft[] = await response.json();
      
      if (response.ok) {
        setEmailHistory(data);
      } else {
        setError('Failed to load email history');
      }
    } catch (err) {
      // Don't show mock data, just handle the error
      setEmailHistory([]);
      console.warn('Backend not available.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a specific email draft
  const loadEmailDraft = async (id: string) => {
    // Validate ID before making request
    if (!id || id === 'undefined' || id.trim() === '' || !userId) {
      //setError('Invalid email ID');
      return;
    }
    
    try {
      // First check if the email exists in our current history
      const emailInHistory = emailHistory.find(email => email._id === id);
      if (emailInHistory && process.env.NODE_ENV === 'development') {
        // For development, use the email from history if available
        setSubject(emailInHistory.subject);
        setEmail(emailInHistory.body);
        setInput(emailInHistory.description);
        return;
      }
      
      // For production or when email not in history, try to fetch from backend
      if (process.env.NODE_ENV !== 'development') {
        const response = await fetch(`https://ai-nuto.vercel.app/api/hr/emails/${id}?userId=${userId}`);
        const data: EmailDraft = await response.json();
        
        if (response.ok) {
          setSubject(data.subject);
          setEmail(data.body);
          setInput(data.description);
        } else {
          setError(data.message || 'Failed to load email draft');
        }
        return;
      }
      
      // In development without backend and email not in history
      setError('Email loading not available in development mode without backend.');
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error loading email draft:', err);
    }
  };

  // Delete a specific email draft
  const deleteEmailDraft = async (id: string) => {
    // Validate ID before making request
    if (!id || id === 'undefined' || id.trim() === '' || !userId) {
      //setError('Invalid email ID');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this email draft?')) return;
    
    try {
      // In development without backend, don't process
      if (process.env.NODE_ENV === 'development') {
        //setError('Email deletion not available in development mode without backend.');
        // Remove from history even in development for better UX
        setEmailHistory(prev => prev.filter(email => email._id !== id));
        // If the deleted email is currently displayed, clear it
        if (email && subject) {
          setSubject('');
          setEmail('');
        }
        return;
      }
      
      const response = await fetch(`https://ai-nuto.vercel.app/api/hr/emails/${id}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from history
        setEmailHistory(prev => prev.filter(email => email._id !== id));
        // If the deleted email is currently displayed, clear it
        if (email && subject) {
          // We don't have the ID of the currently displayed email, so we'll just show a message
          setSubject('');
          setEmail('');
        }
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete email draft');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error deleting email draft:', err);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
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
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
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
    }
    
    return () => {
      // Clean up recognition on unmount
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

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
      setInput('');
      startListening();
    }
  };

  const generateEmail = async () => {
    console.log("User Id", userId);
    if (!input.trim() || !userId) return;
    
    // Stop voice recognition when generating email
    if (isListening) {
      stopListening();
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      
      const response = await fetch('https://ai-nuto.vercel.app/api/hr/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: input, userId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubject(data.subject);
        setEmail(data.body);
        // Refresh history to include the new email
        fetchEmailHistory();
      } else {
        setError(data.message || 'Failed to generate email');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error generating email:', err);
    } finally {
      setIsGenerating(false);
      setCopied(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${subject}\n\n${email}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <span className="mr-3">✉️</span> Email Drafter
        </h2>
        <p className="text-gray-600">Create professional emails with AI assistance</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col">
          <div className="mb-6 relative">
            <label htmlFor="emailInput" className="block text-lg font-medium text-gray-800 mb-3">
              Describe your email
            </label>
            <textarea
              id="emailInput"
              rows={8}
              className="w-full px-5 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
              placeholder="e.g., Draft a rejection email for a candidate applying for a software engineer position"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            />
            {/* Live Transcript Overlay */}
            {isListening && interimTranscript && (
              <div className="absolute bottom-4 left-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-blue-800 font-medium">Listening...</div>
                <div className="text-blue-600">{interimTranscript}</div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-4">
            <button
              type="button"
              className={`flex items-center px-4 py-2 rounded-xl font-medium transition-all ${
                isListening 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              onClick={toggleVoiceRecognition}
            >
              <svg className={`w-5 h-5 mr-2 ${isListening ? 'text-blue-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>{isListening ? 'Stop Listening' : 'Voice Input'}</span>
            </button>
            
            <button
              type="button"
              disabled={!input.trim() || isGenerating || !userId}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-white text-lg shadow-xl transition-all duration-300 flex items-center justify-center ${
                !input.trim() || isGenerating || !userId
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl transform hover:-translate-y-1'
              }`}
              onClick={generateEmail}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Crafting your email...
                </>
              ) : (
                'Generate Email'
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl h-full p-6 border-2 border-dashed border-gray-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="mr-2">👁️</span> Preview
            </h3>
            {email ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5 h-[400px] overflow-y-auto shadow-inner">
                <div className="font-sans text-gray-800 whitespace-pre-wrap leading-relaxed">
                  <div className="font-bold text-lg mb-3">{subject}</div>
                  <div className="whitespace-pre-wrap">{email}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-lg">Your generated email will appear here</p>
                <p className="text-sm mt-2">Enter a description and click "Generate Email"</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Email History Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">📜</span> Email History
          </h2>
          <div className="flex space-x-3">
            <button
              type="button"
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              onClick={fetchEmailHistory}
              disabled={loadingHistory || !userId}
            >
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {!userId ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Authentication Required</h3>
            <p className="mt-1 text-gray-500">Please sign in to view your email history.</p>
          </div>
        ) : showHistory && (
          emailHistory.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No email drafts</h3>
              <p className="mt-1 text-gray-500">Get started by generating your first email.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emailHistory.map((emailDraft) => (
                <div 
                  key={emailDraft._id} 
                  className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  onClick={() => loadEmailDraft(emailDraft._id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 truncate max-w-[70%]">
                      {emailDraft.subject || 'Untitled Email'}
                    </h3>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEmailDraft(emailDraft._id);
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {emailDraft.description || emailDraft.body.substring(0, 100) + '...'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(emailDraft.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      
      {email && (
        <div className="animate-fade-in">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-2">📄</span> Your Email
            </h3>
            <button
              type="button"
              className="flex items-center px-5 py-3 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-xl font-medium shadow-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
          <div className="bg-white border-2 border-gray-300 rounded-2xl p-6 shadow-inner">
            <div className="font-sans text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">
              <div className="font-bold text-xl mb-4">{subject}</div>
              <div className="whitespace-pre-wrap">{email}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Mic Button */}
      <button
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all duration-300 z-10 ${
          isListening 
            ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        onClick={toggleVoiceRecognition}
        aria-label="Voice Input"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    </div>
  );
};

export default EmailDrafter;