const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Get User ID from Username
app.post('/api/getUserId', async (req, res) => {
  try {
    const response = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: req.body.usernames
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user ID' });
  }
});

// Get User Profile Info
app.get('/api/user/:userId', async (req, res) => {
  try {
    const response = await axios.get(`https://users.roblox.com/v1/users/${req.params.userId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get Friends List
app.get('/api/friends/:userId', async (req, res) => {
  try {
    const response = await axios.get(`https://friends.roblox.com/v1/users/${req.params.userId}/friends`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friends list' });
  }
});

// Get Following List with Pagination
app.get('/api/following/:userId', async (req, res) => {
  try {
    const { cursor = '', limit = 100 } = req.query;
    const url = `https://friends.roproxy.com/v1/users/${req.params.userId}/followings?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following list' });
  }
});

// Get Badges with Pagination
app.get('/api/badges/:userId', async (req, res) => {
  try {
    const { cursor = '', limit = 100 } = req.query;
    const url = `https://badges.roblox.com/v1/users/${req.params.userId}/badges?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Get Favorite Games with Pagination
app.get('/api/favorites/:userId', async (req, res) => {
  try {
    const { cursor = '', limit = 100 } = req.query;
    const url = `https://games.roblox.com/v2/users/${req.params.userId}/favorite/games?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorite games' });
  }
});

// Get User Groups with Pagination
app.get('/api/groups/:userId', async (req, res) => {
  try {
    const { cursor = '', limit = 100 } = req.query;
    const url = `https://groups.roblox.com/v2/users/${req.params.userId}/groups/roles?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get Avatar Thumbnail
app.get('/api/avatar/:userId', async (req, res) => {
  try {
    const response = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${req.params.userId}&size=420x420&format=Png&isCircular=false`);
    // Extract the first (and only) avatar URL
    const avatarUrl = response.data?.data?.[0]?.imageUrl;
    if (!avatarUrl) {
      return res.status(404).json({ error: 'Avatar not found' });
    }
    res.json({ avatarUrl });
  } catch (error) {
    console.error('Avatar Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch avatar',
      details: error.response?.data 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Roblox API Proxy running at http://localhost:${PORT}`);
});