import React from 'react';

interface MatchedItem {
  skill?: string;
  tool?: string;
  evidence?: string;
}

interface ProfileDetails {
  name?: string;
  totalYearsExperience?: number;
  currentLocation?: string;
}

interface MatchResult {
  profileDetails?: ProfileDetails;
  compatibilityScore?: number;
  matchedSkills?: MatchedItem[];
  matchedTools?: MatchedItem[];
  skillsScore?: number;
  toolsScore?: number;
  rolesScore?: number;
  industry?: string[];
  decisionRationale?: string;
}

interface SavedMatch {
  _id: string;
  createdAt?: string;
  resumeUrl?: string;
  filename?: string;
  matchResult?: MatchResult;
}

interface ResumeMatchCardProps {
  match: SavedMatch;
  onViewDetails: (id: string) => void;
  onDelete: (id: string) => void;
}

const ResumeMatchCard: React.FC<ResumeMatchCardProps> = ({ 
  match, 
  onViewDetails, 
  onDelete 
}) => {
  const { matchResult, _id, createdAt, resumeUrl, filename } = match;
  
  const {
    profileDetails = {},
    compatibilityScore = 0,
    matchedSkills = [],
    matchedTools = [],
    skillsScore,
    toolsScore,
    rolesScore,
    industry,
    decisionRationale,
  } = matchResult || {};

  const totalYearsExperience = profileDetails.totalYearsExperience;
  const currentLocation = profileDetails.currentLocation;

  const industries =
    Array.isArray(industry) && industry.length > 0 ? industry : [];

  const matchPercentage = Math.min(Math.round(compatibilityScore), 100);

  const getGradientColor = (percent: number) => {
    if (percent >= 80) return "from-green-500 to-emerald-600";
    if (percent >= 50) return "from-yellow-400 to-orange-500";
    return "from-red-400 to-pink-500";
  };

  const renderSkillBadges = (items: MatchedItem[], label: string, color: string) => (
    <div className="mb-2">
      <h5 className="text-xs font-semibold text-gray-500 mb-1">{label}</h5>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No data available</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 3).map((item: MatchedItem, idx: number) => (
            <span
              key={idx}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium ${color}`}
              title={item.evidence || "No evidence found"}
            >
              {item.skill || item.tool}
            </span>
          ))}
          {items.length > 3 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
              +{items.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );

  const renderScoreCard = (label: string, value: number | undefined) => {
    if (value === undefined) return null;
    const color =
      value >= 80
        ? "bg-green-100 text-green-800"
        : value >= 50
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-700";

    return (
      <div
        className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl ${color}`}
      >
        <span className="text-[10px] sm:text-[11px] font-medium">{label}</span>
        <span className="text-xs sm:text-sm font-bold">{value}%</span>
      </div>
    );
  };

  return (
    <div
      key={_id}
      className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-white to-gray-50 p-4 sm:p-6 shadow transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between"
    >
      {/* ---------- Header ---------- */}
      <div>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-base sm:text-lg text-gray-900 truncate">
            {profileDetails?.name || filename || "Untitled Match"}
          </h4>
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline"
            >
              View
            </a>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
          {createdAt
            ? new Date(createdAt).toLocaleDateString()
            : "Unknown date"}
        </p>

        {/* ---------- Compatibility Score ---------- */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 mb-1 overflow-hidden">
          <div
            className={`h-1.5 sm:h-2 rounded-full bg-gradient-to-r ${getGradientColor(
              matchPercentage
            )} transition-all duration-700 ease-in-out`}
            style={{ width: `${matchPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
          <span>Compatibility</span>
          <span>{matchPercentage}%</span>
        </div>

        {/* ---------- Profile Highlights ---------- */}
        {(rolesScore || industries.length > 0 || totalYearsExperience) && (
          <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 mb-3 sm:mb-4 space-y-1">
            {rolesScore && (
              <div className="text-xs sm:text-sm text-gray-700">
                <strong>Role Score:</strong> {rolesScore}%
              </div>
            )}
            {industries.length > 0 && (
              <div className="text-xs sm:text-sm text-gray-700">
                <strong>Industry:</strong>{" "}
                {industries.map((ind, i) => (
                  <span
                    key={i}
                    className="inline-block bg-indigo-50 text-indigo-700 text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full mr-1 mb-1"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            )}
            {totalYearsExperience && (
              <div className="text-xs sm:text-sm text-gray-700">
                <strong>Experience:</strong> {totalYearsExperience} years
              </div>
            )}
          </div>
        )}

        {/* ---------- Skills ---------- */}
        {renderSkillBadges(
          matchedSkills,
          `Skills (${matchedSkills.length})`,
          "bg-green-100 text-green-800"
        )}

        {/* ---------- Tools ---------- */}
        {renderSkillBadges(
          matchedTools,
          `Tools (${matchedTools.length})`,
          "bg-green-50 text-green-700"
        )}

        {/* ---------- Insights Section ---------- */}
        {(skillsScore || toolsScore || rolesScore) && (
          <div className="mt-3 sm:mt-4 border-t border-gray-100 pt-2 sm:pt-3">
            <h5 className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1 sm:mb-2">
              Performance Insights
            </h5>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {renderScoreCard("Skills", skillsScore)}
              {renderScoreCard("Tools", toolsScore)}
              {renderScoreCard("Role Fit", rolesScore)}
            </div>
          </div>
        )}

        {/* ---------- Decision Insights ---------- */}
        {decisionRationale && (
          <div className="mt-3 sm:mt-4 bg-indigo-50 border-l-2 sm:border-l-4 border-indigo-400 p-2 sm:p-3 rounded-lg">
            <h6 className="text-[10px] sm:text-xs font-semibold text-indigo-700 mb-1">
              Decision Rationale
            </h6>
            <p className="text-xs sm:text-sm text-gray-700 leading-snug">
              {decisionRationale}
            </p>
          </div>
        )}

        {/* ---------- Location ---------- */}
        {currentLocation && (
          <div className="text-xs sm:text-sm text-gray-700 mt-3 sm:mt-4">
            <span className="font-medium text-gray-900">📍 Location:</span>{" "}
            {currentLocation}
          </div>
        )}
      </div>

      {/* ---------- Footer ---------- */}
      <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-100">
        <button
          onClick={() => onViewDetails(_id)}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-sm"
        >
          View Details
        </button>
        <button
          onClick={() => onDelete(_id)}
          className="p-1.5 sm:p-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ResumeMatchCard;