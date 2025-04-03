// dashboard.js

// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const newCampaignBtn = document.getElementById('newCampaignBtn');
const newCampaignModal = document.getElementById('newCampaignModal');
const closeModal = document.getElementById('closeModal');
const cancelCampaignBtn = document.getElementById('cancelCampaignBtn');
const campaignForm = document.getElementById('campaignForm');
const campaignList = document.getElementById('campaignList');
const recentActivityList = document.getElementById('recentActivityList');
const toastContainer = document.getElementById('toastContainer');

// Stats elements
const impressionsStat = document.getElementById('impressionsStat');
const clicksStat = document.getElementById('clicksStat');
const conversionsStat = document.getElementById('conversionsStat');
const revenueStat = document.getElementById('revenueStat');
const impressionsTrend = document.getElementById('impressionsTrend');
const clicksTrend = document.getElementById('clicksTrend');
const conversionsTrend = document.getElementById('conversionsTrend');
const revenueTrend = document.getElementById('revenueTrend');

// Charts
let performanceChart;
let trafficChart;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  // UI components
  sidebarToggle.addEventListener('click', toggleSidebar);
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleSearch();
  });
  
  // Campaign modal
  newCampaignBtn.addEventListener('click', openNewCampaignModal);
  closeModal.addEventListener('click', closeNewCampaignModal);
  cancelCampaignBtn.addEventListener('click', closeNewCampaignModal);
  campaignForm.addEventListener('submit', handleNewCampaignSubmit);
  
  // Load data
  loadAllData();
});

// Load all dashboard data
async function loadAllData() {
  try {
    // Show loading states
    campaignList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading campaigns...</div>';
    recentActivityList.innerHTML = '<li class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading activity...</li>';
    
    // Load data in parallel
    await Promise.all([
      loadStats(),
      loadCharts(),
      loadCampaigns(),
      loadRecentActivity(),
      loadUserProfile()
    ]);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Failed to load dashboard data. Please refresh the page.', 'error');
  }
}

// API Functions
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    showToast('Failed to load data. Using fallback values.', 'error');
    throw error;
  }
}

async function postData(endpoint, data) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error posting to ${endpoint}:`, error);
    showToast('Failed to submit data. Please try again.', 'error');
    throw error;
  }
}

// Data Loading Functions
async function loadStats() {
  try {
    const stats = await fetchData('/stats');
    
    // Update DOM with stats
    impressionsStat.textContent = formatNumber(stats.impressions);
    clicksStat.textContent = formatNumber(stats.clicks);
    conversionsStat.textContent = formatNumber(stats.conversions);
    revenueStat.textContent = `$${formatNumber(stats.revenue, true)}`;
    
    // Update trends
    updateTrend(impressionsTrend, stats.impressionsChange);
    updateTrend(clicksTrend, stats.clicksChange);
    updateTrend(conversionsTrend, stats.conversionsChange);
    updateTrend(revenueTrend, stats.revenueChange);
  } catch (error) {
    console.error('Error loading stats:', error);
    // Set default values
    impressionsStat.textContent = '0';
    clicksStat.textContent = '0';
    conversionsStat.textContent = '0';
    revenueStat.textContent = '$0';
  }
}

async function loadCharts() {
  try {
    // Fetch chart data
    const [performance, traffic] = await Promise.all([
      fetchData('/stats/performance'),
      fetchData('/stats/traffic')
    ]);
    
    // Initialize charts
    initPerformanceChart(performance);
    initTrafficChart(traffic);
  } catch (error) {
    console.error('Error loading charts:', error);
    // Initialize with empty data
    initPerformanceChart({ labels: [], impressions: [], clicks: [], conversions: [] });
    initTrafficChart({ labels: [], values: [] });
  }
}

async function loadCampaigns() {
  try {
    const campaigns = await fetchData('/campaigns');
    renderCampaigns(campaigns);
  } catch (error) {
    console.error('Error loading campaigns:', error);
    campaignList.innerHTML = '<div class="error-message">Failed to load campaigns</div>';
  }
}

function renderCampaigns(campaigns) {
  campaignList.innerHTML = '';
  
  if (!campaigns || campaigns.length === 0) {
    campaignList.innerHTML = '<div class="empty-state">No campaigns found</div>';
    return;
  }
  
  campaigns.forEach(campaign => {
    const campaignEl = document.createElement('div');
    campaignEl.className = 'campaign-item';
    campaignEl.innerHTML = `
      <div class="campaign-info">
        <div class="campaign-name">${campaign.name}</div>
        <div class="campaign-meta">
          <span class="campaign-type ${campaign.campaign_type}">${formatCampaignType(campaign.campaign_type)}</span>
          <span class="campaign-status ${campaign.status}">${formatStatus(campaign.status)}</span>
          <span class="campaign-dates">${formatDate(campaign.start_date)} - ${formatDate(campaign.end_date)}</span>
        </div>
      </div>
      <div class="campaign-stats">
        <div class="stat">
          <div class="stat-value">${campaign.impressions}</div>
          <div class="stat-label">Impressions</div>
        </div>
        <div class="stat">
          <div class="stat-value">${campaign.clicks}</div>
          <div class="stat-label">Clicks</div>
        </div>
        <div class="stat">
          <div class="stat-value">${campaign.conversions}</div>
          <div class="stat-label">Conversions</div>
        </div>
        <div class="stat">
          <div class="stat-value">$${(campaign.revenue || 0).toFixed(2)}</div>
          <div class="stat-label">Revenue</div>
        </div>
      </div>
      <div class="campaign-actions">
        <button class="btn-icon view-btn" data-id="${campaign.campaign_id}">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn-icon edit-btn" data-id="${campaign.campaign_id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon analytics-btn" data-id="${campaign.campaign_id}">
          <i class="fas fa-chart-line"></i>
        </button>
      </div>
    `;
    campaignList.appendChild(campaignEl);
  });

  // Add event listeners
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => viewCampaign(btn.dataset.id));
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editCampaign(btn.dataset.id));
  });
  document.querySelectorAll('.analytics-btn').forEach(btn => {
    btn.addEventListener('click', () => viewAnalytics(btn.dataset.id));
  });
}

async function loadRecentActivity() {
  try {
    const activity = await fetchData('/activity');
    renderRecentActivity(activity);
  } catch (error) {
    console.error('Error loading activity:', error);
    recentActivityList.innerHTML = '<li class="error-message">Failed to load activity</li>';
  }
}

function renderRecentActivity(activities) {
  recentActivityList.innerHTML = '';
  
  if (!activities || activities.length === 0) {
    recentActivityList.innerHTML = '<li class="empty-state">No recent activity</li>';
    return;
  }
  
  activities.forEach(activity => {
    const activityEl = document.createElement('li');
    activityEl.className = `activity-item ${activity.type}`;
    activityEl.innerHTML = `
      <div class="activity-icon">
        <i class="fas ${getActivityIcon(activity.type, activity.action)}"></i>
      </div>
      <div class="activity-details">
        <div class="activity-text">
          <span class="action">${formatAction(activity.action)}</span> 
          <span class="entity">${activity.name}</span>
        </div>
        <div class="activity-time">${formatTimeAgo(activity.timestamp)}</div>
      </div>
    `;
    recentActivityList.appendChild(activityEl);
  });
}

async function loadUserProfile() {
  try {
    const user = await fetchData('/user');
    document.getElementById('userName').textContent = user.name || 'User';
    document.getElementById('userRole').textContent = user.role || 'Account';
    document.getElementById('userAvatar').src = user.avatar || 'https://randomuser.me/api/portraits/women/45.jpg';
  } catch (error) {
    console.error('Error loading user:', error);
    document.getElementById('userName').textContent = 'User';
    document.getElementById('userRole').textContent = 'Account';
  }
}

// Chart Functions
function initPerformanceChart(data) {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  if (performanceChart) performanceChart.destroy();
  
  performanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels || [],
      datasets: [
        {
          label: 'Impressions',
          data: data.impressions || [],
          borderColor: '#4e73df',
          backgroundColor: 'rgba(78, 115, 223, 0.05)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Clicks',
          data: data.clicks || [],
          borderColor: '#1cc88a',
          backgroundColor: 'rgba(28, 200, 138, 0.05)',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Conversions',
          data: data.conversions || [],
          borderColor: '#f6c23e',
          backgroundColor: 'rgba(246, 194, 62, 0.05)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function initTrafficChart(data) {
  const ctx = document.getElementById('trafficChart').getContext('2d');
  if (trafficChart) trafficChart.destroy();
  
  trafficChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels || [],
      datasets: [{
        data: data.values || [],
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'],
        hoverBackgroundColor: ['#2e59d9', '#17a673', '#2c9faf', '#dda20a', '#be2617'],
        hoverBorderColor: "rgba(234, 236, 244, 1)",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.raw}%`;
            }
          }
        }
      },
      cutout: '70%',
    },
  });
}

// UI Functions
function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
}

function handleSearch() {
  const query = searchInput.value.trim();
  if (query) {
    showToast(`Searching for: ${query}`);
    // Actual search implementation would go here
  }
}

function openNewCampaignModal() {
  newCampaignModal.style.display = 'block';
  document.getElementById('startDate').valueAsDate = new Date();
}

function closeNewCampaignModal() {
  newCampaignModal.style.display = 'none';
  campaignForm.reset();
}

async function handleNewCampaignSubmit(e) {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('campaignName').value,
    campaign_type: document.getElementById('campaignType').value,
    start_date: document.getElementById('startDate').value,
    end_date: document.getElementById('endDate').value,
    status: 'draft'
  };

  try {
    const submitBtn = campaignForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    const newCampaign = await postData('/campaigns', formData);
    
    showToast(`Campaign "${newCampaign.name}" created!`, 'success');
    closeNewCampaignModal();
    await loadCampaigns();
    
    // Add to activity feed
    const activity = {
      type: 'campaign',
      action: 'created',
      name: newCampaign.name,
      timestamp: new Date().toISOString()
    };
    recentActivityList.insertAdjacentHTML('afterbegin', `
      <li class="activity-item campaign">
        <div class="activity-icon"><i class="fas fa-rocket"></i></div>
        <div class="activity-details">
          <div class="activity-text">
            <span class="action">Created</span> 
            <span class="entity">${newCampaign.name}</span>
          </div>
          <div class="activity-time">Just now</div>
        </div>
      </li>
    `);
    
  } catch (error) {
    showToast('Failed to create campaign', 'error');
  } finally {
    const submitBtn = campaignForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Campaign';
  }
}

// Helper Functions
function formatNumber(num, isCurrency = false) {
  num = num || 0;
  if (isCurrency) {
    return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'Just now';
}

function formatCampaignType(type) {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatStatus(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAction(action) {
  if (!action) return '';
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function getActivityIcon(type, action) {
  const icons = {
    campaign: action === 'created' ? 'fa-rocket' : 'fa-edit',
    product: 'fa-couch',
    email: 'fa-envelope',
    social: 'fa-share-alt',
    default: 'fa-bell'
  };
  return icons[type] || icons.default;
}

function updateTrend(element, value) {
  if (!element) return;
  const isPositive = value >= 0;
  element.className = isPositive ? 'stat-trend up' : 'stat-trend down';
  element.innerHTML = isPositive 
    ? `<i class="fas fa-arrow-up"></i> <span>${Math.abs(value)}%</span>`
    : `<i class="fas fa-arrow-down"></i> <span>${Math.abs(value)}%</span>`;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toastContainer.removeChild(toast), 300);
  }, 5000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  if (event.target === newCampaignModal) {
    closeNewCampaignModal();
  }
});

// Campaign view/edit functions
function viewCampaign(id) {
  showToast(`Viewing campaign ${id}`);
  // Actual implementation would open campaign view
}

function editCampaign(id) {
  showToast(`Editing campaign ${id}`);
  // Actual implementation would open edit form
}

function viewAnalytics(id) {
  showToast(`Viewing analytics for campaign ${id}`);
  // Actual implementation would show analytics
}