
let enableColorize = true;
const chartRefs = {};

let chatSocket;
let reconnectAttempts = 0;
const maxReconnect = 5;
let lastMessageTime = Date.now();

const getCSSVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
let glbTextColor = getCSSVar('--text-color') || '#000000';
let glbGridColor = getCSSVar('--border-color') || '#444';

let anon_id = localStorage.getItem('anon_id');
if (!anon_id) {
anon_id = generateCleanUUID();
localStorage.setItem('anon_id', anon_id);
}
document.getElementById('toggle-colorize').addEventListener('change', function () {
enableColorize = this.checked;
});

function refreshImageById(messageId) {
const img = document.getElementById("visbias-image");
const timestamp = new Date().getTime();
img.src = `/static/chatmain/${messageId}.jpg?t=${timestamp}`;
}

const roomName = JSON.parse(document.getElementById('room-name').textContent);
document.getElementById('room-display').textContent = roomName;
document.getElementById('server-ip').textContent = window.location.hostname;



function updateStatus(text) {
const bar = document.getElementById('status-bar');
bar.textContent = text;
}

function connectWebSocket() {
updateStatus(`[CONNECTING] :: SERVER: ${window.location.hostname} :: ROOM: ${roomName}`);
chatSocket = new WebSocket('ws://' + window.location.host + '/ws/chat/' + roomName + '/');

chatSocket.onopen = () => {
reconnectAttempts = 0;
updateStatus(`[CONNECTED] :: SERVER: ${window.location.hostname} :: ROOM: ${roomName}`);
};

chatSocket.onmessage = function(e) {
lastMessageTime = Date.now();
const data = JSON.parse(e.data);
const messages = Array.isArray(data) ? data : [data.message || data];
messages.forEach(handleIncomingMessage);
};

chatSocket.onclose = function(e) {
updateStatus(`[DISCONNECTED] :: RETRYING (${reconnectAttempts + 1}/${maxReconnect})...`);
if (reconnectAttempts < maxReconnect) {
setTimeout(connectWebSocket, 2000);
reconnectAttempts++;
} else {
updateStatus(`[FAILED TO CONNECT] :: SERVER: ${window.location.hostname}`);
}
};
}

connectWebSocket();
function getCompoundBins(scores, binCount = 20) {
const binWidth = 2 / binCount; // from -1 to 1
const bins = Array(binCount).fill(0);
const total = scores.length;

scores.forEach(s => {
const compound = s.compound;
const index = Math.min(Math.floor((compound + 1) / binWidth), binCount - 1);
bins[index]++;
});

const normalized = bins.map(count => (count / total) * 100);
const labels = Array.from({ length: binCount }, (_, i) =>
(-(1 - binWidth / 2) + i * binWidth).toFixed(2)
);

return { labels, normalized };
}
function renderSentimentCharts(scores) {
const bins = Array(10).fill(0).map((_, i) => `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`);
const negCounts = Array(10).fill(0);
const neuCounts = Array(10).fill(0);
const posCounts = Array(10).fill(0);
let posCount = 0, negCount = 0, posSum = 0, negSum = 0;

scores.forEach(s => {
const getBin = v => Math.min(9, Math.floor(v * 10));
if (s.neg > 0) negCounts[getBin(s.neg)]++;
if (s.neu > 0) neuCounts[getBin(s.neu)]++;
if (s.pos > 0) posCounts[getBin(s.pos)]++;

if (s.pos > 0) {
posCount++;
posSum += s.pos;
}
if (s.neg > 0) {
negCount++;
negSum += s.neg;
}
});


function createChart(canvasId, label, data, color, chartKey, isHorizontal = false) {
const ctx = document.getElementById(canvasId).getContext('2d');

// Destroy existing chart before creating a new one
if (chartRefs[chartKey]) {
chartRefs[chartKey].destroy();
}

const baseOptions = {
type: 'bar',
options: {
indexAxis: isHorizontal ? 'y' : 'x',
scales: {
x: {
beginAtZero: true,
ticks: { color: 'rgba(128,128,128,0.7)' },
grid: { display: 'rgba(128,128,128,0.7)' }
},
y: {
ticks: { color: 'rgba(128,128,128,0.7)' },
grid: { display: false }
}
},
plugins: {
title: {
display: true,
text: label,
color: 'rgba(128,128,128,0.7)',
font: { size: 14, weight: 'bold' },
padding: { top: 10, bottom: 10 }
},
legend: {
display: false
}
}
},
data: {
labels: isHorizontal ? [''] : bins,
datasets: [{
label,
data,
backgroundColor: color
}]
}
};

chartRefs[chartKey] = new Chart(ctx, baseOptions);
}


createChart('neg-chart', 'Negative', negCounts, 'rgba(255,80,80,0.7)', 'neg');
createChart('neu-chart', 'Neutral', neuCounts, 'rgba(128,128,128,0.7)', 'neu');
createChart('pos-chart', 'Positive', posCounts, 'rgba(0,255,153,0.7)', 'pos');
// createChart('ratio-bar', 'Sentence Count: Negative vs Positive', [negCount, posCount], ['rgba(255,80,80,0.7)', 'rgba(0,255,153,0.7)'], 'ratio', true);
// createChart('sum-bar', 'Sum of Sentiment Scores', [negSum.toFixed(2), posSum.toFixed(2)], ['rgba(255,80,80,0.7)', 'rgba(0,255,153,0.7)'], 'sum', true);

}
function renderSentimentDistributionChart(scores, canvasId = 'compound-curve-chart', binCount = 20) {
const compoundScores = scores.map(s => s.compound);
const binWidth = 2 / binCount;
const bins = Array(binCount).fill(0);

compoundScores.forEach(score => {
const index = Math.min(Math.floor((score + 1) / binWidth), binCount - 1);
bins[index]++;
});

const total = compoundScores.length;
const normalizedBins = bins.map(count => (count / total) * 100);
const labels = Array.from({ length: binCount }, (_, i) =>
(-(1 - binWidth / 2) + i * binWidth).toFixed(2)
);

const ctx = document.getElementById(canvasId).getContext('2d');
if (chartRefs['compoundCurve']) {
chartRefs['compoundCurve'].destroy();
}

chartRefs['compoundCurve'] = new Chart(ctx, {
type: 'line',
data: {
labels: labels,
datasets: [{
label: 'Compound Score Distribution',
data: normalizedBins,
fill: true,
tension: 0.4,
borderWidth: 2,
borderColor: 'rgba(75,192,192,1)',
backgroundColor: 'rgba(75,192,192,0.2)',
pointRadius: 2,
pointHoverRadius: 4
}]
},
options: {
responsive: true,
scales: {
x: {
title: { display: true, text: 'Compound Sentiment Score' },
ticks: { color: glbTextColor },
grid: { color: glbGridColor }
},
y: {
beginAtZero: true,
title: { display: true, text: 'Percentage (%)' },
ticks: { color: glbTextColor },
grid: { color: glbGridColor }
}
},
plugins: {
tooltip: {
callbacks: {
label: ctx => `${ctx.raw.toFixed(2)}%`
}
},
legend: {
labels: {
color: glbTextColor
}
}
}
}
});
}

function renderSentimentPolarityBar(scores) {
const { labels, normalized } = getCompoundBins(scores, 20);

let posSum = 0, negSum = 0;
normalized.forEach((val, i) => {
const score = parseFloat(labels[i]);
if (score > 0) posSum += val;
if (score < 0) negSum += val;
});

const ctx = document.getElementById('polarity-bar-chart').getContext('2d');
if (chartRefs['polarityBar']) chartRefs['polarityBar'].destroy();

chartRefs['polarityBar'] = new Chart(ctx, {
type: 'bar',
data: {
labels: ['Polarity'],
datasets: [
{
label: 'Negative',
data: [negSum],
backgroundColor: 'rgba(255, 80, 80, 0.7)',
stack: 'sentiment'
},
{
label: 'Positive',
data: [posSum],
backgroundColor: 'rgba(0, 255, 153, 0.7)',
stack: 'sentiment'
}
]
},
options: {
indexAxis: 'y',
responsive: true,
scales: {
x: {
stacked: true,
max: 100,
title: { display: true, text: 'Percentage of Sentiment Area (%)', color: glbTextColor },
ticks: { color: glbTextColor },
grid: { color: glbGridColor }
},
y: {
stacked: true,
ticks: { color: glbTextColor },
grid: { display: false }
}
},
plugins: {
tooltip: {
callbacks: {
label: ctx => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`
}
},
legend: {
labels: {
color: glbTextColor
}
},
title: {
display: true,
text: 'Sentiment Polarity Balance',
color: glbTextColor,
font: { size: 14, weight: 'bold' }
}
}
}
});
}


function handleIncomingMessage(message) {
if (typeof message === 'object' && message !== null) {
const messageWrapper = document.createElement('div');
messageWrapper.classList.add('message-wrapper');

const sender = document.createElement('div');
sender.classList.add('sender-name');
sender.textContent = message.user_uuid.slice(0, 4);

const bubble = document.createElement('div');
bubble.classList.add('chat-message');
bubble.dataset.id = message.msg_uuid;

let messageHtml = '';
if (enableColorize && message.user_uuid === 'GPT') {
try {
const segments = JSON.parse(message.message_with_scores);
segments.forEach(seg => {
const text = seg.content;
const compound = seg.sentiment_score.compound;
let bgColor = '';
let textColor = glbTextColor; // default light text

const alpha = Math.min(Math.abs(compound), 1).toFixed(2);

if (compound > 0) {
bgColor = `rgba(0, 255, 153, ${alpha})`;
} else if (compound < 0) {
bgColor = `rgba(255, 80, 80, ${alpha})`;
}
if (compound >= 0.8 ) {
textColor = '#000'; // dark text on bright backgrounds
}
// const formatted = marked.parseInline(text);
//
// messageHtml += `<span style="background-color: ${bgColor}; border-radius: 6px; padding: 2px 4px; margin: 2px; display: inline;">${formatted}</span> `;
const formatted = marked.parseInline(text);
const tooltip = `neg: ${seg.sentiment_score.neg.toFixed(2)}, neu: ${seg.sentiment_score.neu.toFixed(2)}, pos: ${seg.sentiment_score.pos.toFixed(2)}, compound: ${seg.sentiment_score.compound.toFixed(2)}`;
messageHtml += `<span title="${tooltip}" style="background-color: ${bgColor}; border-radius: 6px; padding: 2px 4px; margin: 2px; display: inline;">${formatted}</span> `;
});
} catch (err) {
console.error('Failed to parse message_with_scores:', err);
messageHtml = marked.parse(message.message);
}
} else {
messageHtml = marked.parse(message.message);
}
if (message.user_uuid === 'GPT' && enableColorize) {
try {
const segments = JSON.parse(message.message_with_scores);
const scores = segments.map(s => s.sentiment_score);
//  renderSentimentCharts(scores);
renderSentimentDistributionChart(scores);
renderSentimentPolarityBar(scores);

} catch (err) {
console.error('📊 Failed to render sentiment chart:', err);
}
}
bubble.__messageWithScores = message.message_with_scores;


bubble.innerHTML = `
            <div class="message-text">${messageHtml}</div>
            <div class="meta">ID: ${message.msg_uuid}</div>
        `;

if (message.user_uuid === anon_id) {
messageWrapper.classList.add('own-wrapper');
bubble.classList.add('own-message', 'my-message');
} else {
messageWrapper.classList.add('other-wrapper');
bubble.classList.add('other-message');
refreshImageById(message.msg_uuid);
bubble.ondblclick = () => {
const msgId = bubble.dataset.id;
if (msgId) {
refreshImageById(msgId);
}

if (message.user_uuid === 'GPT' && enableColorize) {
try {
const segments = JSON.parse(message.message_with_scores);
const scores = segments.map(s => s.sentiment_score);
//        renderSentimentCharts(scores);
renderSentimentDistributionChart(scores)
renderSentimentPolarityBar(scores);
} catch (err) {
console.error('📊 Failed to update sentiment chart on double-click:', err);
}
}
};
}

messageWrapper.appendChild(sender);
messageWrapper.appendChild(bubble);
chatLog.appendChild(messageWrapper);
chatLog.scrollTop = chatLog.scrollHeight;
}
}

const chatLog = document.getElementById('chat-log');
let lastSentMessageId = null;

function generateCleanUUID() {
return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
const r = Math.random() * 16 | 0;
return r.toString(16);
});
}

document.querySelector('#chat-message-input').focus();
document.querySelector('#chat-message-input').onkeyup = function(e) {
if (e.key === 'Enter') {
document.querySelector('#chat-message-submit').click();
}
};

document.querySelector('#chat-message-submit').onclick = function(e) {
const messageInput = document.querySelector('#chat-message-input');
const message = messageInput.value.trim();

if (message !== '') {
const customId = generateCleanUUID();
lastSentMessageId = customId;

chatSocket.send(JSON.stringify({
'message': message,
'msg_uuid': customId,
'user_uuid': anon_id
}));

messageInput.value = '';
}
};

const historyUrl = window.location.pathname.endsWith('/')
? window.location.pathname + 'history'
: window.location.pathname + '/history';

fetch(historyUrl)
.then(response => response.json())
.then(data => {
data.forEach(message => {
    handleIncomingMessage({
        user_uuid: message.user_uuid,
        message: message.message,
        msg_uuid: message.msg_uuid,
        message_with_scores: message.message_with_scores
    });
});
})
.catch(error => {
console.error('❌ 加载历史消息失败:', error);
});
setInterval(() => {
const now = Date.now();
if (now - lastMessageTime > 60000) { // 60s without messages
console.warn('⚠️ No messages in a while. Reconnecting...');
chatSocket.close(); // trigger onclose → reconnect
}
}, 30000);

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
glbTextColor = getCSSVar('--text-color') || '#000000';
glbGridColor = getCSSVar('--border-color') || '#444';
if (gptMessage) {
const messageId = gptMessage.dataset.id;
// Look up message in JS (if you have message data stored), or grab its attached data
const msgData = gptMessage.__messageWithScores;  // Optional: if you previously stored it

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

