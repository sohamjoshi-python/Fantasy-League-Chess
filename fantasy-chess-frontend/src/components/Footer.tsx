import React from 'react';
import { MessageCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-50 border-t border-neutral-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <span className="text-sm text-neutral-600">2026 Fantasy League Chess</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link
              to="/feedback"
              className="flex items-center space-x-2 text-sm text-neutral-600 hover:text-royalBlue transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Feedback & Bugs</span>
            </Link>
            
            <a 
              href="mailto:support@fantasyleaguechess.com"
              className="flex items-center space-x-2 text-sm text-neutral-600 hover:text-royalBlue transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Contact Support</span>
            </a>
            

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 