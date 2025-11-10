import React, { useState, useEffect } from 'react';

// Define the interface for the API response
interface ExtractedSkillsResponse {
  _id: string;
  skills: string[];
  roles: string[];
  tools: string[];
  technologies: string[];
  booleanStrings: {
    platform: string;
    searchString: string;
    explanation: string;
  }[];
  optimizedKeywords: string[];
  jobDescription: string;
  message?: string; // Add optional message property for error handling
  createdAt: string;
}

// Define props interface
interface BooleanSkillExtractorProps {
  userId: string | null;
  triggerRefresh?: () => void; // Add optional triggerRefresh prop
}

const BooleanSkillExtractor: React.FC<BooleanSkillExtractorProps> = ({ userId, triggerRefresh }) => {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ExtractedSkillsResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [skillHistory, setSkillHistory] = useState<ExtractedSkillsResponse[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load skill extraction history on component mount
  useEffect(() => {
    fetchSkillHistory();
  }, [userId]);

  // Fetch all skill extractions
  const fetchSkillHistory = async () => {
    if (!userId) {
      setSkillHistory([]);
      return;
    }
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/boolean-skills?userId=${userId}`);
      const data: ExtractedSkillsResponse[] = await response.json();
      
      if (response.ok) {
        setSkillHistory(data);
      } else {
        setError('Failed to load skill extraction history');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error fetching skill history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a specific skill extraction
  const loadSkillExtraction = async (id: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/boolean-skills/${id}?userId=${userId}`);
      const data: ExtractedSkillsResponse = await response.json();
      
      if (response.ok) {
        setResults(data);
        setInput(data.jobDescription);
      } else {
        setError(data.message || 'Failed to load skill extraction');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error loading skill extraction:', err);
    }
  };

  // Delete a specific skill extraction
  const deleteSkillExtraction = async (id: string) => {
    if (!userId) return;
    
    if (!window.confirm('Are you sure you want to delete this skill extraction?')) return;
    
    try {
      const response = await fetch(`https://ai-nuto.vercel.app/api/boolean-skills/${id}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from history
        setSkillHistory(prev => prev.filter(skill => skill._id !== id));
        // If the deleted skill is currently displayed, clear it
        if (results && results._id === id) {
          setResults(null);
        }
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete skill extraction');
      }
    } catch (err) {
      setError('Failed to connect to the server. Please make sure the backend is running.');
      console.error('Error deleting skill extraction:', err);
    }
  };

  const extractBooleanString = async () => {
    if (!input.trim() || !userId) return;
    
    setIsExtracting(true);
    setError('');
    
    // Retry logic
    let retries = 0;
    const maxRetries = 1;
    
    while (retries <= maxRetries) {
      try {
        const response = await fetch('https://ai-nuto.vercel.app/api/extract-boolean-skills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobDescription: input, userId }),
        });
        
        const data: ExtractedSkillsResponse = await response.json();
        
        if (response.ok) {
          setResults(data);
          // Refresh history to include the new extraction
          fetchSkillHistory();
          
          // Clear input after successful extraction
          setInput('');
          
          // Call triggerRefresh if provided
          if (triggerRefresh) {
            triggerRefresh();
          }
          
          return; // Success, exit retry loop
        } else {
          if (retries < maxRetries) {
            retries++;
            console.log(`API request failed, retrying... (${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            continue;
          }
          setError(data.message || 'Failed to extract skills');
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
        console.error('Error extracting skills:', err);
        return;
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get the first boolean string for the main display
  const getPrimaryBooleanString = () => {
    if (!results || !results.booleanStrings || results.booleanStrings.length === 0) return '';
    return results.booleanStrings[0].searchString;
  };

  // Get all unique skills from all categories
  const getAllSkills = () => {
    if (!results) return [];
    
    const allSkills = [
      ...(results.skills || []),
      ...(results.roles || []),
      ...(results.tools || []),
      ...(results.technologies || []),
      ...(results.optimizedKeywords || [])
    ];
    
    // Remove duplicates using a more compatible approach
    const uniqueSkills: string[] = [];
    const seen = new Set<string>();
    
    for (const skill of allSkills) {
      if (!seen.has(skill)) {
        seen.add(skill);
        uniqueSkills.push(skill);
      }
    }
    
    return uniqueSkills;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <span className="mr-2 sm:mr-3">🔍</span> Boolean Skill Extractor
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">Extract skills and create powerful boolean search strings for candidate sourcing</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">📋</span> Job Description
          </h3>
          
          <div className="mb-4 sm:mb-6">
            <label htmlFor="jdInput" className="block text-base sm:text-lg font-medium text-gray-700 mb-2 sm:mb-3">
              Paste Job Description
            </label>
            <textarea
              id="jdInput"
              rows={8}
              className="w-full px-3 py-2 sm:px-5 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
              placeholder="Paste the job description here to extract boolean search strings and key skills..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              disabled={!userId}
            />
          </div>
          
          <button
            type="button"
            disabled={!input.trim() || isExtracting || !userId}
            className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-bold text-white text-base sm:text-lg shadow-lg sm:shadow-xl transition-all duration-300 flex items-center justify-center ${
              !input.trim() || isExtracting || !userId
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl transform hover:-translate-y-0.5'
            }`}
            onClick={extractBooleanString}
          >
            {isExtracting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-6 sm:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm sm:text-base">Extracting Skills...</span>
              </>
            ) : (
              'Extract Boolean Skills'
            )}
          </button>
          
          {!userId && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl text-yellow-700 text-sm sm:text-base">
              <p className="font-medium">Authentication Required:</p>
              <p>Please sign in to use the skill extraction feature.</p>
            </div>
          )}
          
          {error && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-red-700 text-sm sm:text-base">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
            <span className="mr-2">🎯</span> Results
          </h3>
          
          {results ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h4 className="text-base sm:text-lg font-bold text-gray-800">Primary Boolean String</h4>
                  <button
                    type="button"
                    className="flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    onClick={() => copyToClipboard(getPrimaryBooleanString())}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 font-mono text-xs sm:text-sm break-words">
                  {getPrimaryBooleanString()}
                </div>
                <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600">
                  <p className="font-medium">Platform:</p>
                  <p>{results.booleanStrings[0]?.platform || 'General'}</p>
                  <p className="font-medium mt-1 sm:mt-2">Explanation:</p>
                  <p>{results.booleanStrings[0]?.explanation || 'No explanation provided.'}</p>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">All Boolean Strings</h4>
                <div className="space-y-3 sm:space-y-4">
                  {results.booleanStrings.map((booleanString, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700 text-sm">{booleanString.platform}</span>
                        <button
                          type="button"
                          className="flex items-center px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                          onClick={() => copyToClipboard(booleanString.searchString)}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 sm:p-3 font-mono text-[10px] sm:text-xs break-words">
                        {booleanString.searchString}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {booleanString.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
                <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Extracted Skills</h4>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {getAllSkills().map((skill, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-indigo-100 text-indigo-800">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-300 p-6 sm:p-8">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-base sm:text-lg text-gray-600 text-center">Your extracted skills and boolean strings will appear here</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 text-center">Paste a job description and click "Extract Boolean Skills"</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Skill History Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-wrap justify-between items-center mb-4 sm:mb-6 gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">📜</span> Extraction History
          </h2>
          <div className="flex flex-wrap gap-2">
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
              onClick={fetchSkillHistory}
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
            <p className="mt-1 text-gray-500 text-sm sm:text-base">Please sign in to view your extraction history.</p>
          </div>
        ) : showHistory && (
          skillHistory.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">No skill extractions</h3>
              <p className="mt-1 text-gray-500 text-sm sm:text-base">Get started by extracting skills from a job description.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {skillHistory.map((skill) => (
                <div 
                  key={skill._id} 
                  className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  onClick={() => loadSkillExtraction(skill._id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 truncate max-w-[70%] text-sm sm:text-base">
                      {skill.jobDescription.substring(0, 30)}...
                    </h3>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSkillExtraction(skill._id);
                      }}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                    {[...(skill.skills || []), ...(skill.roles || [])]
                      .slice(0, 3)
                      .map((item, index) => (
                        <span key={index} className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-indigo-100 text-indigo-800">
                          {item}
                        </span>
                      ))}
                    {([...(skill.skills || []), ...(skill.roles || [])].length > 3) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700">
                        +{[...(skill.skills || []), ...(skill.roles || [])].length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] sm:text-xs text-gray-500">
                    <span>{new Date(skill.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default BooleanSkillExtractor;