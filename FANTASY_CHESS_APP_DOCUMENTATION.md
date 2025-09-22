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
The Fantasy Chess scoring system is based on real chess tournament results and ELO rating changes. Points are awarded based on:

1. **Game Results**: Win (+1), Loss (0), Draw (+0.5)
2. **ELO Rating Changes**: Performance-based bonus/penalty points
3. **Tournament Performance**: Bonus points for strong tournament finishes
4. **Consistency Factor**: Additional points for consistent performance

#### Point Calculation Formula

**Base Points per Game:**
- **Win**: 1.0 point
- **Draw**: 0.5 points  
- **Loss**: 0.0 points

**ELO Performance Bonus:**
- **ELO Gain**: +0.1 points per ELO point gained
- **ELO Loss**: -0.05 points per ELO point lost
- **Maximum ELO Bonus**: +5.0 points per game
- **Maximum ELO Penalty**: -2.0 points per game

**Tournament Performance Bonus:**
- **1st Place**: +10.0 points
- **2nd Place**: +7.0 points
- **3rd Place**: +5.0 points
- **Top 10%**: +3.0 points
- **Top 25%**: +1.5 points
- **Top 50%**: +0.5 points

**Consistency Multiplier:**
- **Perfect Week** (all wins): 1.5x multiplier
- **Strong Week** (≥75% win rate): 1.25x multiplier
- **Good Week** (≥50% win rate): 1.1x multiplier
- **Average Week** (25-49% win rate): 1.0x multiplier
- **Poor Week** (<25% win rate): 0.8x multiplier

#### Complete Scoring Formula

```
Total Points = (Base Points + ELO Bonus + Tournament Bonus) × Consistency Multiplier

Where:
- Base Points = (Wins × 1.0) + (Draws × 0.5) + (Losses × 0.0)
- ELO Bonus = min(max(ELO_Change × 0.1, -2.0), 5.0)
- Tournament Bonus = Based on final tournament position
- Consistency Multiplier = Based on weekly win percentage
```

#### Example Calculations

**Example 1: Strong Performance**
- Games: 5 wins, 1 draw, 0 losses
- ELO Change: +25 points
- Tournament Finish: 2nd place
- Win Rate: 83.3% (5.5/6)

```
Base Points = (5 × 1.0) + (1 × 0.5) + (0 × 0.0) = 5.5
ELO Bonus = min(25 × 0.1, 5.0) = 2.5
Tournament Bonus = 7.0 (2nd place)
Consistency Multiplier = 1.25 (Strong Week)

Total Points = (5.5 + 2.5 + 7.0) × 1.25 = 18.75 points
```

**Example 2: Average Performance**
- Games: 2 wins, 2 draws, 2 losses
- ELO Change: -5 points
- Tournament Finish: 15th place (top 50%)
- Win Rate: 50% (3/6)

```
Base Points = (2 × 1.0) + (2 × 0.5) + (2 × 0.0) = 3.0
ELO Bonus = max(-5 × 0.1, -2.0) = -0.5
Tournament Bonus = 0.5 (top 50%)
Consistency Multiplier = 1.1 (Good Week)

Total Points = (3.0 + (-0.5) + 0.5) × 1.1 = 3.3 points
```

#### Scoring Implementation Details

**Data Sources:**
- Chess.com tournament results
- ELO rating changes from official tournaments
- Game PGN files for detailed analysis
- Tournament standings and rankings

**Processing Schedule:**
- Weekly scoring runs every Monday at 2 AM PT
- Results processed for all active leagues
- Standings updated automatically
- Email notifications sent to league members

**Edge Cases:**
- **No Games Played**: 0 points (no penalty)
- **ELO Rating Unchanged**: No ELO bonus/penalty
- **Tournament Cancellation**: Base points only
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
