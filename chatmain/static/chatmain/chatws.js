const chatLog = document.getElementById('chat-log');
const roomName = JSON.parse(document.getElementById('room-name').textContent);

function updateStatus(text) {
    document.getElementById('room-display').textContent = roomName;
    document.getElementById('server-ip').textContent = window.location.hostname;
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

    chatSocket.onmessage = function (e) {
        lastMessageTime = Date.now();
        const data = JSON.parse(e.data);
        const messages = Array.isArray(data) ? data : [data.message || data];
        messages.forEach(handleIncomingMessage);
    };

    chatSocket.onclose = function (e) {
        updateStatus(`[DISCONNECTED] :: RETRYING (${reconnectAttempts + 1}/${maxReconnect})...`);
        if (reconnectAttempts < maxReconnect) {
            setTimeout(connectWebSocket, 2000);
            reconnectAttempts++;
        } else {
            updateStatus(`[FAILED TO CONNECT] :: SERVER: ${window.location.hostname}`);
        }
    };
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
                    if (compound >= 0.8) {
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


