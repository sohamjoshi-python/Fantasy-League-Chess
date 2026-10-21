import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Coins, Crown, Plus, Store, Trophy, Users } from 'lucide-react';

type StepId =
  | 'welcome'
  | 'league-selection'
  | 'league-overview'
  | 'marketplace-start'
  | 'team-building'
  | 'marketplace-complete'
  | 'lineup-selection'
  | 'leaderboard'
  | 'how-it-works'
  | 'currency-and-trading'
  | 'profile';

const ORDER: StepId[] = [
  'welcome',
  'league-selection',
  'league-overview',
  'marketplace-start',
  'team-building',
  'marketplace-complete',
  'lineup-selection',
  'leaderboard',
  'how-it-works',
  'currency-and-trading',
  'profile',
];

const HINT: Record<StepId, string> = {
  welcome: 'Home is empty until you join.',
  'league-selection': 'This practice league costs nothing.',
  'league-overview': 'Standings, lineup, and the draft live here.',
  'marketplace-start': 'You start with 50 coins.',
  'team-building': 'Magnus took all 50. One more for this example.',
  'marketplace-complete': 'Nobody scores until they are in the lineup.',
  'lineup-selection': 'Tap who plays, then save.',
  leaderboard: 'Your league is on this page. Everyone else is under Leaderboard.',
  'how-it-works': 'A month of real Tuesday games. Upsets score big.',
  'currency-and-trading': 'Gems are yours. Coins stay in the league.',
  profile: "That's the whole loop.",
};

const MobileTutorial = () => {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [starter, setStarter] = useState<string | null>(null);
  const stepId = ORDER[stepIndex];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    setLeaderboardOpen(false);
    setStarter(null);
  }, [stepIndex]);

  const finish = () => navigate('/dashboard');
  const skip = () => navigate('/join-league');
  const advance = () => {
    if (stepIndex >= ORDER.length - 1) {
      finish();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  const hint =
    stepId === 'leaderboard' && leaderboardOpen
      ? 'Wins and points across every league.'
      : stepId === 'lineup-selection' && !starter
        ? 'Tap who plays this week.'
        : stepId === 'lineup-selection'
          ? 'Save it. You can change this before the round.'
          : HINT[stepId];

  const ui = (
    <div className="phone-tutorial fixed inset-0 z-[80] flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0">
        <span className="text-sm font-extrabold text-royalBlue font-serif">Fantasy League Chess</span>
        <button type="button" onClick={skip} className="min-h-0 text-sm font-semibold text-slate-400 px-1">
          Skip
        </button>
      </div>

      <div className="shrink-0 px-3 pt-3">
        <div className="relative">
          <div className="absolute -left-1 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#1e293b] bg-[#F5C542] shadow-[2px_2px_0_#1e293b]">
            <Crown className="h-5 w-5 text-[#1e293b]" />
          </div>
          <div className="rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf6] py-2.5 pl-12 pr-3 shadow-[3px_3px_0_#1e293b]">
            <p className="coach-script text-[1.65rem] leading-none text-[#1e293b]">{hint}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          {ORDER.map((id, index) => (
            <span
              key={id}
              className={`h-1 flex-1 rounded-full ${index <= stepIndex ? 'bg-royalBlue' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      <div key={`${stepId}-${leaderboardOpen}`} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <Screen
          stepId={stepId}
          leaderboardOpen={leaderboardOpen}
          starter={starter}
          onAdvance={advance}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onPick={setStarter}
          onFinish={finish}
        />
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(ui, document.body);
};

const Screen = ({
  stepId,
  leaderboardOpen,
  starter,
  onAdvance,
  onOpenLeaderboard,
  onPick,
  onFinish,
}: {
  stepId: StepId;
  leaderboardOpen: boolean;
  starter: string | null;
  onAdvance: () => void;
  onOpenLeaderboard: () => void;
  onPick: (name: string) => void;
  onFinish: () => void;
}) => {
  if (stepId === 'welcome') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <Crown className="w-12 h-12 text-royalBlue mb-3" />
        <h2 className="text-xl font-bold text-neutral-900">No active league</h2>
        <p className="text-sm text-neutral-500 mt-1 mb-6">Join or create one to start playing.</p>
        <Pulse>
          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex items-center gap-2 bg-[#1e293b] text-white px-5 py-3 rounded-lg font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Join a League
          </button>
        </Pulse>
      </div>
    );
  }

  if (stepId === 'league-selection') {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900">Public leagues</h2>
        <LeagueCard
          name="Tutorial Champions League"
          detail="0 gems · Beginner · Starts now"
          members="8/12"
          live
          onJoin={onAdvance}
        />
        <LeagueCard name="Advanced Strategy League" detail="25 gems · Advanced" members="10/16" />
        <LeagueCard name="Casual Weekend Warriors" detail="10 gems · Casual" members="6/10" />
      </div>
    );
  }

  if (stepId === 'league-overview') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-neutral-900 text-center font-serif">Tutorial Champions</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat value="8" label="Members" />
          <Stat value="0" label="Gem buy-in" />
          <Stat value="1st" label="You" />
        </div>
        <div className="rounded-xl border border-neutral-200 p-3">
          <p className="text-xs font-semibold text-neutral-500 mb-2">Standings</p>
          <Row left="1  You" right="0 pts" hot />
          <Row left="2  ChessWizard92" right="0 pts" />
        </div>
        <div className="rounded-xl border border-dashed border-neutral-300 p-3 text-sm text-neutral-500">
          Lineup · not set
        </div>
        <Pulse>
          <button
            type="button"
            onClick={onAdvance}
            className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold"
          >
            <Store className="w-5 h-5" />
            Start Turn-Based Marketplace
          </button>
        </Pulse>
      </div>
    );
  }

  if (stepId === 'marketplace-start' || stepId === 'team-building') {
    const second = stepId === 'team-building';
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-700">Your turn · 1 of 20</p>
          <span className={`text-sm font-bold rounded-full px-3 py-1 ${second ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
            {second ? '0 coins' : '50 coins'}
          </span>
        </div>
        {second ? (
          <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-3 py-3">
            <div>
              <p className="font-semibold text-green-800">Magnus Carlsen</p>
              <p className="text-xs text-green-700">ELO 2850 · Owned</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        ) : (
          <PlayerOffer name="Magnus Carlsen" elo="2850" price="50 coins" action="buy" onBuy={onAdvance} />
        )}
        <PlayerOffer name="Fabiano Caruana" elo="2780" price="45 coins" action={second ? 'short' : 'later'} />
        <PlayerOffer
          name="Ding Liren"
          elo="2750"
          price="15 coins"
          action={second ? 'buy' : 'locked'}
          onBuy={onAdvance}
        />
        {second && <p className="text-xs text-orange-700">At 0 coins you leave the rest of the draft.</p>}
      </div>
    );
  }

  if (stepId === 'marketplace-complete') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-neutral-900">Current lineup</h2>
          <Pulse>
            <button type="button" onClick={onAdvance} className="text-royalBlue font-semibold text-sm px-2 py-1">
              Edit
            </button>
          </Pulse>
        </div>
        <p className="text-sm text-neutral-500 text-center py-6 border border-dashed border-neutral-300 rounded-xl">
          No lineup set for this week
        </p>
        <p className="text-xs font-semibold text-neutral-500">Your team</p>
        <Plain name="Magnus Carlsen" meta="ELO 2850" />
        <Plain name="Ding Liren" meta="ELO 2750" />
      </div>
    );
  }

  if (stepId === 'lineup-selection') {
    const players = ['Magnus Carlsen', 'Fabiano Caruana', 'Ding Liren'];
    return (
      <div className="space-y-3">
        <h2 className="font-bold text-neutral-900">Set your lineup</h2>
        {players.map((name) => {
          const selected = starter === name;
          const showPulse = !starter && name === 'Magnus Carlsen';
          const card = (
            <button
              type="button"
              onClick={() => onPick(name)}
              className={`w-full text-left rounded-xl px-3 py-3 border-2 ${
                selected ? 'border-royalBlue bg-blue-50' : 'border-neutral-200 bg-white'
              }`}
            >
              <span className="font-semibold text-neutral-900">{name}</span>
              {selected && <span className="float-right text-xs font-bold text-royalBlue">Playing</span>}
            </button>
          );
          return showPulse ? <Pulse key={name}>{card}</Pulse> : <div key={name}>{card}</div>;
        })}
        {starter ? (
          <Pulse>
            <button
              type="button"
              onClick={onAdvance}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
            >
              Save Lineup
            </button>
          </Pulse>
        ) : (
          <button type="button" disabled className="w-full bg-neutral-200 text-neutral-400 py-3 rounded-lg font-semibold">
            Save Lineup
          </button>
        )}
      </div>
    );
  }

  if (stepId === 'leaderboard' && !leaderboardOpen) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-royalBlue pb-2">
          <span className="text-sm font-extrabold text-royalBlue font-serif">FLC</span>
          <Pulse>
            <button type="button" onClick={onOpenLeaderboard} className="text-sm font-semibold text-neutral-800 underline decoration-royalBlue underline-offset-4">
              Leaderboard
            </button>
          </Pulse>
        </div>
        <h2 className="font-bold text-neutral-900">Tutorial Champions</h2>
        <Row left="1  You" right="12.50 pts" hot />
        <Row left="2  ChessWizard92" right="11.90 pts" />
        <Row left="3  KnightRider" right="11.50 pts" />
      </div>
    );
  }

  if (stepId === 'leaderboard' && leaderboardOpen) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          All leagues
        </h2>
        <Row left="1  ChessWizard92" right="3 wins" />
        <Row left="2  You" right="2 wins" hot />
        <Row left="3  KnightRider" right="2 wins" />
        <Row left="4  QueenSlayer" right="4 wins" />
        <button type="button" onClick={onAdvance} className="w-full text-royalBlue font-semibold py-2">
          Continue
        </button>
      </div>
    );
  }

  if (stepId === 'how-it-works') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full bg-neutral-100 px-3 py-1">1 month</span>
          <span className="rounded-full bg-neutral-100 px-3 py-1">Bots fill empty seats</span>
        </div>
        <Result favorite="2850" underdog="2600" winner="underdog" points="+8" label="Upset" />
        <Result favorite="2850" underdog="2600" winner="favorite" points="+1" label="Expected win" />
        <button type="button" onClick={onAdvance} className="w-full text-royalBlue font-semibold py-2">
          Continue
        </button>
      </div>
    );
  }

  if (stepId === 'currency-and-trading') {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border-2 border-royalBlue p-4">
          <p className="text-lg font-bold text-neutral-900">💎 Gems</p>
          <p className="text-sm text-neutral-600 mt-1">Your account</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-royalBlue">
            <span className="rounded-full bg-blue-50 px-3 py-1">Join a league</span>
            <span className="rounded-full bg-blue-50 px-3 py-1">Avatars</span>
            <span className="rounded-full bg-blue-50 px-3 py-1">Prizes</span>
          </div>
        </div>
        <div className="rounded-2xl border-2 border-amber-400 p-4">
          <p className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-700" />
            Coins
          </p>
          <p className="text-sm text-neutral-600 mt-1">Only inside this league</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-amber-50 py-2">
              <p className="text-xl font-bold text-amber-800">50</p>
              <p className="text-[11px] text-amber-700">at the draft</p>
            </div>
            <div className="rounded-xl bg-amber-50 py-2">
              <p className="text-xl font-bold text-amber-800">50</p>
              <p className="text-[11px] text-amber-700">every week</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={onAdvance} className="w-full text-royalBlue font-semibold py-2">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2 text-sm">
        <Done text="Joined a free league" />
        <Done text="Drafted with coins" />
        <Done text="Set a lineup" />
        <Done text="Checked the leaderboard" />
      </div>
      <div className="mt-auto pt-6">
        <Pulse>
          <button
            type="button"
            onClick={onFinish}
            className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-bold"
          >
            <Trophy className="w-5 h-5" />
            Start Playing
          </button>
        </Pulse>
      </div>
    </div>
  );
};

const Pulse = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl ring-4 ring-amber-300 ring-offset-2">{children}</div>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-xl border-2 border-amber-200 p-2 text-center">
    <p className="font-bold text-neutral-900">{value}</p>
    <p className="text-[11px] text-neutral-500">{label}</p>
  </div>
);

const Row = ({ left, right, hot = false }: { left: string; right: string; hot?: boolean }) => (
  <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${hot ? 'bg-blue-50 border border-royalBlue' : 'bg-neutral-50 mt-1'}`}>
    <span className="font-semibold text-neutral-900">{left}</span>
    <span className="text-neutral-600">{right}</span>
  </div>
);

const LeagueCard = ({
  name,
  detail,
  members,
  live = false,
  onJoin,
}: {
  name: string;
  detail: string;
  members: string;
  live?: boolean;
  onJoin?: () => void;
}) => (
  <div className={`rounded-xl border p-3 ${live ? 'border-royalBlue bg-blue-50' : 'border-neutral-200 opacity-70'}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-600 mt-1">{detail}</p>
        <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {members}
        </p>
      </div>
      {live && onJoin ? (
        <Pulse>
          <button type="button" onClick={onJoin} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
            Join
          </button>
        </Pulse>
      ) : (
        <button type="button" disabled className="bg-neutral-200 text-neutral-400 text-sm font-semibold px-4 py-2 rounded-lg">
          Join
        </button>
      )}
    </div>
  </div>
);

const PlayerOffer = ({
  name,
  elo,
  price,
  action,
  onBuy,
}: {
  name: string;
  elo: string;
  price: string;
  action: 'buy' | 'locked' | 'short' | 'later';
  onBuy?: () => void;
}) => (
  <div className={`rounded-xl border p-3 ${action === 'buy' ? 'border-royalBlue bg-blue-50' : 'border-neutral-200'}`}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-500">ELO {elo}</p>
        <p className={`text-sm font-bold mt-1 ${action === 'short' ? 'text-neutral-400' : 'text-green-700'}`}>{price}</p>
      </div>
      {action === 'buy' && onBuy ? (
        <Pulse>
          <button type="button" onClick={onBuy} className="bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded-lg">
            Buy Player
          </button>
        </Pulse>
      ) : (
        <button type="button" disabled className="bg-neutral-200 text-neutral-400 text-xs font-semibold px-3 py-2 rounded-lg">
          {action === 'locked' ? 'Locked' : action === 'later' ? 'Next turn' : 'Too expensive'}
        </button>
      )}
    </div>
  </div>
);

const Plain = ({ name, meta }: { name: string; meta: string }) => (
  <div className="rounded-xl border border-neutral-200 px-3 py-2">
    <p className="font-medium text-neutral-900">{name}</p>
    <p className="text-xs text-neutral-500">{meta}</p>
  </div>
);

const Result = ({
  favorite,
  underdog,
  winner,
  points,
  label,
}: {
  favorite: string;
  underdog: string;
  winner: 'favorite' | 'underdog';
  points: string;
  label: string;
}) => (
  <div className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between gap-3">
    <div className="text-sm text-neutral-700">
      <span className={winner === 'underdog' ? 'font-bold text-neutral-900' : ''}>{underdog}</span>
      <span className="mx-1 text-neutral-400">vs</span>
      <span className={winner === 'favorite' ? 'font-bold text-neutral-900' : ''}>{favorite}</span>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
    <p className={`text-2xl font-extrabold ${points === '+8' ? 'text-green-600' : 'text-neutral-500'}`}>{points}</p>
  </div>
);

const Done = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-green-900">
    <CheckCircle className="w-4 h-4 text-green-600" />
    {text}
  </div>
);

export default MobileTutorial;
