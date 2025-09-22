import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Play, Trophy } from 'lucide-react';
import logo from '../assets/fantasy-league-chess-logo-updated.png';
import { getBrandName } from '../utils/browserDetection';

const EmailConfirmationSuccess: React.FC = () => {
  const navigate = useNavigate();

  const handleStartTutorial = () => {
    navigate('/tutorial');
  };

  const handleSkipTutorial = () => {
    navigate('/join-league');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-10">
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-6 bg-white rounded-full p-2 shadow-lg border-4 border-green-500">
            <img src={logo} alt={`${getBrandName()} Logo`} className="w-full h-full object-contain" />
          </div>

          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎉 Email Confirmed!
          </h1>

          {/* Subtitle */}
          <h2 className="text-xl text-gray-700 mb-6">
            Welcome to {getBrandName()}!
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">
            Your account is now active and ready to go! Let's get you started with a quick 5-minute tutorial 
            that will teach you everything you need to know about Fantasy Chess.
          </p>

          {/* Tutorial Benefits */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">What you'll learn:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-center space-x-3">
                <Trophy className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">How to draft players</span>
              </div>
              <div className="flex items-center space-x-3">
                <Trophy className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">Team management</span>
              </div>
              <div className="flex items-center space-x-3">
                <Trophy className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">Scoring system</span>
              </div>
              <div className="flex items-center space-x-3">
                <Trophy className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800">Marketplace trading</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Primary CTA */}
            <button
              onClick={handleStartTutorial}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-8 rounded-xl text-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <Play className="w-6 h-6" />
              <span>Start Tutorial (5 minutes)</span>
            </button>

            {/* Secondary CTA */}
            <button
              onClick={handleSkipTutorial}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg text-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Skip Tutorial & Join League
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-sm text-gray-500 mt-6">
            Don't worry - you can always access the tutorial later from the Help menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationSuccess;
