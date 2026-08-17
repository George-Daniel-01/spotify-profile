# Spotify Taste Profile

A web app for visualizing personalized Spotify data with mood-based recommendations, taste DNA charts, and listening insights.

## Features

- **Mood Match** — Personality-based music recommendation engine
- **Taste Profile** — Audio DNA radar charts, genre analysis, and listening personality insights
- **WrappedStats** — Year-in-review style listening statistics
- **Listening Habits** — Time-based listening pattern visualizations
- **Stripe Subscription** — Premium tier with monthly subscription billing
- **Supabase Integration** — User data persistence and session management

## Tech Stack

- [React](https://reactjs.org/) with [Create React App](https://github.com/facebook/create-react-app)
- [Express](https://expressjs.com/) backend
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Styled Components](https://www.styled-components.com/)
- [Chart.js](https://www.chartjs.org/)
- [Clerk](https://clerk.com/) for authentication
- [Vercel](https://vercel.com/) for deployment

## Setup

1. [Register a Spotify App](https://developer.spotify.com/dashboard/applications) and add `http://localhost:8888/callback` as a Redirect URI
2. Create an `.env` file in the root based on `.env.example`
3. `nvm use`
4. `yarn && yarn client:install`
5. `yarn dev`

## Deploying

See `vercel.json` for Vercel deployment configuration.

## License

Based on [Spotify Profile](https://github.com/bchiang7/spotify-profile) by Brittany Chiang.
