document.addEventListener('DOMContentLoaded', function() {
    // Toggle sidebar on mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Initialize charts
    initCharts();
    
    // Initialize tooltips
    initTooltips();
});

function initCharts() {
    // Performance Chart
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    const performanceChart = new Chart(performanceCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'Impressions',
                    data: [12000, 15000, 18000, 21000, 22000, 24500],
                    borderColor: '#6d4c41',
                    backgroundColor: 'rgba(109, 76, 65, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Clicks',
                    data: [2000, 2500, 2800, 3000, 3100, 3200],
                    borderColor: '#ffab91',
                    backgroundColor: 'rgba(255, 171, 145, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Conversions',
                    data: [80, 95, 110, 125, 135, 142],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    const trafficChart = new Chart(trafficCtx, {
        type: 'doughnut',
        data: {
            labels: ['Direct', 'Social', 'Email', 'Referral', 'Organic'],
            datasets: [{
                data: [35, 25, 20, 12, 8],
                backgroundColor: [
                    '#6d4c41',
                    '#ffab91',
                    '#4CAF50',
                    '#2196F3',
                    '#9C27B0'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

function initTooltips() {
    // Initialize any tooltips if needed
    // Could use a library like tippy.js or plain CSS tooltips
}