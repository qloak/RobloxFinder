document.addEventListener('DOMContentLoaded', () => {
  // API Configuration
  const API_BASE = 'https://robloxfinder.onrender.com/api';
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache expiry
  const ROBLOX_PROFILE_BASE = 'https://www.roblox.com/users/';
  const ROBLOX_GROUP_BASE = 'https://www.roblox.com/groups/';

  // DOM Elements
  const elements = {
    searchBtn: document.getElementById('searchBtn'),
    usernameInput: document.getElementById('usernameInput'),
    profile: document.getElementById('profile'),
    loading: document.getElementById('loading'),
    displayUsername: document.getElementById('displayUsername'),
    userId: document.getElementById('userId'),
    description: document.getElementById('description'),
    friendsCount: document.getElementById('friendsCount'),
    followingCount: document.getElementById('followingCount'),
    badgesCount: document.getElementById('badgesCount'),
    groupsCount: document.getElementById('groupsCount'),
    friendsList: document.getElementById('friendsList'),
    followingList: document.getElementById('followingList'),
    badgesList: document.getElementById('badgesList'),
    gamesList: document.getElementById('gamesList'),
    groupsList: document.getElementById('groupsList'),
    contentSearch: document.getElementById('contentSearch'),
    avatar: document.getElementById('avatar'),
    tabsContent: document.querySelector('.tab-content'),
    tabs: document.querySelector('.tabs')
  };

  // State Management
  let currentState = {
    userId: null,
    activeTab: 'friends',
    cache: new Map(),
    theme: 'dark'
  };

  // Initialize the app
  function init() {
    setupEventListeners();
    createThemeToggle();
    loadPreferences();
    elements.usernameInput.focus();
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Search functionality
    elements.searchBtn.addEventListener('click', searchUser);
    elements.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchUser();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', switchTab);
    });

    // Content search
    elements.contentSearch.addEventListener('input', debounce(searchContent, 300));
  }

  // Create Theme Toggle Button
  function createThemeToggle() {
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.innerHTML = `<i class="fas fa-${currentState.theme === 'dark' ? 'sun' : 'moon'}"></i>`;
    toggle.addEventListener('click', toggleTheme);
    document.body.appendChild(toggle);
  }

  // Theme Management
  function toggleTheme() {
    currentState.theme = currentState.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-mode');
    document.querySelector('.theme-toggle').innerHTML = 
      `<i class="fas fa-${currentState.theme === 'dark' ? 'sun' : 'moon'}"></i>`;
    savePreferences();
  }

  // Load/Save Preferences
  function loadPreferences() {
    const preferences = JSON.parse(localStorage.getItem('robloxViewerPrefs')) || {};
    if (preferences.theme) {
      currentState.theme = preferences.theme;
      if (currentState.theme === 'light') {
        document.body.classList.add('light-mode');
      }
    }
  }

  function savePreferences() {
    localStorage.setItem('robloxViewerPrefs', JSON.stringify({
      theme: currentState.theme
    }));
  }

  // Tab Functionality
  function switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    currentState.activeTab = tab;

    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // Update content visibility
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    document.getElementById(`${tab}-content`).classList.add('active');

    // Toggle search visibility - now includes groups
    elements.contentSearch.classList.toggle('hidden', tab === 'badges' || tab === 'games');
    if (!elements.contentSearch.classList.contains('hidden')) {
      elements.contentSearch.placeholder = `Search ${tab}...`;
      elements.contentSearch.focus();
    }
  }

  // Search Content Functionality - Enhanced for groups
  function searchContent() {
    const term = elements.contentSearch.value.toLowerCase();
    const activeList = document.querySelector(`#${currentState.activeTab}-content .content-list`);
    
    if (!activeList) return;

    activeList.querySelectorAll('li').forEach(item => {
      const primaryText = item.querySelector('.primary-text')?.textContent.toLowerCase() || '';
      const secondaryText = item.querySelector('.secondary-text')?.textContent.toLowerCase() || '';
      
      // For groups, search both group name and role
      const matches = primaryText.includes(term) || secondaryText.includes(term);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  // Loading State Management
  function showLoading(message = 'Loading...') {
    elements.loading.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <div class="loading-text">${message}</div>
        <div class="progress-container">
          <div class="progress-bar"></div>
        </div>
      </div>
    `;
    elements.loading.classList.add('active');
    
    // Initialize progress bar at 0%
    const progressBar = elements.loading.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.style.transition = 'width 0.3s ease';
    }
  }

  function updateLoading(progress, message) {
    const loadingText = elements.loading.querySelector('.loading-text');
    const progressBar = elements.loading.querySelector('.progress-bar');
    
    if (loadingText && message) {
      loadingText.textContent = message;
    }
    
    if (progressBar) {
      // Ensure progress is between 0 and 100
      const clampedProgress = Math.min(Math.max(progress, 0), 100);
      progressBar.style.width = `${clampedProgress}%`;
    }
  }

  function hideLoading() {
    // Reset progress bar before hiding
    updateLoading(0, '');
    elements.loading.classList.remove('active');
  }

  // Cache Management
  async function fetchWithCache(url, options = {}, cacheKey = url) {
    // Check cache first
    const cached = currentState.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
      return cached.data;
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      // Update cache
      currentState.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  // API Data Fetching
  async function fetchPaginatedData(endpoint, progressIncrement = 10) {
    let allData = [];
    let cursor = '';
    let hasMore = true;
    let progress = 0;

    while (hasMore) {
      try {
        const url = `${API_BASE}${endpoint}${cursor ? `?cursor=${cursor}` : ''}`;
        const data = await fetchWithCache(url);
        
        if (data.data && data.data.length) {
          allData = [...allData, ...data.data];
        }
        
        cursor = data.nextPageCursor || '';
        hasMore = !!cursor;
        
        // Update progress
        progress += progressIncrement;
        updateLoading(
          Math.min(progress, 90), 
          `Loading ${endpoint.split('/')[1]}... (${allData.length} items)`
        );
      } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        hasMore = false;
      }
    }
    
    return allData;
  }

  // Main Search Function
  async function searchUser() {
    const username = elements.usernameInput.value.trim();
    if (!username) {
      showToast('Please enter a username', 'error');
      return;
    }

    try {
      showLoading(`Searching for ${username}...`);
      updateLoading(10, 'Looking up user ID...');

      // Get user ID
      const userIdData = await fetchWithCache(
        `${API_BASE}/getUserId`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [username] })
        },
        `userid_${username}`
      );

      if (!userIdData.data?.[0]?.id) {
        throw new Error('User not found');
      }

      currentState.userId = userIdData.data[0].id;
      updateLoading(20, 'Found user! Loading profile...');

      // Fetch all data in parallel
      const [userInfo, friendsData, followingData, badgesData, favoritesData, groupsData, avatarData] = await Promise.all([
        fetchWithCache(`${API_BASE}/user/${currentState.userId}`, {}, `user_${currentState.userId}`),
        fetchWithCache(`${API_BASE}/friends/${currentState.userId}`, {}, `friends_${currentState.userId}`),
        fetchPaginatedData(`/following/${currentState.userId}`),
        fetchPaginatedData(`/badges/${currentState.userId}`),
        fetchPaginatedData(`/favorites/${currentState.userId}`),
        fetchPaginatedData(`/groups/${currentState.userId}`),
        fetchWithCache(`${API_BASE}/avatar/${currentState.userId}`, {}, `avatar_${currentState.userId}`)
      ]);

      updateLoading(95, 'Rendering profile...');
      
      // Update UI
      renderProfile({
        username,
        userId: currentState.userId,
        userInfo,
        friends: friendsData.data || [],
        following: followingData,
        badges: badgesData,
        games: favoritesData,
        groups: groupsData,
        avatarUrl: avatarData.data?.[0]?.imageUrl || null
      });

      updateLoading(100, 'Done!');
      setTimeout(hideLoading, 500);

    } catch (error) {
      updateLoading(0, `Error: ${error.message}`);
      setTimeout(() => {
        hideLoading();
        showToast(error.message, 'error');
      }, 1000);
      console.error('Search error:', error);
    }
  }

  // Render Profile Data
  function renderProfile(data) {
    // Basic info
    elements.displayUsername.textContent = data.userInfo.displayName || data.username;
    elements.userId.textContent = `ID: ${data.userId}`;
    elements.description.textContent = data.userInfo.description || 'No description available';
    
    // Create profile link
    const profileLink = document.createElement('a');
    profileLink.href = `${ROBLOX_PROFILE_BASE}${data.userId}/profile`;
    profileLink.target = '_blank';
    profileLink.rel = 'noopener noreferrer';
    profileLink.className = 'profile-link';
    profileLink.textContent = 'View on Roblox';
    elements.userId.appendChild(document.createElement('br'));
    elements.userId.appendChild(profileLink);

    // Avatar image
    if (data.avatarUrl) {
      elements.avatar.innerHTML = '';
      const avatarImg = document.createElement('img');
      avatarImg.src = data.avatarUrl;
      avatarImg.alt = `${data.username}'s avatar`;
      avatarImg.className = 'avatar-img';
      elements.avatar.appendChild(avatarImg);
    } else {
      elements.avatar.textContent = data.username.charAt(0).toUpperCase();
    }

    // Stats
    elements.friendsCount.textContent = data.friends.length;
    elements.followingCount.textContent = data.following.length;
    elements.badgesCount.textContent = data.badges.length;
    elements.groupsCount.textContent = data.groups.length;

    // Render lists
    renderList(data.friends, elements.friendsList, friend => friend.name);
    renderList(data.following, elements.followingList, user => user.name);
    renderList(data.badges, elements.badgesList, badge => badge.name);
    renderList(data.games, elements.gamesList, game => game.name || 'Unknown Game');
    renderList(data.groups, elements.groupsList, group => group.group.name, group => group.role.name);

    // Show profile
    elements.profile.classList.remove('hidden');
    elements.contentSearch.value = '';
  }

  // Render List Items - Enhanced for groups
  function renderList(items, container, textExtractor, secondaryTextExtractor = null) {
    container.innerHTML = '';
    
    if (!items.length) {
      container.innerHTML = '<li class="empty">No items found</li>';
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      const primaryText = textExtractor(item);
      const secondaryText = secondaryTextExtractor ? secondaryTextExtractor(item) : '';
      
      li.innerHTML = `
        <i class="fas fa-${getIconForItem(item)}"></i>
        <div class="list-item-text">
          <span class="primary-text">${primaryText}</span>
          ${secondaryText ? `<span class="secondary-text">${secondaryText}</span>` : ''}
        </div>
      `;
      
      // Add clickable link for groups and games
      if (item.group && item.group.id) {
        li.classList.add('clickable');
        li.addEventListener('click', () => {
          window.open(`${ROBLOX_GROUP_BASE}${item.group.id}`, '_blank');
        });
      } else if (item.id && currentState.activeTab === 'games') {
        li.classList.add('clickable');
        li.addEventListener('click', () => {
          window.open(`https://www.roblox.com/games/${item.id}`, '_blank');
        });
      }
      
      container.appendChild(li);
    });
  }

  // Helper to get icons for list items
  function getIconForItem(item) {
    if (item.hasOwnProperty('name') && !item.hasOwnProperty('group')) {
      return 'user'; // Default for users
    } else if (item.hasOwnProperty('displayName')) {
      return 'gamepad'; // For games
    } else if (item.group) {
      return 'users'; // For groups (Font Awesome groups icon)
    }
    return 'award'; // For badges
  }

  // Toast Notifications
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Utility Functions
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Initialize the application
  init();
});
