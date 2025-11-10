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
      // For production or when email not in history, try to fetch from backend
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

  // Clear input function
  const clearInput = () => {
    setInput('');
    setInterimTranscript('');
  };

  // Save email function
  const saveEmail = async () => {
    if (!subject.trim() || !email.trim() || !userId) return;
    
    try {
      const response = await fetch('https://ai-nuto.vercel.app/api/hr/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subject, 
          body: email, 
          description: input,
          userId 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Refresh history to include the new email
        fetchEmailHistory();
        alert('Email draft saved successfully!');
      } else {
        setError(data.message || 'Failed to save email draft');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error saving email draft:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Email Drafter</h2>
          <p className="text-gray-600 mt-1">Create professional emails with AI assistance</p>
        </div>
        <button
          onClick={toggleVoiceRecognition}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            isListening 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
          }`}
        >
          <svg 
            className={`w-5 h-5 mr-2 ${isListening ? 'text-red-500' : 'text-gray-500'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
          {isListening ? 'Stop Listening' : 'Voice Input'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Describe your email</h3>
            <button
              onClick={clearInput}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <div className="relative mb-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the email you want to create. For example: Write a follow-up email to a candidate who applied for a software engineer position, thanking them for their interest and informing them that we'll review their application within 5 business days."
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
            {interimTranscript && (
              <div className="absolute bottom-2 left-2 right-2 bg-white/90 p-2 rounded border border-indigo-300">
                <span className="text-indigo-600">{interimTranscript}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateEmail}
              disabled={isGenerating || !input.trim()}
              className="flex items-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Email
                </>
              )}
            </button>
            
            <button
              onClick={saveEmail}
              disabled={!email || !subject}
              className="flex items-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Draft
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Generated Email</h3>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                disabled={!email}
                className="flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Email subject"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Generated email content"
            />
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Email History</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            {showHistory ? 'Hide' : 'Show'} History
            <svg 
              className={`w-4 h-4 ml-1 transform ${showHistory ? 'rotate-180' : ''} transition-transform`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {showHistory && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Loading email history...</p>
              </div>
            ) : emailHistory.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No email drafts</h3>
                <p className="mt-1 text-gray-500">Get started by creating a new email draft.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {emailHistory.map((draft) => (
                  <div key={draft._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{draft.subject || 'Untitled Draft'}</h4>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Draft
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 truncate">{draft.description || 'No description'}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(draft.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => loadEmailDraft(draft._id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          Open
                        </button>
                        <button
                          onClick={() => deleteEmailDraft(draft._id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDrafter;