import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  candidateName: string;
  logType: 'Interview Feedback' | 'Status Update' | 'Action Item';
  stage?: string;
  recommendation: 'Strong Yes' | 'Yes' | 'No' | 'Strong No' | 'Neutral';
  notes: string;
  actionItem?: string;
  timestamp: string;
  tag?: string;
}

const QuickNotes: React.FC = () => {
  // Form state
  const [candidateName, setCandidateName] = useState('');
  const [logType, setLogType] = useState<'Interview Feedback' | 'Status Update' | 'Action Item'>('Interview Feedback');
  const [stage, setStage] = useState('');
  const [recommendation, setRecommendation] = useState<'Strong Yes' | 'Yes' | 'No' | 'Strong No' | 'Neutral'>('Yes');
  const [notes, setNotes] = useState('');
  const [actionItem, setActionItem] = useState('');
  const [tag, setTag] = useState('');
  
  // History state
  const [logHistory, setLogHistory] = useState<LogEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const quickLogRef = useRef<HTMLDivElement>(null);

  // Stages for interview feedback
  const interviewStages = [
    'Screening',
    'Technical 1',
    'Technical 2',
    'Hiring Manager',
    'Panel Interview',
    'Offer Prep',
    'Final Review'
  ];

  // Tags for quick logging
  const tags = [
    'Follow-up',
    'Rejected',
    'Hired',
    'On Hold',
    'Needs Review'
  ];

  // Load logs from localStorage on component mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('hrSmartHelperLogs');
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs);
        setLogHistory(parsedLogs);
        setFilteredHistory(parsedLogs);
      } catch (e) {
        console.error('Failed to parse logs', e);
      }
    }
  }, []);

  // Filter history based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredHistory(logHistory);
    } else {
      const filtered = logHistory.filter(entry => 
        entry.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [searchTerm, logHistory]);

  // Handle click outside to close quick log
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickLogRef.current && !quickLogRef.current.contains(event.target as Node)) {
        setShowQuickLog(false);
      }
    };

    if (showQuickLog) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuickLog]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + L to open quick log
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setShowQuickLog(true);
      }
      
      // Escape to close quick log
      if (e.key === 'Escape' && showQuickLog) {
        setShowQuickLog(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showQuickLog]);

  const handleSaveLog = () => {
    if (!candidateName.trim() || !notes.trim()) {
      alert('Please fill in both Candidate Name and Notes fields.');
      return;
    }

    setIsSaving(true);
    
    const newLog: LogEntry = {
      id: Date.now().toString(),
      candidateName,
      logType,
      recommendation,
      notes,
      timestamp: new Date().toLocaleString(),
      ...(logType === 'Interview Feedback' && { stage }),
      ...(logType === 'Action Item' && { actionItem }),
      ...(tag && { tag })
    };

    const updatedLogs = [newLog, ...logHistory];
    setLogHistory(updatedLogs);
    setFilteredHistory(updatedLogs);
    
    // Save to localStorage
    localStorage.setItem('hrSmartHelperLogs', JSON.stringify(updatedLogs));
    
    // Reset form
    setCandidateName('');
    setNotes('');
    setActionItem('');
    setTag('');
    
    // Show success message
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaving(false);
      setShowQuickLog(false);
    }, 1000);
  };

  const handleQuickSave = () => {
    if (!notes.trim()) return;
    
    setIsSaving(true);
    
    const newLog: LogEntry = {
      id: Date.now().toString(),
      candidateName: candidateName || 'Unnamed Candidate',
      logType: 'Status Update',
      recommendation: 'Neutral',
      notes,
      timestamp: new Date().toLocaleString(),
      ...(tag && { tag })
    };

    const updatedLogs = [newLog, ...logHistory];
    setLogHistory(updatedLogs);
    setFilteredHistory(updatedLogs);
    
    // Save to localStorage
    localStorage.setItem('hrSmartHelperLogs', JSON.stringify(updatedLogs));
    
    // Reset quick log form
    setNotes('');
    setCandidateName('');
    setTag('');
    
    // Show success message
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsSaving(false);
      setShowQuickLog(false);
    }, 1000);
  };

  const handleQuickLogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuickSave();
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all log history?')) {
      setLogHistory([]);
      setFilteredHistory([]);
      localStorage.removeItem('hrSmartHelperLogs');
    }
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'Strong Yes': return 'bg-green-100 text-green-800';
      case 'Yes': return 'bg-green-50 text-green-700';
      case 'No': return 'bg-red-50 text-red-700';
      case 'Strong No': return 'bg-red-100 text-red-800';
      case 'Neutral': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTagColor = (tagValue: string) => {
    switch (tagValue) {
      case 'Follow-up': return 'bg-blue-100 text-blue-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Hired': return 'bg-green-100 text-green-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Needs Review': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <span className="mr-2 sm:mr-3">📋</span> Candidate Log & Interview Feedback
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">Quickly log candidate feedback, status updates, and action items</p>
      </div>
      
      {/* Main logging form */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left column - Candidate Info and Log Type */}
          <div className="space-y-4 sm:space-y-6">
            {/* Candidate Name */}
            <div>
              <label htmlFor="candidate-name-input" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Candidate Name
              </label>
              <input
                type="text"
                id="candidate-name-input"
                className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                placeholder="Enter candidate name or ID"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>
            
            {/* Quick Fields */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Quick Notes *
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm sm:text-base"
                  placeholder="Type anything about candidate feedback, next steps, or actions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Tag (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {tags.map((tagOption) => (
                    <button
                      key={tagOption}
                      type="button"
                      className={`px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-full ${
                        tag === tagOption
                          ? getTagColor(tagOption) + ' ring-1 sm:ring-2 ring-offset-1 sm:ring-offset-2 ring-indigo-500'
                          : getTagColor(tagOption) + ' hover:opacity-75'
                      }`}
                      onClick={() => setTag(tag === tagOption ? '' : tagOption)}
                    >
                      {tagOption}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 sm:space-y-6">
              {/* Log Type */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Log Type
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {(['Interview Feedback', 'Status Update', 'Action Item'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        logType === type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setLogType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Conditional Fields */}
              {logType === 'Interview Feedback' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Interview Stage/Round
                  </label>
                  <select
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    <option value="">Select stage</option>
                    {interviewStages.map((stageOption) => (
                      <option key={stageOption} value={stageOption}>
                        {stageOption}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {logType === 'Action Item' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Next Step / Action Item
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    placeholder="e.g., Schedule Tech 2, Prep Offer Letter"
                    value={actionItem}
                    onChange={(e) => setActionItem(e.target.value)}
                  />
                </div>
              )}
              
              {/* Recommendation/Disposition */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Overall Recommendation/Disposition
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {(['Strong Yes', 'Yes', 'Neutral', 'No', 'Strong No'] as const).map((rec) => (
                    <button
                      key={rec}
                      type="button"
                      className={`py-1.5 sm:py-2 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                        recommendation === rec
                          ? getRecommendationColor(rec) + ' ring-1 sm:ring-2 ring-offset-1 sm:ring-offset-2 ring-indigo-500'
                          : getRecommendationColor(rec) + ' hover:opacity-75'
                      }`}
                      onClick={() => setRecommendation(rec)}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div className="mt-4 sm:mt-6 flex flex-wrap justify-between items-center gap-3">
          <div className="text-xs sm:text-sm text-gray-500">
            * Required fields
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            {saveSuccess && (
              <div className="text-green-600 font-medium flex items-center text-xs sm:text-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved successfully!
              </div>
            )}
            <button
              type="button"
              disabled={isSaving || !candidateName.trim() || !notes.trim()}
              className={`flex items-center px-4 py-2 sm:px-6 sm:py-2 rounded-lg font-medium text-white transition-all text-sm sm:text-base ${
                isSaving || !candidateName.trim() || !notes.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              onClick={handleSaveLog}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs sm:text-sm">Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="text-xs sm:text-sm">Save Log</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* History Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 sm:mb-6 gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Log History
          </h3>
          
          <div className="flex items-center flex-wrap gap-2">
            <div className="relative">
              <input
                type="text"
                className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-2.5 sm:left-3 top-2 sm:top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <button
              type="button"
              className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              onClick={clearHistory}
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">No logs yet</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">Get started by saving your first candidate log.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredHistory.map((entry) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{entry.candidateName}</h4>
                      <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${getRecommendationColor(entry.recommendation)}`}>
                        {entry.recommendation}
                      </span>
                      {entry.tag && (
                        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${getTagColor(entry.tag)}`}>
                          {entry.tag}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center text-xs sm:text-sm text-gray-500 gap-3">
                      <span className="inline-flex items-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {entry.logType}
                      </span>
                      {entry.stage && (
                        <span className="inline-flex items-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {entry.stage}
                        </span>
                      )}
                      <span className="inline-flex items-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {entry.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 sm:mt-3 text-gray-700 text-sm">
                  <p>{entry.notes}</p>
                </div>
                
                {entry.actionItem && (
                  <div className="mt-2 inline-flex items-center text-xs sm:text-sm text-indigo-700 bg-indigo-50 px-2 py-1 sm:px-3 sm:py-1 rounded-full">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Next: {entry.actionItem}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Floating Quick Log Button */}
      <button
        className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex items-center justify-center hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 z-40"
        onClick={() => setShowQuickLog(true)}
        aria-label="Quick Log"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      
      {/* Quick Log Popup */}
      {showQuickLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div 
            ref={quickLogRef}
            className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Quick Log</h3>
                <button 
                  onClick={() => setShowQuickLog(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Candidate Name (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base"
                    placeholder="Enter candidate name"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Notes *
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm sm:text-base"
                    placeholder="Type anything about candidate feedback, next steps, or actions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onKeyDown={handleQuickLogKeyDown}
                  />
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Press Enter to save, Shift+Enter for new line</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Tag (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {tags.map((tagOption) => (
                      <button
                        key={tagOption}
                        type="button"
                        className={`px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm rounded-full ${
                          tag === tagOption
                            ? getTagColor(tagOption) + ' ring-1 sm:ring-2 ring-offset-1 sm:ring-offset-2 ring-indigo-500'
                            : getTagColor(tagOption) + ' hover:opacity-75'
                        }`}
                        onClick={() => setTag(tag === tagOption ? '' : tagOption)}
                      >
                        {tagOption}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 sm:space-x-3 pt-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    onClick={() => setShowQuickLog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving || !notes.trim()}
                    className={`flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-white transition-all text-xs sm:text-sm ${
                      isSaving || !notes.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                    onClick={handleQuickSave}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs sm:text-sm">Saving...</span>
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickNotes;