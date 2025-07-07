# Fantasy Chess

A fantasy sports betting app for chess where users can join leagues, draft chess players, and compete based on their performance in Titled Tuesday tournaments.

## Features

- **User Authentication**: Sign up and sign in with Supabase Auth
- **League Management**: Create and join public/private leagues with buy-ins
- **Snake Draft System**: Fair drafting of 10 chess players per team
- **Weekly Lineups**: Select 5 players each week for Titled Tuesday competitions
- **Scoring System**: Sophisticated points calculation based on ELO ratings, game results, and move accuracy
- **Real-time Standings**: Track your performance and rank in leagues
- **Coin System**: Virtual currency for league buy-ins

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Build Tool**: Vite

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to your project's SQL Editor
3. Copy and paste the contents of `supabase_setup.sql` into the editor
4. Run the script to create all necessary tables, functions, and policies

### 3. Environment Variables

Create a `.env` file in the `fantasy-chess-frontend` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under "API".

### 4. Install Dependencies

```bash
cd fantasy-chess-frontend
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Database Schema

### Tables

- **users**: Extended user profiles with coin balance
- **chess_players**: Database of chess players with ELO ratings
- **leagues**: League information including members, draft status, and settings
- **teams**: User teams with drafted players
- **lineups**: Weekly lineups with calculated points
- **game_results**: Titled Tuesday game results for scoring

### Key Functions

- `calculate_fantasy_points()`: Implements the scoring algorithm from `fantasy_chess_scoring.py`
- `process_weekly_results()`: Processes all leagues for a given week
- `get_league_standings()`: Returns formatted standings for a league

## How It Works

### 1. League Creation
- Users can create leagues with custom buy-ins and start dates
- Leagues run for one month (from start date to end of month)
- Public leagues are discoverable by all users

### 2. Drafting
- Snake draft system ensures fair player distribution
- Each user drafts 10 chess players from the database
- Draft order is randomized and alternates each round

### 3. Weekly Competition
- Before each Titled Tuesday, users select 5 players from their team
- Points are calculated using the sophisticated scoring algorithm
- Standings are updated automatically after each tournament

### 4. Scoring System
The scoring system considers:
- **Base Points**: Win (2.0), Draw (1.0), Loss (0.0)
- **Upset Bonus**: Up to 5.0 points for beating expectations
- **Accuracy Bonus**: Up to 0.3 points for better-than-average move accuracy
- **Total Range**: -6.0 to 12.0 points per game

## Backend Integration

### Processing Titled Tuesday Results

After each Titled Tuesday tournament:

1. **Run your PGN script**: Execute `pgn_to_csv.py` which will:
   - Parse the PGN file
   - Calculate fantasy points using your algorithm
   - Insert game data into the `games` table with pre-calculated `white_points` and `black_points`
   - Update the `player_accuracy` table

2. **Process Results**: Call the `process_weekly_results()` function to sum the points for all active leagues:

```sql
SELECT process_weekly_results('2024-01-16'); -- Date of Titled Tuesday
```

The `process_weekly_results()` function will:
- Find all active leagues for the given week
- For each user's lineup, sum the pre-calculated points from the `games` table
- Update the `lineups` table with the total weekly score

### Data Flow

1. **PGN Processing**: `pgn_to_csv.py` → `games` table (with `white_points`, `black_points`)
2. **Fantasy Scoring**: `process_weekly_results()` → `lineups` table (sums points for each user)
3. **Frontend Display**: App reads from `lineups` table to show standings

## Project Structure

```
fantasy-chess-frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Auth)
│   ├── lib/               # Utility libraries (Supabase client)
│   ├── pages/             # Page components
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # App entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── supabase_setup.sql     # Database setup script
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue on GitHub or contact the development team. 