document.addEventListener('DOMContentLoaded', function() {
    // Modal Handling
    const modal = document.getElementById('social-campaign-modal');
    const btn = document.getElementById('new-social-campaign');
    const span = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancel-campaign');

    btn.onclick = function() {
        modal.style.display = 'block';
    }

    span.onclick = function() {
        modal.style.display = 'none';
    }

    cancelBtn.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // Platform Tab Switching
    const platformTabs = document.querySelectorAll('.platform-tab');
    platformTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            platformTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const platform = this.dataset.platform;
            filterCampaigns(platform);
        });
    });

    // Form Submission
    const form = document.getElementById('social-campaign-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        // Add campaign creation logic here
        alert('Campaign created successfully!');
        modal.style.display = 'none';
        form.reset();
    });

    // Filter campaigns by platform
    function filterCampaigns(platform) {
        const rows = document.querySelectorAll('.campaigns-table tbody tr');
        rows.forEach(row => {
            if (platform === 'all' || row.querySelector('.platform-badge').classList.contains(platform)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
});