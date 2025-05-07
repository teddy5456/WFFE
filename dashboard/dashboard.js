document.getElementById('sendEmailCampaign').addEventListener('click', async (e) => {
    e.preventDefault();
    const sendBtn = e.target.closest('button');
    const loadingSpan = sendBtn.querySelector('.btn-loading');
    const btnText = sendBtn.querySelector('.btn-text');

    try {
        // Show loading state
        btnText.style.display = 'none';
        loadingSpan.style.display = 'inline-block';

        // Collect review data
        const emailData = {
            campaignName: document.getElementById('reviewCampaignName').textContent,
            description: document.getElementById('reviewDescription').textContent,
            subject: document.getElementById('reviewSubject').textContent,
            audience: document.getElementById('reviewAudience').textContent,
            recipients: document.getElementById('reviewRecipients').textContent.split(',').map(email => email.trim()),
            senderName: document.getElementById('reviewSender').textContent,
            status: document.getElementById('reviewStatus').textContent,
            schedule: document.getElementById('reviewSchedule').textContent
        };

        // Initialize EmailJS with your public key
        emailjs.init('cy9YL054A1rcf2BH4');

        // Send to all recipients
        const sendPromises = emailData.recipients.map(async (email) => {
            const templateParams = {
                receiver_email: email,
                from_name: emailData.senderName,
                subject: emailData.subject,
                dynamic_content: document.getElementById('emailPreviewContent').innerHTML,
                campaign_name: emailData.campaignName
            };

            return emailjs.send(
                'service_6uu4fwd',
                'template_ee6393m',
                templateParams
            );
        });

        const results = await Promise.allSettled(sendPromises);
        
        // Handle results
        const failedEmails = results.filter((result, index) => 
            result.status === 'rejected'
        ).map((_, index) => emailData.recipients[index]);

        if (failedEmails.length > 0) {
            throw new Error(`Failed to send to: ${failedEmails.join(', ')}`);
        }

        alert('Campaign sent successfully!');
    } catch (error) {
        console.error('Error sending campaign:', error);
        alert(`Error: ${error.message}`);
    } finally {
        // Reset button state
        btnText.style.display = 'inline-block';
        loadingSpan.style.display = 'none';
    }
});