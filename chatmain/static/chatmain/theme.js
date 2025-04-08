const toggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('chat-theme') || 'default';

document.body.setAttribute('data-theme', currentTheme);
toggle.checked = currentTheme === 'modern';
toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'modern' : 'default';
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('chat-theme', theme);

// Re-render sentiment charts from the last GPT message
    const allMessages = document.querySelectorAll('.chat-message');
    const gptMessage = Array.from(allMessages).reverse().find(el => {
        const sender = el.previousElementSibling?.textContent;
        return sender === 'GPT';
    });

    if (gptMessage) {
        const messageId = gptMessage.dataset.id;
// Look up message in JS (if you have message data stored), or grab its attached data
        const msgData = gptMessage.__messageWithScores;

        if (msgData) {
            try {
                const segments = JSON.parse(msgData);
                const scores = segments.map(s => s.sentiment_score);
                Object.values(chartRefs).forEach(chart => chart.destroy());
//         renderSentimentCharts(scores);
                renderSentimentDistributionChart(scores);
                renderSentimentPolarityBar(scores);

            } catch (err) {
                console.warn('🧠 Failed to parse stored scores for re-render:', err);
            }
        }
    }
});

function updateStatus(text) {
    const roomName = JSON.parse(document.getElementById('room-name').textContent);
    document.getElementById('room-display').textContent = roomName;
    document.getElementById('server-ip').textContent = window.location.hostname;
    const bar = document.getElementById('status-bar');
    bar.textContent = text;
}