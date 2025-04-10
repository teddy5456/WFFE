document.addEventListener('DOMContentLoaded', function () {
    async function fetchCampaignData() {
        try {
            const response = await fetch('http://localhost:8000/api/campaigns');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            // Fix: Extract the actual campaign array
            if (!Array.isArray(data) || !Array.isArray(data[0])) {
                throw new Error('Unexpected API response structure');
            }

            return data[0]; // Extract campaigns array
        } catch (error) {
            console.error('Error fetching campaign data:', error);
            return [];
        }
    }

    async function init() {
        const campaigns = await fetchCampaignData();
        const list = document.getElementById('campaign-list');

        // Clear existing items
        list.innerHTML = '';

        // Populate the list dynamically
        campaigns.forEach(campaign => {
            const li = document.createElement('li');
            li.classList.add('campaign-item');

            li.innerHTML = `
                <div class="campaign-info">
                    <div class="campaign-name">${campaign.name}</div>
                    <div class="campaign-meta">
                        <span class="campaign-type ${campaign.campaign_type.toLowerCase()}">
                            <i class="fas fa-share-alt"></i> ${campaign.campaign_type}
                        </span>
                        <span class="campaign-date">${new Date(campaign.start_date).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="campaign-stats">
                    <div class="stat">
                        <div class="value">${campaign.impressions.toLocaleString()}</div>
                        <div class="label">Impressions</div>
                    </div>
                    <div class="stat">
                        <div class="value">${campaign.clicks.toLocaleString()}</div>
                        <div class="label">Clicks</div>
                    </div>
                    <div class="stat">
                        <div class="value">$${campaign.revenue.toLocaleString()}</div>
                        <div class="label">Revenue</div>
                    </div>
                </div>
                <button class="campaign-action">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            `;

            list.appendChild(li);
        });
    }

    init();
});
