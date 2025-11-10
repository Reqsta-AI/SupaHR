import React, { useState, useRef, useEffect } from "react";
import ResumeMatchCard from "./ResumeMatchCard";

// Define props interface
interface ResumeMatcherProps {
  userId: string | null;
}

const ResumeMatcher: React.FC<ResumeMatcherProps> = ({ userId }) => {
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [jdText, setJdText] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [savedMatches, setSavedMatches] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"match" | "history">("match");
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved matches on component mount
  useEffect(() => {
    fetchSavedMatches();
  }, [userId]);

  const fetchSavedMatches = async () => {
    if (!userId) {
      setSavedMatches([]);
      return;
    }
    
    try {
      const response = await fetch(
        `https://ai-nuto.vercel.app/api/hr/resume-matches?userId=${userId}`
      );
      const data = await response.json();

      if (response.ok) {
        console.log("Saved matches data:", data);
        setSavedMatches(data);
      } else {
        console.warn("Failed to load saved matches");
      }
    } catch (err) {
      console.warn("Backend not available for saved matches");
    }
  };

  const fetchSavedMatchById = async (id: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(
        `https://ai-nuto.vercel.app/api/hr/resume-matches/${id}?userId=${userId}`
      );
      const data = await response.json();

      if (response.ok) {
        console.log("Single match data:", data);
        // The response is the match object directly, not wrapped in matchResult
        setSelectedMatch(data);
      } else {
        setError("Failed to load match details");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    }
  };

  const deleteSavedMatch = async (id: string) => {
    if (!userId) return;
    
    if (!window.confirm("Are you sure you want to delete this match result?"))
      return;

    try {
      const response = await fetch(
        `https://ai-nuto.vercel.app/api/hr/resume-matches/${id}?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        // Remove from saved matches list
        setSavedMatches((prev) => prev.filter((match) => match._id !== id));
        // If viewing this match, close the detail view
        if (selectedMatch && selectedMatch._id === id) {
          setSelectedMatch(null);
        }
        // Refresh the list
        fetchSavedMatches();
      } else {
        setError("Failed to delete match result");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    }
  };

  const handleJdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setJdFile(e.target.files[0]);
    }
  };

  const handleResumeFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setResumeFiles(Array.from(e.target.files));
    }
  };

  const triggerJdFileInput = () => {
    if (jdFileInputRef.current) {
      jdFileInputRef.current.click();
    }
  };

  const triggerResumeFileInput = () => {
    if (resumeFileInputRef.current) {
      resumeFileInputRef.current.click();
    }
  };

  const matchResumes = async () => {
    if ((!jdFile && !jdText) || resumeFiles.length === 0 || !userId) {
      setError("Please provide both a job description and at least one resume");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const formData = new FormData();

      // Add job description (as text field, not file)
      if (jdText) {
        formData.append("jobDescription", jdText);
      } else if (jdFile) {
        // If JD is a file, we need to read it first
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          formData.append("jobDescription", text);
          await processRequest(formData);
        };
        reader.readAsText(jdFile);
        return; // We'll continue in the FileReader callback
      }

      // Add resume files
      resumeFiles.forEach((file) => {
        formData.append("resumes", file);
      });

      // Add userId to formData
      formData.append("userId", userId);

      await processRequest(formData);
    } catch (err) {
      setError("Failed to process files.");
      console.error("Error matching resumes:", err);
      setIsProcessing(false);
    }
  };

  const processRequest = async (formData: FormData) => {
    try {
      const response = await fetch(
        "https://ai-nuto.vercel.app/api/hr/resume-match",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Transform the API response to match the existing UI structure
        const transformedResults = data.results
          .filter((result: any) => !result.error) // Filter out errored results
          .map((result: any, index: number) => {
            const matchResult = result.matchResult;
            console.log("TEST", matchResult);

            return {
              id: index + 1,
              name: result.filename,
              compatibilityScore: matchResult.compatibilityScore || 0,
              match:
                matchResult.compatibilityScore >= 90
                  ? "Perfect Match"
                  : matchResult.compatibilityScore >= 80
                  ? "Excellent Match"
                  : matchResult.compatibilityScore >= 70
                  ? "Good Match"
                  : matchResult.compatibilityScore >= 60
                  ? "Fair Match"
                  : "Poor Match",
              skills:
                matchResult.matchedSkills
                  ?.slice(0, 4)
                  .map((s: any) => s.skill) || [],
              experience: `${matchResult.totalYearOfExperience || 0} years`,
              location: matchResult.profileDetails?.location || "Not specified",
              decisionRationale: matchResult.decisionRationale || "",
              strengths: matchResult.strengths || [],
              weaknesses: matchResult.weaknesses || [],
              // New detailed fields
              requiredSkills: matchResult.requiredSkills || [],
              matchedSkills: matchResult.matchedSkills || [],
              unmatchedSkills: matchResult.unmatchedSkills || [],
              skillsScore: matchResult.skillsScore || 0,
              toolsJobDescription: matchResult.toolsJobDescription || [],
              matchedTools: matchResult.matchedTools || [],
              unmatchedTools: matchResult.unmatchedTools || [],
              toolsScore: matchResult.toolsScore || 0,
              rolesJobDescription: matchResult.rolesJobDescription || [],
              matchedRoles: matchResult.matchedRoles || [],
              unmatchedRoles: matchResult.unmatchedRoles || [],
              rolesScore: matchResult.rolesScore || 0,
              industry: matchResult.industry || [],
              resumeFit: matchResult.resumeFit || "",
              profileDetails: matchResult.profileDetails || {},
              _id: result._id || null // If saved in backend
            };
          });

        setResults(transformedResults);
        setActiveTab('match'); // Switch to results tab
      } else {
        setError(data.message || "Failed to match resumes");
      }
    } catch (err) {
      setError(
        "Failed to connect to the server. Please make sure the backend is running."
      );
      console.error("Error matching resumes:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const viewMatchDetails = (match: any) => {
    if (match._id && match._id.toString().startsWith('result-')) {
      // If it's a temporary result from the current session, use the data directly
      setSelectedMatch(match);
    } else if (match._id) {
      // If it's a saved match, fetch details from backend
      fetchSavedMatchById(match._id);
    } else {
      // If it's a recent result, use the data we have
      setSelectedMatch(match);
    }
  };

  // Create a new function to handle the ResumeMatchCard's onViewDetails callback
  const handleViewDetails = (id: string) => {
    // Find the matching result by id
    const result = results.find(r => `result-${r.id}` === id);
    if (result) {
      viewMatchDetails(result);
    }
  };

  const closeMatchDetails = () => {
    setSelectedMatch(null);
  };

  // Helper function to render skills with evidence
  const renderSkillsWithEvidence = (skills: any[], title: string) => {
    if (!skills || skills.length === 0) {
      return (
        <div className="p-4 bg-gray-50 rounded-xl">
          <h5 className="font-medium text-gray-800 mb-2">{title}</h5>
          <p className="text-gray-500 text-sm">
            No {title.toLowerCase()} found.
          </p>
        </div>
      );
    }

    return (
      <div>
        <h5 className="font-medium text-gray-800 mb-2">
          {title} ({skills.length})
        </h5>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {skills.map((skill: any, index: number) => (
            <div key={index} className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">{skill.skill || skill}</span>
                {skill.evidence && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Matched
                  </span>
                )}
              </div>
              {skill.evidence && (
                <p className="mt-2 text-sm text-gray-600">{skill.evidence}</p>
              )}
              {skill.section && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                    {skill.section}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper function to render profile details
  const renderProfileDetails = (profile: any) => {
    if (!profile || Object.keys(profile).length === 0) {
      return (
        <div className="p-4 bg-gray-50 rounded-xl">
          <h5 className="font-medium text-gray-800 mb-2">Candidate Profile</h5>
          <p className="text-gray-500 text-sm">No profile details found.</p>
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50 rounded-xl">
        <h5 className="font-medium text-gray-800 mb-2">Candidate Profile</h5>
        <div className="space-y-2">
          {profile.name && (
            <div className="flex justify-between">
              <span className="text-gray-600">Name</span>
              <span className="font-medium text-gray-900">{profile.name}</span>
            </div>
          )}
          {profile.email && (
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-gray-900">{profile.email}</span>
            </div>
          )}
          {profile.phoneNumber && (
            <div className="flex justify-between">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium text-gray-900">
                {profile.phoneNumber}
              </span>
            </div>
          )}
          {profile.linkedInUrl && (
            <div className="flex justify-between">
              <span className="text-gray-600">LinkedIn</span>
              <span className="font-medium text-indigo-600 truncate max-w-[50%]">
                {profile.linkedInUrl}
              </span>
            </div>
          )}
          {profile.location && (
            <div className="flex justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-medium text-gray-900">
                {profile.location}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <span className="mr-3">🎯</span> Resume Matcher
        </h2>
        <p className="text-gray-600">
          Match resumes with job requirements using AI-powered analysis
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 font-medium text-lg ${activeTab === 'match' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('match')}
        >
          Match Resumes
        </button>
        <button
          className={`py-3 px-6 font-medium text-lg ${activeTab === 'history' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => {
            setActiveTab('history');
            fetchSavedMatches(); // Refresh saved matches when switching to history tab
          }}
        >
          Match History
        </button>
      </div>
      
      {/* Match Resumes Tab */}
      {activeTab === 'match' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Job Description Section */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">📋</span> Job Description
              </h3>
              
              <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 mb-3">
                Paste Text JD Please
                </label>
                
                {/* <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-5 py-3 border border-indigo-300 text-lg font-medium rounded-xl shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                    onClick={triggerJdFileInput}
                    disabled={!userId}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload JD
                  </button>
                  <input 
                    type="file" 
                    ref={jdFileInputRef}
                    className="sr-only" 
                    onChange={handleJdFileChange}
                    accept=".pdf,.docx,.txt"
                    disabled={!userId}
                  />
                  
                  {jdFile && (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium bg-green-100 text-green-800">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {jdFile.name}
                    </span>
                  )}
                </div>
                 */}
                <textarea
                  rows={8}
                  className="w-full px-5 py-4 text-lg border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
                  placeholder="Paste job description text here..."
                  value={jdText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJdText(e.target.value)}
                  disabled={!userId}
                />
              </div>
            </div>
            
            {/* Resumes Section */}
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <span className="mr-2">👥</span> Candidate Resumes
              </h3>
              
              <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Upload Multiple Resumes
                </label>
                
                <button
                  type="button"
                  className="w-full py-5 border-2 border-dashed border-gray-300 rounded-2xl text-lg font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 flex flex-col items-center justify-center mb-6"
                  onClick={triggerResumeFileInput}
                  disabled={!userId}
                >
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mb-1">Select Resume Files</span>
                  <span className="text-sm text-gray-500">Supports PDF, DOC, DOCX files</span>
                </button>
                <input 
                  type="file" 
                  ref={resumeFileInputRef}
                  className="sr-only" 
                  onChange={handleResumeFilesChange}
                  accept=".pdf,.doc,.docx"
                  multiple
                  disabled={!userId}
                />
                
                {resumeFiles.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-lg font-medium text-gray-800">
                        {resumeFiles.length} file(s) selected
                      </h4>
                      <button
                        type="button"
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        onClick={() => setResumeFiles([])}
                        disabled={!userId}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
                      {resumeFiles.map((file, index) => (
                        <div key={index} className="flex items-center py-3 px-4 bg-white rounded-lg mb-2 last:mb-0 shadow-sm">
                          <svg className="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-gray-700 truncate flex-1">{file.name}</span>
                          <span className="text-sm text-gray-500 ml-2">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                disabled={(!jdFile && !jdText) || resumeFiles.length === 0 || isProcessing || !userId}
                className={`w-full py-4 text-lg font-bold rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center ${
                  (!jdFile && !jdText) || resumeFiles.length === 0 || isProcessing || !userId
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 hover:shadow-2xl transform hover:-translate-y-1'
                }`}
                onClick={matchResumes}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing {resumeFiles.length} Resumes...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Match Resumes
                  </>
                )}
              </button>
              
              {!userId && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700">
                  <p className="font-medium">Authentication Required:</p>
                  <p>Please sign in to use the resume matching feature.</p>
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <p className="font-medium">Error:</p>
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Results Section */}
          {results.length > 0 && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                        <span className="mr-2">📊</span> Match Results
                      </h3>
                      <p className="text-gray-600">Showing {results.length} candidates ranked by compatibility score</p>
                    </div>
                    <div className="flex items-center bg-gradient-to-r from-green-100 to-teal-100 px-4 py-2 rounded-full">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium text-green-800">AI Analysis Complete</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((result) => {
                      // Create a mock match object that matches the SavedMatch interface for ResumeMatchCard
                      const mockMatch = {
                        _id: `result-${result.id}`,
                        filename: result.name,
                        createdAt: new Date().toISOString(),
                        matchResult: {
                          profileDetails: {
                            name: result.name,
                            totalYearsExperience: result.profileDetails?.totalYearsExperience || 
                              (result.experience ? parseInt(result.experience) : undefined),
                            currentLocation: result.location || result.profileDetails?.location
                          },
                          compatibilityScore: result.compatibilityScore,
                          matchedSkills: result.matchedSkills || 
                            (result.skills ? result.skills.map((skill: string) => ({ skill })) : []),
                          matchedTools: result.matchedTools || [],
                          skillsScore: result.skillsScore,
                          toolsScore: result.toolsScore,
                          rolesScore: result.rolesScore,
                          industry: result.industry || [],
                          decisionRationale: result.decisionRationale
                        }
                      };

                      return (
                        <ResumeMatchCard
                          key={result.id}
                          match={mockMatch}
                          onViewDetails={handleViewDetails}
                          onDelete={() => {}} // No delete functionality for temporary results
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Match History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="mr-2">📜</span> Match History
                </h3>
                <p className="text-gray-600">Previously saved resume matches</p>
              </div>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                onClick={fetchSavedMatches}
                disabled={!userId}
              >
                Refresh
              </button>
            </div>
            
            {!userId ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Authentication Required</h3>
                <p className="mt-1 text-gray-500">Please sign in to view your match history.</p>
              </div>
            ) : savedMatches.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No saved matches</h3>
                <p className="mt-1 text-gray-500">Get started by matching some resumes.</p>
                <button
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setActiveTab('match')}
                >
                  Match Resumes
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedMatches.map((match) => (
                  <ResumeMatchCard
                    key={match._id}
                    match={match}
                    onViewDetails={fetchSavedMatchById}
                    onDelete={deleteSavedMatch}
                  />
                ))}
              </div>

            )}
          </div>
        </div>
      )}
      
      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedMatch.profileDetails?.name || selectedMatch.filename || selectedMatch.jobTitle || 'Match Details'}
                </h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={closeMatchDetails}
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Overview */}
                <div className="lg:col-span-1">
                  <div className="space-y-6">
                    {/* Compatibility Score */}
                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                      <h4 className="text-lg font-bold text-gray-800 mb-3">Compatibility Score</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Overall Match</span>
                        <span className={`text-3xl font-bold ${
                          selectedMatch.compatibilityScore >= 90 
                            ? 'text-green-600' 
                            : selectedMatch.compatibilityScore >= 80 
                              ? 'text-blue-600' 
                              : selectedMatch.compatibilityScore >= 70 
                                ? 'text-yellow-600' 
                                : 'text-gray-600'
                        }`}>
                          {selectedMatch.compatibilityScore || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 mt-3">
                        <div 
                          className={`h-4 rounded-full ${
                            selectedMatch.compatibilityScore >= 90 
                              ? 'bg-green-500' 
                              : selectedMatch.compatibilityScore >= 80 
                                ? 'bg-blue-500' 
                                : selectedMatch.compatibilityScore >= 70 
                                  ? 'bg-yellow-500' 
                                  : 'bg-gray-500'
                          }`} 
                          style={{ width: `${selectedMatch.compatibilityScore || 0}%` }}
                        ></div>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {selectedMatch.match || 'No match quality data'}
                      </p>
                    </div>
                    
                    {/* Profile Details */}
                    {renderProfileDetails(selectedMatch.profileDetails)}
                    
                    {/* Experience */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h5 className="font-medium text-gray-800 mb-2">Experience</h5>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Years</span>
                        <span className="font-medium text-gray-900">
                          {selectedMatch.experience || `${selectedMatch.totalYearOfExperience || 0} years`}
                        </span>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h5 className="font-medium text-gray-800 mb-2">Location</h5>
                      <p className="text-gray-900">
                        {selectedMatch.location || selectedMatch.profileDetails?.location || 'Not specified'}
                      </p>
                    </div>
                    
                    {/* Resume Fit */}
                    {selectedMatch.resumeFit && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h5 className="font-medium text-gray-800 mb-2">Resume Fit</h5>
                        <p className="text-gray-900">
                          {selectedMatch.resumeFit}
                        </p>
                      </div>
                    )}
                    
                    {/* Decision Rationale */}
                    {selectedMatch.decisionRationale && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h5 className="font-medium text-gray-800 mb-2">Resume Fit Summary</h5>
                        <p className="text-gray-900">
                          {selectedMatch.decisionRationale}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Middle Column - Skills, Tools, Roles */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Skills Section */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-gray-800">Skills Analysis</h4>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        selectedMatch.skillsScore >= 90 
                          ? 'bg-green-100 text-green-800' 
                          : selectedMatch.skillsScore >= 80 
                            ? 'bg-blue-100 text-blue-800' 
                            : selectedMatch.skillsScore >= 70 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedMatch.skillsScore || 0}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {renderSkillsWithEvidence(selectedMatch.matchedSkills, "Matched Skills")}
                      </div>
                      <div>
                        <div className="mb-4">
                          {renderSkillsWithEvidence(selectedMatch.unmatchedSkills, "Missing Skills")}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-800 mb-2">Required Skills ({selectedMatch.requiredSkills?.length || 0})</h5>
                          <div className="flex flex-wrap gap-2">
                            {selectedMatch.requiredSkills && selectedMatch.requiredSkills.length > 0 ? (
                              selectedMatch.requiredSkills.map((skill: string, index: number) => {
                                const isMatched = selectedMatch.matchedSkills?.some((matchedSkill: any) => matchedSkill.skill === skill);
                                return (
                                  <span 
                                    key={index} 
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                      isMatched 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {skill}
                                  </span>
                                );
                              })
                            ) : (
                              <p className="text-gray-500 text-sm">No required skills found.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tools Section */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-gray-800">Tools Analysis</h4>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        selectedMatch.toolsScore >= 90 
                          ? 'bg-green-100 text-green-800' 
                          : selectedMatch.toolsScore >= 80 
                            ? 'bg-blue-100 text-blue-800' 
                            : selectedMatch.toolsScore >= 70 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedMatch.toolsScore || 0}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {renderSkillsWithEvidence(selectedMatch.matchedTools, "Matched Tools")}
                      </div>
                      <div>
                        {renderSkillsWithEvidence(selectedMatch.unmatchedTools, "Missing Tools")}
                      </div>
                    </div>
                  </div>
                  
                  {/* Roles Section */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-gray-800">Roles & Responsibilities</h4>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        selectedMatch.rolesScore >= 90 
                          ? 'bg-green-100 text-green-800' 
                          : selectedMatch.rolesScore >= 80 
                            ? 'bg-blue-100 text-blue-800' 
                            : selectedMatch.rolesScore >= 70 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedMatch.rolesScore || 0}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        {renderSkillsWithEvidence(selectedMatch.matchedRoles, "Matched Roles")}
                      </div>
                      <div>
                        {renderSkillsWithEvidence(selectedMatch.unmatchedRoles, "Missing Roles")}
                      </div>
                    </div>
                  </div>
                  
                  {/* Strengths and Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Strengths</h4>
                      {selectedMatch.strengths && selectedMatch.strengths.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedMatch.strengths.map((strength: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-gray-700">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No strengths identified.</p>
                      )}
                    </div>
                    
                    {/* Weaknesses */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                      <h4 className="text-lg font-bold text-gray-800 mb-4">Weaknesses</h4>
                      {selectedMatch.weaknesses && selectedMatch.weaknesses.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedMatch.weaknesses.map((weakness: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <svg className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="text-gray-700">{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No weaknesses identified.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={closeMatchDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeMatcher;