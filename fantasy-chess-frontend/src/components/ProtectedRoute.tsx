import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royalBlue"></div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-xl p-8 text-center border-2 border-royalBlue/20">
            {/* Lock Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-royalBlue/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-royalBlue" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Authentication Required
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              Please log in to your account to access this page. If you don't have an account yet, you can create one for free!
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/"
                className="w-full bg-royalBlue hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center group"
              >
                <LogIn className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                Sign In / Sign Up
              </Link>
              
              <Link
                to="/"
                className="w-full border-2 border-gray-300 hover:border-royalBlue text-gray-700 hover:text-royalBlue font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                ← Back to Home
              </Link>
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                New to Fantasy Chess League?{' '}
                <Link to="/help" className="text-royalBlue hover:underline">
                  Learn how to play
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;