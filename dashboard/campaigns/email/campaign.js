document.addEventListener('DOMContentLoaded', function() {
    // Initialize any campaign-specific functionality
    
    // Example: Row click handler
    const tableRows = document.querySelectorAll('.campaigns-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't trigger if clicking on an action button
            if (!e.target.closest('.action-btn')) {
                const campaignName = this.querySelector('.campaign-name span').textContent;
                console.log(`Viewing campaign: ${campaignName}`);
                // In a real app, you would navigate to the campaign detail page
            }
        });
    });
    
    // Filter button handler
    const filterBtn = document.querySelector('.filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            console.log('Applying filters...');
            // In a real app, you would filter the table data
        });
    }
    
    // Pagination button handlers
    const paginationBtns = document.querySelectorAll('.pagination-btn:not(.disabled)');
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('active')) {
                console.log(`Loading page ${this.textContent.trim()}`);
                // In a real app, you would load the corresponding page of results
            }
        });
    });
    
    // New campaign button handler
    const newCampaignBtn = document.querySelector('.quick-action-btn');
    if (newCampaignBtn) {
        newCampaignBtn.addEventListener('click', function() {
            console.log('Creating new campaign...');
            // In a real app, you would navigate to the campaign creation page
            window.location.href = 'create.html';
        });
    }
});