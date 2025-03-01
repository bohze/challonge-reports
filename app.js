const express = require('express')
require('dotenv').config()
const axios = require('axios')
const app = express()

const port = process.env.PORT || 3000

// Middleware to parse JSON
app.use(express.json())

// Route to list all tournaments from Challonge API
app.get('/tournaments', async (req, res) => {
  try {
    const apiKey = process.env.CHALLONGE_API_KEY;
    
    // Make sure credentials are provided
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Missing Challonge API credentials in environment variables' 
      });
    }
    
    // Make request to Challonge API
    const response = await axios.get(
      `https://api.challonge.com/v1/tournaments.json`,
      {
        params: {
          api_key: apiKey
        }
      }
    );
    
    // Extract only the required fields and format as HTML table
    const tournaments = response.data.map(item => {
      const tournament = item.tournament;
      return {
        id: tournament.id,
        name: tournament.name,
        tournament_type: tournament.tournament_type,
        created_at: new Date(tournament.created_at).toLocaleDateString(),
        game_name: tournament.game_name || 'N/A',
        full_challonge_url: tournament.full_challonge_url
      };
    });
    
    // Generate HTML table
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Challonge Tournaments</title>
        <style>
          table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial, sans-serif;
          }
          th, td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .btn {
            display: inline-block;
            padding: 5px 10px;
            background-color: #0066cc;
            color: white;
            border-radius: 4px;
            text-decoration: none;
          }
          .btn:hover {
            background-color: #0052a3;
          }
        </style>
      </head>
      <body>
        <h1>Challonge Tournaments</h1>
        <table>
          <tr>
            <th>Name</th>
            <th>Tournament Type</th>
            <th>Created At</th>
            <th>Game</th>
            <th>URL</th>
            <th>Matches</th>
          </tr>
    `;
    
    tournaments.forEach(tournament => {
      html += `
        <tr>
          <td>${tournament.name}</td>
          <td>${tournament.tournament_type}</td>
          <td>${tournament.created_at}</td>
          <td>${tournament.game_name}</td>
          <td><a href="${tournament.full_challonge_url}" target="_blank">${tournament.full_challonge_url}</a></td>
          <td><a href="/tournaments/${tournament.id}/matches" class="btn">View Matches</a></td>
        </tr>
      `;
    });
    
    html += `
        </table>
      </body>
      </html>
    `;
    
    // Set Content-Type header and send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error fetching tournaments:', error.message);
    
    // Return appropriate error response
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data || 'Error from Challonge API'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Route to show matches for a specific tournament
app.get('/tournaments/:tournament_id/matches', async (req, res) => {
  try {
    const tournamentId = req.params.tournament_id;
    const apiKey = process.env.CHALLONGE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Missing Challonge API credentials in environment variables' 
      });
    }
    
    // Get tournament info
    const tournamentResponse = await axios.get(
      `https://api.challonge.com/v1/tournaments/${tournamentId}.json`,
      {
        params: {
          api_key: apiKey
        }
      }
    );
    
    const tournamentName = tournamentResponse.data.tournament.name;
    
    // Get matches for the tournament
    const matchesResponse = await axios.get(
      `https://api.challonge.com/v1/tournaments/${tournamentId}/matches.json`,
      {
        params: {
          api_key: apiKey
        }
      }
    );
    
    // Get participants to map IDs to names
    const participantsResponse = await axios.get(
      `https://api.challonge.com/v1/tournaments/${tournamentId}/participants.json`,
      {
        params: {
          api_key: apiKey
        }
      }
    );
    
    // Create a map of participant IDs to names
    const participants = {};
    participantsResponse.data.forEach(item => {
      participants[item.participant.id] = item.participant.name;
    });
    
    // Generate HTML table for matches
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Matches for ${tournamentName}</title>
        <style>
          table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial, sans-serif;
          }
          th, td {
            border: 1px solid #dddddd;
            text-align: left;
            padding: 8px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .winner {
            font-weight: bold;
            color: green;
          }
          .back-btn {
            display: inline-block;
            margin-bottom: 20px;
            padding: 8px 16px;
            background-color: #0066cc;
            color: white;
            text-decoration: none;
            border-radius: 4px;
          }
          .back-btn:hover {
            background-color: #0052a3;
          }
          .round {
            text-align: center;
          }
          .state {
            text-transform: capitalize;
          }
        </style>
      </head>
      <body>
        <a href="/tournaments" class="back-btn">← Back to Tournaments</a>
        <h1>Matches for ${tournamentName}</h1>
        <table>
          <tr>
            <th>Round</th>
            <th>Player 1</th>
            <th>Player 2</th>
            <th>Score</th>
            <th>State</th>
          </tr>
    `;
    
    matchesResponse.data.forEach(item => {
      const match = item.match;
      const player1Name = participants[match.player1_id] || 'TBD';
      const player2Name = participants[match.player2_id] || 'TBD';
      const player1Class = match.winner_id === match.player1_id ? 'winner' : '';
      const player2Class = match.winner_id === match.player2_id ? 'winner' : '';
      
      html += `
        <tr>
          <td class="round">Round ${match.round}</td>
          <td class="${player1Class}">${player1Name}</td>
          <td class="${player2Class}">${player2Name}</td>
          <td>${match.scores_csv || '-'}</td>
          <td class="state">${match.state}</td>
        </tr>
      `;
    });
    
    html += `
        </table>
      </body>
      </html>
    `;
    
    // Set Content-Type header and send HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error fetching matches:', error.message);
    
    // Return appropriate error response
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data || 'Error from Challonge API'
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Catch-all route to redirect any undefined routes to /tournaments
app.use('*', (req, res) => {
  res.redirect('/tournaments');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
