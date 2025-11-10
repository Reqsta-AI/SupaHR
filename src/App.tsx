import React, { useState, useEffect } from 'react';
import './App.css';
import EmailDrafter from './components/EmailDrafter';
import ResumeFormatter from './components/ResumeFormatter';
import BooleanSkillExtractor from './components/BooleanSkillExtractor';
import QuickNotes from './components/QuickNotes';
import ResumeMatcher from './components/ResumeMatcher';
import VoiceAssistant from './components/VoiceAssistant';
import SmartOrganizer from './components/SmartOrganizer';

function App() {
  const [activeTab, setActiveTab] = useState('organizer');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedEmail = localStorage.getItem('userEmail');
    if (storedUserId && storedEmail) {
      setUserId(storedUserId);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const endpoint = authMode === 'signin' 
        ? 'https://ai-nuto.vercel.app/api/auth/signin' 
        : 'https://ai-nuto.vercel.app/api/auth/signup';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Extract userId from the user object in the response
        const userId = data.user.id;
        // Store user ID and email in localStorage
        localStorage.setItem('userId', userId);
        localStorage.setItem('userEmail', email);
        setUserId(userId);
        setIsAuthenticated(true);
        setShowAuthModal(false);
        setEmail('');
      } else {
        console.error('Authentication failed:', data.message);
        // Add user-facing error message
        alert(`Authentication failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      alert('An error occurred during authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    setUserId(null);
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-900 hidden sm:block">HR Smart Helper</h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {!isAuthenticated ? (
                <>
                  <button 
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors whitespace-nowrap"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      setAuthMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className="text-xs sm:text-sm text-gray-700 hidden md:inline">Welcome!</span>
                  <button 
                    onClick={handleSignOut}
                    className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Feature Tabs */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
              {[
                { id: 'organizer', label: 'AI Notebook', icon: '🧠' },
                { id: 'email', label: 'Email Drafter', icon: '✉️' },
                { id: 'matcher', label: 'Resume Matcher', icon: '🎯' },
                { id: 'boolean', label: 'Skill Extractor', icon: '🔍' },
                // { id: 'resume', label: 'Resume Formatter', icon: '📄' },
                // { id: 'notes', label: 'Quick Notes', icon: '📝' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-indigo-300 shadow-sm'
                  }`}
                >
                  <span className="mr-1 text-sm sm:mr-2 sm:text-base">{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
                {[
                  { id: 'email', label: 'Email Drafter', icon: '✉️', desc: 'Create professional emails with AI assistance' },
                  { id: 'resume', label: 'Resume Formatter', icon: '📄', desc: 'Format resumes for better presentation' },
                  { id: 'boolean', label: 'Skill Extractor', icon: '🔍', desc: 'Extract skills and create boolean strings' },
                  { id: 'notes', label: 'Quick Notes', icon: '📝', desc: 'Log candidate feedback and interview notes' },
                  { id: 'organizer', label: 'Smart Organizer', icon: '🧠', desc: 'AI-powered note organization and insights' },
                  { id: 'matcher', label: 'Resume Matcher', icon: '🎯', desc: 'Match resumes with job requirements' },
                ].map((feature) => (
                  <div 
                    key={feature.id}
                    className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
                    onClick={() => setActiveTab(feature.id)}
                  >
                    <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{feature.icon}</div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">{feature.label}</h3>
                    <p className="text-sm sm:text-gray-600 flex-grow">{feature.desc}</p>
                    <div className="mt-3 sm:mt-4 text-indigo-600 font-medium flex items-center text-sm">
                      <span>Open</span>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Access Section */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 text-white text-center">
                <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Voice Assistant Ready</h2>
                <p className="text-sm sm:text-base text-indigo-100 mb-4 sm:mb-6 max-w-2xl mx-auto">
                  Activate voice commands to control all features hands-free. Try saying "Open email drafter" or "Format a resume".
                </p>
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>Click the microphone icon in the bottom right to activate</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Individual Feature Views */}
          {(activeTab === 'email' || activeTab === 'resume' || activeTab === 'boolean' || activeTab === 'notes' || activeTab === 'organizer' || activeTab === 'matcher') && (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
              <div className="p-4 sm:p-6 md:p-8">
                {activeTab === 'email' && <EmailDrafter userId={userId} />}
                {activeTab === 'resume' && <ResumeFormatter />}
                {activeTab === 'boolean' && <BooleanSkillExtractor userId={userId} />}
                {activeTab === 'notes' && <QuickNotes />}
                {activeTab === 'organizer' && <SmartOrganizer userId={userId} />}
                {activeTab === 'matcher' && <ResumeMatcher userId={userId} />}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </h3>
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base"
                  placeholder="you@example.com"
                  required
                />
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 sm:px-4 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg shadow-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    authMode === 'signin' ? 'Sign In' : 'Sign Up'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="w-full px-4 py-2.5 sm:px-4 sm:py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
              
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  {authMode === 'signin' 
                    ? "Don't have an account? Sign Up" 
                    : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <VoiceAssistant />
    </div>
  );
}

export default App;