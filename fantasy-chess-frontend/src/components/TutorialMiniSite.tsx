import React from 'react';
import { Bell, HelpCircle } from 'lucide-react';
import logo from '../assets/fantasy-league-chess-logo-updated.png';

interface TutorialMiniSiteProps {
  path: string;
  highlightLeaderboard?: boolean;
  leaderboardActive?: boolean;
  onLeaderboardClick?: () => void;
  children: React.ReactNode;
}

const TutorialMiniSite: React.FC<TutorialMiniSiteProps> = ({
  path,
  highlightLeaderboard = false,
  leaderboardActive = false,
  onLeaderboardClick,
  children,
}) => {
  return (
    <div
      data-tutorial-mini-site
      className="rounded-xl overflow-hidden border-2 border-neutral-300 shadow-2xl bg-neutral-200"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-200">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 min-w-0 bg-white rounded-md px-3 py-1 text-[11px] text-neutral-500 truncate font-medium">
          fantasyleaguechess.com{path}
        </div>
      </div>

      <nav data-tutorial-mini-nav className="bg-white border-b-2 border-royalBlue">
        <div className="flex items-center justify-between h-12 px-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 bg-white rounded-full shadow-sm border border-royalBlue shrink-0">
              <img src={logo} alt="Fantasy League Chess" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-extrabold text-royalBlue tracking-wide font-serif truncate">
              Fantasy League Chess
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="hidden sm:inline text-neutral-700 px-2 py-1 rounded-md text-xs font-medium">
              Avatar Shop
            </span>
            <button
              type="button"
              id="mini-leaderboard-link"
              data-tutorial-target="mini-leaderboard-link"
              onClick={onLeaderboardClick}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                leaderboardActive
                  ? 'text-royalBlue underline underline-offset-4'
                  : 'text-neutral-700 hover:text-royalBlue'
              } ${
                highlightLeaderboard
                  ? 'ring-2 ring-blue-400 ring-offset-1 animate-pulse bg-blue-50 text-royalBlue'
                  : ''
              }`}
            >
              Leaderboard
            </button>
            <span className="hidden sm:inline-flex items-center text-neutral-700 px-2 py-1 text-xs font-medium">
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Help
            </span>
            <Bell className="h-4 w-4 text-neutral-700" />
            <span className="text-xs font-semibold text-neutral-900 pl-1">You</span>
          </div>
        </div>
      </nav>

      <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden bg-white">
        {children}
      </div>
    </div>
  );
};

export default TutorialMiniSite;
