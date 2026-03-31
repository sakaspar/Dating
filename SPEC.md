 Activity-Based Dating App Development
PROJECT OVERVIEW
You are tasked with building a complete mobile dating application (iOS + Android) for the Tunisian market. This app focuses on converting matches into real-life meetings through structured activity planning, not endless chatting.

CORE PROBLEM TO SOLVE
Dating apps in Tunisia have many matches but very few real meetings because:

Conversations die after a few messages
Users don't know how to suggest dates
Cultural hesitation around meeting strangers
Unclear relationship intentions
Safety and trust concerns

Your app solves this by making it easy to propose structured, safe activities immediately after matching.

MANDATORY TECHNICAL CONSTRAINTS
Database Requirement

NO traditional databases (PostgreSQL, MongoDB, MySQL)
Use JSON files as a data lake - all data stored as individual JSON files organized in folders
Implement file-based indexing for fast lookups
Use in-memory caching for frequently accessed data
Create daily automated backups of all JSON files

API Services Requirement

NO paid APIs allowed
Use only free services and APIs
For maps: OpenStreetMap (free) instead of Google Maps
For geocoding: Nominatim API (free)
For push notifications: OneSignal (free tier)
For places/venues: OpenStreetMap Overpass API (free)
For SMS verification: Email-based for MVP or Twilio free trial

Hosting Requirement

Backend must be hosted on a Raspberry Pi 4 (4GB or 8GB RAM)
Setup Nginx as reverse proxy
Configure free SSL with Let's Encrypt
Use free dynamic DNS (No-IP or DuckDNS)
Use PM2 for process management
Backend must be optimized for Raspberry Pi's limited resources


TECHNOLOGY STACK YOU MUST USE
Mobile App

React Native with Expo (single codebase for iOS and Android)
React Native Paper for UI components
React Navigation for screen routing
Redux Toolkit for state management
react-native-maps with OpenStreetMap for maps
Socket.io client for real-time chat
OneSignal SDK for push notifications

Backend

Node.js 18+ with Express.js
Socket.io for real-time features
JWT for authentication
Bcrypt for password hashing
Sharp for image processing
Multer for file uploads
No ORM - custom JSON file database manager
Node-cache for in-memory caching

Infrastructure

Raspberry Pi 4 as server
Nginx for reverse proxy
Let's Encrypt for SSL
PM2 for process management
No-IP or DuckDNS for dynamic DNS


JSON DATA LAKE STRUCTURE
Create this folder structure for storing all data as JSON files:
/data
  /users
    /{user_id}.json  (each user is a separate file)
  /matches
    /{match_id}.json
  /messages
    /conversation_{match_id}.json
  /proposals
    /{proposal_id}.json
  /groups
    /{group_id}.json
  /swipes
    /{user_id}_swipes.json
  /reports
    /{report_id}.json
  /indexes  (for fast lookups)
    /user_by_email.json
    /user_by_phone.json
    /active_matches.json
    /location_index.json
  /backups
    /{date}/  (daily backups)
  /analytics
    /daily_{date}.json
Build a Database Manager Module
Create a reusable module that handles:

Creating JSON files (with unique IDs)
Reading JSON files (with caching)
Updating JSON files
Deleting JSON files
Querying multiple files with filters
Building and maintaining index files for fast lookups
Geographic proximity searches using Haversine formula
Daily automated backups

This module should replace traditional database operations entirely.

MVP FEATURES TO IMPLEMENT
1. USER AUTHENTICATION & PROFILES
Authentication:

Email and password registration/login (simpler than phone for MVP)
JWT token-based sessions
Store user credentials in /data/users/{user_id}.json
Create index file for email lookups: /data/indexes/user_by_email.json

Profile Creation Wizard (step-by-step flow):
Step 1: Basic Information

Full name
Age (18+ required)
Gender
Current location (use device GPS, store lat/lon coordinates)
City and neighborhood selection from predefined list

Step 2: Photos

Upload 3-6 photos (minimum 3 required)
Store images on Raspberry Pi filesystem in /uploads/users/{user_id}/
Use Sharp library to resize and compress images
Create thumbnails for performance

Step 3: Relationship Intention

Let user select ONE intention:

Serious relationship
Dating/Casual dating
Friendship
Open to anything



Step 4: Activity Preferences (CRITICAL FEATURE)

User must select 2-4 preferred activity types:

☕ Coffee/Café hangouts
🍽️ Restaurant/Dining
🎮 Activities (bowling, arcade, laser tag, escape rooms)
🌳 Outdoor (parks, walks, beaches)
👥 Social/Group events
🎬 Events (cinema, concerts, exhibitions)


Store as array in user profile JSON

Step 5: Bio & Interests

Optional bio text (max 500 characters)
Tag-based interests (photography, music, sports, etc.)

User Profile JSON Structure:
Each user should be stored as: /data/users/{user_id}.json containing all profile data, photos array, preferences, verification status, and timestamps.

2. MATCHING SYSTEM
Discovery/Swipe Interface:

Show potential matches one at a time (Tinder-style cards)
User can swipe right (like) or left (pass)
Show profile photos, age, distance, shared activities, and bio

Matching Algorithm Requirements:
Create a smart matching algorithm that:

Finds users within 50km radius using GPS coordinates and Haversine distance formula
Filters by:

Gender preference (heterosexual for MVP, expand later)
Age range (±10 years)
Users not already swiped on
Active users only


Scores potential matches based on:

Shared activity preferences (highest weight)
Shared interests
Relationship intention compatibility
Distance (closer is better)
Profile completeness
Recent activity


Returns top 20 matches sorted by compatibility score

Swipe Tracking:

Store each user's swipes in /data/swipes/{user_id}_swipes.json
Track all swiped user IDs and actions (like/pass)
When both users like each other, create a match

Match Creation:

When mutual like detected, create /data/matches/{match_id}.json
Add match to index file for both users
Send push notification to both users via OneSignal
Trigger match celebration animation in app


3. REAL-TIME CHAT
Implementation Requirements:

Use Socket.io for real-time messaging
Only matched users can chat
Store conversation messages in /data/messages/conversation_{match_id}.json
Each message includes: ID, sender ID, text, timestamp, read status

Features to Include:

Text messages only (no photos/voice in MVP)
Typing indicators ("User is typing...")
Message read receipts
Online/offline status indicators
Message history retrieval
Push notifications for new messages (OneSignal)

Socket.io Events:

message:send - User sends message
message:receive - User receives message
message:read - Message marked as read
typing:start - User starts typing
typing:stop - User stops typing
user:online - User comes online
user:offline - User goes offline


4. DATE PROPOSAL SYSTEM (CORE DIFFERENTIATOR - MOST IMPORTANT FEATURE)
This is what makes your app unique. After matching, users should have a prominent "Suggest a Plan" button that's more visible than the chat.
Proposal Creation Form:
User fills out:

Activity Type - Select from shared activity preferences
Date - Calendar picker (only future dates)
Time - Time picker
Area/Neighborhood - Dropdown of Tunis neighborhoods
Budget Range - Optional: Low/Medium/High
Suggested Place - Text field or search from OpenStreetMap places
Additional Notes - Optional message

Smart Suggestions Feature:
When user clicks "Suggest a Plan":

Show shared activities between the two users
For each shared activity, suggest 2-3 actual places from OpenStreetMap
Use OpenStreetMap Overpass API to find nearby cafes, restaurants, parks, etc.
Calculate distance from both users' locations
Display suggestions with name, address, and distance

Proposal Response Flow:
When User B receives a proposal, they can:

Accept - Creates confirmed date, both users get confirmation notification
Decline - Polite decline, proposal marked as declined
Modify - Propose changes (different time, place, or date), sends counter-proposal

Data Storage:

Store proposals in /data/proposals/{proposal_id}.json
Track proposal status: pending, accepted, declined, modified
Store modification history
Create confirmed dates in /data/confirmed_dates/{date_id}.json when accepted


5. GROUP ACTIVITIES (SAFETY FEATURE)
Purpose: Allow users to create and join group outings, which is culturally more comfortable and safer.
Group Creation:
Users can create a group activity post:

Activity type (from the 6 main types)
Title and description
Date and time
Location (with map)
Current group size (e.g., "We are 3 people")
Looking for X more people (e.g., "Need 2 more")
Visibility: Public or Friends-only
Age range filter (optional)
Gender preference (optional)

Group Discovery:
Separate "Groups" tab showing:

Available group activities as scrollable cards
Filter by: activity type, date, location, distance
Show group creator's limited profile info
Show current participants count

Joining Groups:

User can request to join
Group creator approves/declines requests
Option for auto-approval
Once approved, user joins group chat
Group chat works similar to regular chat but with multiple participants

Data Storage:

Store groups in /data/groups/{group_id}.json
Track members with status (pending, approved, declined)
Group messages in /data/group_messages/{group_id}.json


6. SAFETY & VERIFICATION SYSTEM
Profile Verification:

Phone number verification via SMS (use email for MVP or Twilio free trial)
Photo verification - user takes selfie, basic face detection check
Display verification badge on verified profiles

Safety Features:

Report System:

Report button in user profiles and chats
Report reasons: inappropriate behavior, fake profile, harassment, scam
Optional evidence/screenshot upload
Store reports in /data/reports/{report_id}.json
Admin review system


Block System:

Block user - they disappear from matches and can't message
Unmatch when blocking
Store blocked user IDs in user's JSON file
Blocked users list in settings


Safety Guidelines:

Dedicated "Safety Tips" page in app
Meeting guidelines (public places, tell a friend, etc.)
Red flags to watch for
Emergency contacts for Tunisia


Enforced Safety Rules:

First meeting suggestions must be public places only
Date proposals automatically filtered to exclude private locations
Community guidelines page during onboarding




RASPBERRY PI SETUP INSTRUCTIONS
Hardware Setup

Get Raspberry Pi 4 (4GB or 8GB RAM model)
Install Raspberry Pi OS (64-bit Lite version)
Connect to stable internet (Ethernet cable recommended)
Add cooling solution (heatsinks + fan)
Optional: Connect external USB drive for backups

Software Setup

Install Node.js 18
Install PM2 globally for process management
Install Nginx as reverse proxy
Setup free dynamic DNS with No-IP or DuckDNS
Configure router port forwarding (80 and 443 to Raspberry Pi)
Install Certbot and get free SSL certificate from Let's Encrypt
Configure Nginx to proxy requests to Node.js backend
Create data directories and upload directories
Setup automated daily backups via cron job
Configure PM2 to auto-start backend on boot

Performance Optimization

Enable swap memory (2GB)
Set PM2 memory limit (max 1GB per process)
Enable Nginx caching for static files
Implement log rotation
Monitor CPU temperature (prevent throttling)


FREE SERVICES INTEGRATION
OneSignal (Push Notifications)

Create free account at OneSignal.com
Create new app, get App ID and API Key
Integrate OneSignal SDK in React Native app
Use OneSignal backend SDK in Node.js to send notifications
Send notifications for: new matches, messages, date proposals, group invites

OpenStreetMap (Maps & Places)

Use react-native-maps with OpenStreetMap tiles (no API key needed)
Use Nominatim API for geocoding addresses (free, 1 req/sec limit)
Use Overpass API for finding places (cafes, restaurants, parks)
Display maps with markers for date locations
Implement place search with autocomplete

Distance Calculations

Implement Haversine formula to calculate distance between two GPS coordinates
Use for proximity matching and showing "X km away"


MOBILE APP STRUCTURE
Organize your React Native app with these main screens:

Auth Screens: Login, Register, OTP Verification
Onboarding: 5-step profile creation wizard
Main Tabs:

Discover (swipe cards)
Matches (list of matches)
Groups (group activities feed)
Profile (user settings)


Chat Screen: Real-time messaging
Proposal Screens: Create proposal, view proposal, respond to proposal
Group Screens: Create group, browse groups, group details, group chat
Settings Screens: Edit profile, safety center, blocked users, help

Use React Navigation for navigation between screens.

BACKEND API STRUCTURE
Build RESTful API with these endpoint categories:
Authentication Routes:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

User Routes:

GET /api/users/profile
PUT /api/users/profile
POST /api/users/photos
DELETE /api/users/photos/:id
PUT /api/users/preferences

Matching Routes:

GET /api/matches/discover (get potential matches)
POST /api/matches/swipe (record swipe action)
GET /api/matches (get user's matches)
DELETE /api/matches/:id (unmatch)

Chat Routes:

GET /api/chat/conversations
GET /api/chat/:conversationId/messages
POST /api/chat/:conversationId/messages (HTTP fallback)

Proposal Routes:

POST /api/proposals (create proposal)
GET /api/proposals/:matchId
PUT /api/proposals/:id/accept
PUT /api/proposals/:id/decline
PUT /api/proposals/:id/modify
GET /api/proposals/suggestions/:matchId (smart suggestions)

Group Routes:

POST /api/groups (create group)
GET /api/groups (browse with filters)
GET /api/groups/:id
POST /api/groups/:id/join
PUT /api/groups/:id/approve/:userId
GET /api/groups/:id/messages

Safety Routes:

POST /api/safety/report
POST /api/safety/block
GET /api/safety/blocked
DELETE /api/safety/block/:userId


TUNISIAN MARKET SPECIFICS
Neighborhoods List
Include these Tunis areas in your location selector:

Tunis Centre
La Marsa
Carthage
Sidi Bou Said
Gammarth
Ariana
Manouba
Ben Arous
Bardo
Manar
Menzah
Lac

Store each with coordinates for distance calculations.
Budget Ranges (in Tunisian Dinar)

Low: < 30 TND
Medium: 30-80 TND
High: > 80 TND

Cultural Considerations

Make group activities prominent (culturally more acceptable)
Emphasize safety features visibly
Default to public place suggestions
Respectful, professional imagery and copy


UI/UX DESIGN REQUIREMENTS
Design Principles:

Modern and clean (inspired by Tinder/Bumble but unique)
Activity-focused, not just photo-focused
Trust and safety visible throughout
Mobile-first, optimized for one-handed use

Color Scheme:

Primary color: Vibrant blue or purple
Secondary color: Warm coral/orange for CTAs
Success: Green for confirmations
Background: Light gray
Text: Dark gray

Key UI Elements:

Prominent "Suggest a Plan" button (bigger than chat button)
Activity icons throughout the app
Verification badges on profiles
Distance indicators
Shared activities highlighted in profiles
Smooth swipe animations


TESTING REQUIREMENTS
Create Test Data:

Generate 50-100 fake user profiles with varied:

Locations across Tunis
Ages (18-35)
Activity preferences
Photos (use placeholder images)


Test matching algorithm with various scenarios
Test proposal creation and acceptance flow
Test group activities
Test chat and real-time features
Test on both iOS and Android devices

Test These Flows:

Complete registration and profile setup
Discover and swipe on users
Get a match
Send and receive messages
Create a date proposal
Accept/decline/modify a proposal
Create a group activity
Join a group activity
Report and block a user
Push notifications work correctly


PERFORMANCE REQUIREMENTS
Mobile App:

App launch time: < 3 seconds
Smooth 60 FPS animations
Image lazy loading
Offline support for viewing cached profiles
Pull-to-refresh on all lists
Optimistic UI updates

Backend (Raspberry Pi):

API response time: < 500ms average
Handle 100 concurrent users minimum
Efficient JSON file reads with caching
Daily backups automated
Low memory footprint (< 1GB)
Graceful error handling


SECURITY REQUIREMENTS

HTTPS only (via Let's Encrypt SSL)
JWT token expiration (7 days)
Rate limiting on all API endpoints (100 requests per 15 minutes per user)
Input validation on all endpoints (use Joi)
Password hashing with bcrypt (10 rounds)
Prevent SQL injection (not applicable but validate all inputs)
XSS protection (sanitize user inputs)
CORS properly configured
Hide sensitive errors in production


DEPLOYMENT CHECKLIST
Backend Deployment

 Backend code deployed to Raspberry Pi
 PM2 configured and running
 Nginx configured with SSL
 Dynamic DNS configured
 Router port forwarding setup
 Environment variables configured
 OneSignal credentials added
 Daily backup cron job setup
 Monitoring and logging configured
 Health check endpoint working

Mobile App Deployment

 OneSignal configured for iOS and Android
 App icons and splash screens created
 Privacy policy and terms of service added
 App tested on real iOS device
 App tested on real Android device
 Production API URL configured
 Build iOS app for TestFlight
 Build Android APK/AAB for Google Play
 Submit to App Store and Play Store


SUCCESS METRICS TO TRACK
Store basic analytics in daily JSON files:

Daily active users
New registrations
Total matches created
Proposals created
Proposals accepted (conversion rate)
Messages sent
Group activities created
Average time from match to first proposal

Track these to measure if your app is solving the core problem: converting matches into real meetings.

FINAL DELIVERABLES
When you complete this project, you should have:

Backend Repository with:

Complete Node.js/Express backend code
JSON database manager module
All API routes and controllers
Socket.io chat implementation
Raspberry Pi deployment scripts
README with setup instructions
.env.example file


Mobile App Repository with:

Complete React Native app code
All screens and components
Redux state management
Socket.io integration
OneSignal integration
README with setup instructions


Documentation:

API documentation (list all endpoints with request/response examples)
Database schema (JSON file structure documentation)
Raspberry Pi setup guide
Deployment guide
Testing guide


Working Application:

Backend running on Raspberry Pi with public URL
Mobile app installable on iOS and Android
All core features functional
Push notifications working
Real-time chat working




PRIORITY ORDER
Build features in this exact order:

Week 1-2:

Setup Raspberry Pi
Build JSON database manager
Authentication system
User profiles


Week 3-4:

Matching algorithm
Swipe interface
Match system


Week 5-6:

Real-time chat with Socket.io
Basic messaging


Week 7-8:

Date proposal system (MOST IMPORTANT)
Smart suggestions with OpenStreetMap
Proposal response flow


Week 9-10:

Group activities feature
Safety and verification
Report/block system


Week 11-12:

Polish UI/UX
Testing and bug fixes
Performance optimization
Prepare for launch




CRITICAL REMINDERS
Technology Constraints (DO NOT VIOLATE):

❌ NO PostgreSQL, MongoDB, or any traditional database
✅ ONLY JSON files for data storage
❌ NO paid APIs (Google Maps, Twilio paid, AWS Rekognition, etc.)
✅ ONLY free services (OpenStreetMap, OneSignal, etc.)
✅ Backend MUST run on Raspberry Pi
✅ Optimize for Raspberry Pi's limited resources

Core Product Principle:
The app's value is getting people to meet in real life, not endless chatting. The date proposal system is the heart of the product - make it exceptional.
Cultural Fit:
Design for Tunisian market - emphasize safety, group options, and public places. Be respectful and professional.
MVP Focus:
Build only what's listed above. No extra features. Launch fast, get user feedback, iterate.

YOUR TASK
Build this entire application following all requirements above. Start with backend infrastructure, then build features in the priority order specified. Use only the technologies listed. Store all data as JSON files. Host backend on Raspberry Pi. Use only free services.
The goal is a working dating app that solves the real problem: helping Tunisian young adults move from online matches to real-life meetings through structured, safe activities.
BEGIN DEVELOPMENT NOW.