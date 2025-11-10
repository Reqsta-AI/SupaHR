import React, { useState, useRef } from 'react';

// Mock types for the libraries we'll use
interface MammothResult {
  value: string;
}

interface PdfjsDocument {
  getPage: (page: number) => Promise<any>;
  numPages: number;
}

interface PdfjsGlobal {
  getDocument: (data: ArrayBuffer) => Promise<{ promise: Promise<PdfjsDocument> }>;
}

// Mock the libraries - in a real implementation these would be imported
const mammoth: { extractRawText: (input: any) => Promise<MammothResult> } = {
  extractRawText: async () => ({ value: 'Extracted text from DOC/DOCX' })
};

const pdfjsLib: PdfjsGlobal = {
  getDocument: async (data: ArrayBuffer) => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async (page: number) => ({
        getTextContent: async () => ({ items: [{ str: 'Extracted text from PDF' }] })
      })
    })
  })
};

const saveAs = (blob: Blob, filename: string) => {
  // Mock implementation
  console.log(`Would save file: ${filename}`);
};

const ResumeFormatter: React.FC<{ triggerRefresh?: () => void }> = ({ triggerRefresh }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [rawText, setRawText] = useState('');
  const [formattedText, setFormattedText] = useState('');
  const [preview, setPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formatStyle, setFormatStyle] = useState('modern');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setFileSize(formatFileSize(selectedFile.size));
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setFileSize(formatFileSize(droppedFile.size));
      setError('');
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const extractText = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError('');
    
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      
      let extractedText = '';
      
      if (fileExtension === 'pdf') {
        // Extract text from PDF
        const pdfData = await pdfjsLib.getDocument(arrayBuffer);
        const pdf = await pdfData.promise;
        const numPages = pdf.numPages;
        let textContent = '';
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map((item: any) => item.str).join(' ') + '\n\n';
        }
        
        extractedText = textContent;
      } else if (fileExtension === 'doc' || fileExtension === 'docx') {
        // Extract text from DOC/DOCX
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else {
        setError('Unsupported file format. Please upload PDF, DOC, or DOCX files.');
        setIsProcessing(false);
        return;
      }
      
      setRawText(extractedText);
      formatResume(extractedText);
    } catch (err) {
      setError('Failed to extract text from the file. Please try another file.');
      console.error('Extraction error:', err);
      setIsProcessing(false);
    }
  };

  const formatResume = (text: string) => {
    // Simple parsing logic to extract sections
    // In a real implementation, this would be more sophisticated
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Mock parsing - in reality this would use more advanced techniques
    const name = lines[0] || 'Candidate Name';
    const contactInfo = lines.slice(1, 4).join(' | ') || 'email@example.com | (123) 456-7890 | Location';
    
    let profileSummary = '';
    let skills = '';
    let experience = '';
    let education = '';
    
    // Simple heuristic to identify sections
    const profileStart = lines.findIndex(line => 
      line.toLowerCase().includes('summary') || 
      line.toLowerCase().includes('objective') ||
      line.toLowerCase().includes('profile')
    );
    
    const skillsStart = lines.findIndex(line => 
      line.toLowerCase().includes('skills') || 
      line.toLowerCase().includes('technologies') ||
      line.toLowerCase().includes('competencies')
    );
    
    const experienceStart = lines.findIndex(line => 
      line.toLowerCase().includes('experience') || 
      line.toLowerCase().includes('work') ||
      line.toLowerCase().includes('employment')
    );
    
    const educationStart = lines.findIndex(line => 
      line.toLowerCase().includes('education') || 
      line.toLowerCase().includes('academic')
    );
    
    // Create formatted resume based on selected style
    let formatted = '';
    
    switch (formatStyle) {
      case 'modern':
        formatted = `${name}
${contactInfo}

PROFILE SUMMARY
${profileSummary || 'Professional with experience in relevant field.'}

SKILLS
${skills || 'Key skills and competencies relevant to the position.'}

EXPERIENCE
${experience || 'Relevant work experience with accomplishments and responsibilities.'}

EDUCATION
${education || 'Educational background and relevant qualifications.'}`;
        break;
        
      case 'classic':
        formatted = `${name}
${contactInfo}

PROFILE SUMMARY
${profileSummary || 'Experienced professional with a strong background in the field.'}

SKILLS
${skills || 'Technical and soft skills applicable to the role.'}

PROFESSIONAL EXPERIENCE
${experience || 'Detailed work history with key achievements.'}

EDUCATION
${education || 'Formal education and professional development.'}`;
        break;
        
      case 'creative':
        formatted = `${name}
${contactInfo}

PROFILE SUMMARY
${profileSummary || 'Creative professional with innovative approach to challenges.'}

CORE COMPETENCIES
${skills || 'Specialized skills and areas of expertise.'}

CAREER HIGHLIGHTS
${experience || 'Notable achievements and professional milestones.'}

ACADEMIC BACKGROUND
${education || 'Educational qualifications and certifications.'}`;
        break;
        
      case 'ats':
        formatted = `${name}
${contactInfo}

PROFILE SUMMARY
${profileSummary || 'Professional summary optimized for applicant tracking systems.'}

SKILLS
${skills || 'Technical skills, software proficiencies, and hard skills.'}

WORK EXPERIENCE
${experience || 'Chronological work history with measurable results.'}

EDUCATION
${education || 'Degrees, certifications, and relevant coursework.'}`;
        break;
        
      default:
        formatted = `${name}
${contactInfo}

PROFILE SUMMARY
${profileSummary || 'Professional summary.'}

SKILLS
${skills || 'Key skills.'}

EXPERIENCE
${experience || 'Work experience.'}

EDUCATION
${education || 'Education history.'}`;
    }
    
    setFormattedText(formatted);
    setIsProcessing(false);
    setPreview(true);
  };

  const downloadResume = async () => {
    if (!formattedText) return;
    
    try {
      // In a real implementation, we would use the docx library to create a document
      // For now, we'll create a simple text file as a placeholder
      const blob = new Blob([formattedText], { type: 'text/plain' });
      saveAs(blob, `formatted-resume-${formatStyle}.docx`);
    } catch (err) {
      setError('Failed to generate download. Please try again.');
      console.error('Download error:', err);
    }
  };

  const resetFormatter = () => {
    setFile(null);
    setFileName('');
    setFileSize('');
    setRawText('');
    setFormattedText('');
    setPreview(false);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <span className="mr-2 sm:mr-3">📄</span> Resume Formatter
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">Format resumes for maximum impact and ATS compatibility</p>
      </div>
      
      {!preview ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
              <span className="mr-2">📤</span> Upload Your Resume
            </h3>
            
            <div className="mb-6 sm:mb-8">
              <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2 sm:mb-3">
                Format Style
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { id: 'modern', label: 'Modern', description: 'Clean, contemporary design' },
                  { id: 'classic', label: 'Classic', description: 'Traditional, professional look' },
                  { id: 'creative', label: 'Creative', description: 'Bold, innovative layout' },
                  { id: 'ats', label: 'ATS Optimized', description: 'Applicant Tracking System friendly' }
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left border-2 transition-all duration-200 ${
                      formatStyle === style.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm sm:text-base">{style.label}</div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-dashed border-gray-300">
              <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3 flex items-center">
                <span className="mr-2">⚙️</span> Formatting Options
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Professional layout design
                </li>
                <li className="flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ATS-friendly formatting
                </li>
                <li className="flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Keyword optimization
                </li>
                <li className="flex items-center text-sm sm:text-base">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  One-click download
                </li>
              </ul>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center">
              <span className="mr-2">📁</span> Upload Resume
            </h3>
            
            <div 
              className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center cursor-pointer hover:border-indigo-500 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 hover:from-indigo-50 hover:to-purple-50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                  <svg className="animate-spin h-12 w-12 sm:h-16 sm:w-16 text-indigo-600 mb-4 sm:mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Processing Your Resume</h4>
                  <p className="text-base sm:text-lg text-gray-600">Extracting text and formatting...</p>
                  <div className="mt-4 sm:mt-6 w-full max-w-xs bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full animate-progress" style={{ width: '70%' }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4 sm:mb-5">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Upload Your Resume</h4>
                  <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-5">Drag & drop your file here or click to browse</p>
                  <button 
                    className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg sm:rounded-xl px-4 py-2 sm:px-6 sm:py-3 shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5 text-sm sm:text-base"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileInput();
                    }}
                  >
                    <span>Select File</span>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="sr-only" 
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                    />
                  </button>
                  <p className="text-gray-500 text-xs sm:text-sm mt-3 sm:mt-4">
                    Supports PDF, DOC, DOCX up to 10MB
                  </p>
                  
                  {fileName && (
                    <div className="mt-5 sm:mt-6 w-full text-left bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-2 sm:ml-3">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{fileName}</p>
                          <p className="text-xs text-gray-500">{fileSize}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mt-2 sm:mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-xs sm:text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          extractText();
                        }}
                        disabled={!file}
                      >
                        Format Resume
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <p className="font-medium text-sm sm:text-base">Error:</p>
                <p className="text-sm sm:text-base">{error}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex flex-wrap justify-between items-center mb-6 sm:mb-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center">
                <span className="mr-2">✅</span> Formatted Resume
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">Your resume has been successfully formatted</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 md:mt-0">
              <button
                type="button"
                className="flex items-center px-3 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg sm:rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-sm sm:text-base"
                onClick={downloadResume}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden xs:inline">Download</span>
                <span className="xs:hidden">DL</span>
              </button>
              <button
                type="button"
                className="flex items-center px-3 py-2 sm:px-5 sm:py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all duration-300 text-sm sm:text-base"
                onClick={resetFormatter}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden xs:inline">Format Another</span>
                <span className="xs:hidden">Reset</span>
              </button>
            </div>
          </div>
          
          <div className="border-2 border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-white to-gray-50">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 h-[400px] sm:h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm sm:text-base">
                  {formattedText}
                </pre>
              </div>
              
              <div className="mt-4 sm:mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-indigo-100 text-indigo-800">
                  {formatStyle.charAt(0).toUpperCase() + formatStyle.slice(1)} Style
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                  Formatted
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 text-purple-800">
                  Ready to Download
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeFormatter;