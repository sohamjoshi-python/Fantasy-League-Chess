# Fantasy Chess League Application - Complete Feature Documentation

## Overview
Fantasy Chess League is a comprehensive web application that allows users to create and participate in fantasy chess leagues. Users draft chess players, manage teams, trade players, and compete in weekly tournaments with automated scoring based on real chess game results.

## Core Architecture

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

### Database Schema
- **Users**: Authentication and profile management
- **Leagues**: League configuration and settings
- **Chess Players**: Database of chess players with ELO ratings
- **Teams**: User teams within leagues
- **Lineups**: Weekly team configurations
- **Transactions**: Trading and coin system history
- **Coin Balances**: League-specific coin management
- **Bots**: AI players for automated gameplay

## Feature Categories

## 1. Authentication & User Management

### User Registration & Login
- Email/password authentication via Supabase Auth
- User profile creation with display names
- Session management and automatic login persistence
- Password reset functionality

### User Profiles
- Display name customization
- Profile picture support
- User statistics and league participation history
- Achievement tracking

## 2. League Management

### League Creation
- **League Settings**:
  - League name and description
  - Maximum players per team (default: 10)
  - Draft type selection (Snake Draft or Turn-Based Marketplace)
  - Entry fee and prize distribution
  - League start date and duration
  - Public/private league options

### League Types
- **Public Leagues**: Open to all users, discoverable
- **Private Leagues**: Invite-only with join codes
- **Bot Leagues**: Include AI players for smaller groups

### League Administration
- **Owner Controls**:
  - Start/stop league operations
  - Manage league members
  - Configure league settings
  - Process weekly results
  - Handle disputes and rule enforcement

## 3. Draft System

### Snake Draft
- **Traditional Draft Format**:
  - Sequential player selection
  - Snake order (1,2,3,3,2,1,1,2,3...)
  - Real-time draft board
  - Timer-based turns (configurable)
  - Auto-pick for inactive users

### Turn-Based Marketplace
- **Advanced Draft System**:
  - Coin-based economy
  - Dynamic player pricing based on ELO
  - Turn-based player acquisition
  - Real-time marketplace updates
  - Bot integration for automated trading

#### Marketplace Features
- **Player Pricing**: ELO-based pricing tiers (5-50 coins)
- **Turn Management**: Sequential turns with automatic advancement
- **Bot Integration**: AI players make intelligent trading decisions
- **Auto-Skip Logic**: Users/bots with 0 coins automatically removed
- **Skip Turn**: Users can skip their turn without being removed from draft
- **Real-time Updates**: Live marketplace state synchronization

## 4. Team Management

### Team Building
- **Player Acquisition**:
  - Draft players during league creation
  - Trade players in marketplace
  - Manage team size limits
  - View player statistics and ELO ratings

### Team Configuration
- **Weekly Lineups**:
  - Select active players for weekly competitions
  - Bench inactive players
  - Strategic lineup optimization
  - Deadline management for lineup changes

### Player Information
- **Chess Player Database**:
  - Comprehensive player profiles
  - ELO ratings and rankings
  - Country and federation information
  - Chess.com profile links
  - Performance statistics

## 5. Trading & Marketplace System

### Player Trading
- **Marketplace Features**:
  - Buy/sell players with other users
  - Set custom prices for player sales
  - Browse available players
  - Transaction history tracking

### Coin Economy
- **Coin System**:
  - Starting coin balance (50 coins)
  - Player pricing based on ELO tiers
  - Weekly coin distribution
  - Transaction logging and history
  - Coin balance tracking per league

### Trading Mechanics
- **Buy/Sell Operations**:
  - Instant marketplace purchases
  - Custom pricing for player sales
  - Transaction confirmation dialogs
  - Automatic coin deduction/addition
  - Trade history and analytics

## 6. Scoring & Competition System

### Weekly Scoring
- **Automated Scoring**:
  - Real chess game result integration
  - ELO-based performance calculations
  - Weekly tournament processing
  - Standings and leaderboard updates

### Detailed Point System & Calculation

#### Core Scoring Principles
Fantasy points are calculated **per game** from Titled Tuesday results. Upsets versus Elo are the main term. Accuracy (ACL) is a smaller adjustment against **that player's own historical average**, not the rest of the field.

1. **Game Result**: a small bonus for winning or drawing
2. **Surprise**: extra points when the result beats Elo expectation
3. **ACL vs personal baseline**: modest bonus or penalty for playing cleaner or sloppier than usual
4. **Consistency bonus**: +3 if the game is at least 5 ACL better than that player's average

Tournament place (top 10, top 100, etc.) is not scored.

#### Complete Scoring Formula

```
Raw Points =
  0.5 × Game Result
  + 7.0 × (Result − Expected Score)
  + 0.8 × (Player's Usual ACL − This Game's ACL)
  + 3.0 if this game is at least 5 ACL better than their usual ACL

Final Points = Raw Points, capped between −12 and +12

Where:
- Game Result = 1.0 for a win, 0.5 for a draw, 0.0 for a loss
- Expected Score = 1 / (1 + 10^((opponent_elo − player_elo) / 400))
- Lower ACL is better (fewer centipawns lost vs engine best moves)
```

A Super GM who wins as expected scores little from surprise. A CM who beats a much higher-rated opponent scores a large surprise bonus. Super GMs do not get extra points just for being more accurate than lower-rated players.

#### Example Calculations

**Example 1: Favorite win, typical accuracy**
- 3390 player beats a 2670 opponent (expected score ≈ 0.98)
- Game ACL matches their usual ACL

```
Raw = 0.5×1.0 + 7.0×(1.0 − 0.98) + 0.8×0 = 0.64
Final = 0.64
```

**Example 2: Upset win, typical accuracy**
- 2260 player beats a 2770 opponent (expected score ≈ 0.05)
- Game ACL matches their usual ACL

```
Raw = 0.5×1.0 + 7.0×(1.0 − 0.05) + 0.8×0 = 7.15
Final = 7.15
```

**Example 3: Upset plus a clearly cleaner-than-usual game**
- Same 2260 vs 2770 win
- Game ACL is 5 better than their usual ACL (consistency bonus applies)

```
Raw = 0.5 + 7.0×0.95 + 0.8×5 + 3.0 = 14.15
Final = 12.00 (cap)
```

#### Scoring Implementation Details

**Data Sources:**
- Chess.com tournament results
- Stockfish ACL from game PGNs
- Each player's historical average ACL
- Game-by-game Elo from the tournament headers

**Processing Schedule:**
- Weekly scoring runs every Monday at 2 AM PT
- Results processed for all active leagues
- Standings updated automatically
- Email notifications sent to league members

**Edge Cases:**
- **No Games Played**: 0 points (no penalty)
- **Missing ACL**: score result and Elo surprise only (no accuracy adjustment)
- **No tournament that week**: 0 points from games
- **Disputed Results**: Manual review and adjustment

#### League-Specific Scoring

**Public Leagues:**
- Standard scoring formula applies
- All players scored equally
- Public leaderboards updated

**Private Leagues:**
- Custom scoring multipliers available
- League-specific bonus points
- Private standings and results

**Bot Leagues:**
- Bots scored using same formula
- Automated result processing
- Fair competition with human players

### Competition Management
- **Tournament Features**:
  - Weekly competition cycles
  - Automated result processing
  - Standings calculation
  - Prize distribution
  - Performance analytics

## 7. Bot System

### AI Player Integration
- **Bot Features**:
  - Automated draft participation
  - Intelligent player selection
  - Marketplace trading decisions
  - Strategic lineup management
  - Coin balance optimization

### Bot Behavior
- **Trading Logic**:
  - ELO-based player evaluation
  - Market price analysis
  - Team composition optimization
  - Risk assessment and decision making
  - Automatic turn processing

### Bot Management
- **Administrative Controls**:
  - Bot creation and configuration
  - Performance monitoring
  - Behavior adjustment
  - Coin balance management
  - Turn processing automation

## 8. Real-time Features

### Live Updates
- **Real-time Synchronization**:
  - Draft progress updates
  - Marketplace changes
  - Turn notifications
  - Score updates
  - Chat and messaging

### WebSocket Integration
- **Live Data**:
  - Supabase Realtime subscriptions
  - Instant UI updates
  - Multi-user synchronization
  - Conflict resolution
  - Connection management

## 9. Performance Optimizations

### Frontend Optimizations
- **React Performance**:
  - Memoized components (PlayerCard, etc.)
  - Debounced search (300ms delay)
  - Intelligent caching strategies
  - Smooth transitions and animations
  - Loading states and skeleton screens

### Data Management
- **Caching System**:
  - Player data caching (10-minute TTL)
  - Team data caching (2-minute TTL)
  - Coin balance caching (1-minute TTL)
  - Cache invalidation strategies
  - Background data refresh

### UI/UX Enhancements
- **Smooth Interactions**:
  - Staggered animations (50ms delays)
  - Loading spinners and skeletons
  - Error handling and user feedback
  - Responsive design
  - Accessibility features

## 10. Administrative Features

### League Administration
- **Owner Tools**:
  - Member management
  - Settings configuration
  - Result processing
  - Dispute resolution
  - Analytics and reporting

### System Administration
- **Platform Management**:
  - User account management
  - League oversight
  - Performance monitoring
  - Error tracking and logging
  - Database maintenance

## 11. Security & Data Protection

### Authentication Security
- **Security Measures**:
  - Supabase Auth integration
  - Row Level Security (RLS)
  - API key management
  - Session security
  - Password policies

### Data Protection
- **Privacy Features**:
  - User data encryption
  - Secure API communications
  - GDPR compliance
  - Data retention policies
  - Audit logging

## 12. Mobile & Responsive Design

### Mobile Optimization
- **Responsive Features**:
  - Mobile-first design
  - Touch-friendly interfaces
  - Optimized performance
  - Offline capabilities
  - Progressive Web App features

### Cross-Platform Compatibility
- **Device Support**:
  - Desktop browsers
  - Mobile browsers
  - Tablet optimization
  - Touch gestures
  - Keyboard navigation

## 13. Integration Features

### External Integrations
- **Chess.com Integration**:
  - Player profile links
  - Game result synchronization
  - Tournament data
  - Performance metrics
  - Real-time updates

### API Integration
- **Supabase Edge Functions**:
  - Automated scoring
  - Bot processing
  - Email notifications
  - Data processing
  - Background tasks

## 14. Notification System

### User Notifications
- **Notification Types**:
  - Turn reminders
  - Trade offers
  - League updates
  - Score notifications
  - System announcements

### Communication Features
- **Messaging**:
  - League chat
  - Direct messages
  - Trade negotiations
  - Announcements
  - Email notifications

## 15. Analytics & Reporting

### Performance Analytics
- **User Analytics**:
  - League participation
  - Trading performance
  - Scoring history
  - Team management
  - Achievement tracking

### League Analytics
- **League Metrics**:
  - Member activity
  - Trading volume
  - Competition results
  - Engagement metrics
  - Financial tracking

## Technical Implementation Details

### State Management
- React Context for authentication
- Local state for component-specific data
- Supabase real-time subscriptions
- Optimistic updates for better UX

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Automatic retry mechanisms
- Fallback UI components
- Error logging and monitoring

### Testing Strategy
- Component unit tests
- Integration testing
- End-to-end testing
- Performance testing
- Accessibility testing

## Deployment & Infrastructure

### Frontend Deployment
- Vercel hosting
- Automatic deployments
- CDN distribution
- Performance monitoring
- Error tracking

### Backend Infrastructure
- Supabase hosting
- Database management
- Edge function deployment
- Real-time infrastructure
- Backup and recovery

## Future Enhancements

### Planned Features
- Advanced analytics dashboard
- Mobile app development
- Enhanced bot AI
- Tournament brackets
- Social features
- Advanced trading options

### Scalability Considerations
- Database optimization
- Caching strategies
- Load balancing
- Performance monitoring
- User growth planning

---

This documentation provides a comprehensive overview of all features and functionality in the Fantasy Chess League application. It serves as a complete reference for understanding the system architecture, user flows, and technical implementation details.
