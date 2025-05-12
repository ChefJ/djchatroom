// ==== DOM Cache and Globals ====
const chatLog = document.getElementById('chat-log');
const roomName = JSON.parse(document.getElementById('room-name').textContent);
document.getElementById('room-display').textContent = roomName;
document.getElementById('server-ip').textContent = window.location.hostname;

let comparedMessages = {}; // <-- NEW: Track compared messages
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

// ==== Handle Incoming Messages ====
function handleIncomingMessage(message) {
    if (typeof message !== 'object' || message === null) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper');

    const sender = document.createElement('div');
    sender.classList.add('sender-name');
    sender.textContent = message.user_uuid.slice(0, 4);
    sender.style = "display:none;"

    const bubble = document.createElement('div');
    bubble.classList.add('chat-message');
    bubble.dataset.id = message.msg_uuid;
    bubble.__messageWithScores = message.message_with_scores;

    let messageHtml = '';
    if ( message.user_uuid === 'GPT') {
        try {
            const segments = JSON.parse(message.message_with_scores);
            segments.forEach(seg => {
                const text = seg.content;
                const compound = seg.sentiment_score.compound;
                let bgColor = '';
                let textColor = glbTextColor;

                const alpha = Math.min(Math.abs(compound), 1).toFixed(2);
                if (enableColorize) {
                    if (compound > 0) {
                        bgColor = `rgba(0, 255, 153, ${alpha})`;
                    } else if (compound < 0) {
                        bgColor = `rgba(255, 80, 80, ${alpha})`;
                    }
                }

                const formatted = marked.parseInline(text);
                const tooltip = `neg: ${seg.sentiment_score.neg.toFixed(2)}, neu: ${seg.sentiment_score.neu.toFixed(2)}, pos: ${seg.sentiment_score.pos.toFixed(2)}, compound: ${compound.toFixed(2)}`;

                messageHtml += `<span 
                class="sentiment-segment" 
                title="" 
                data-compound="${compound}" 
                style="border-radius: 6px; padding: 2px 4px; margin: 2px; display: inline; ${bgColor ? `background-color: ${bgColor};` : ''}">
                ${formatted}
            </span> `;
            });
        } catch (err) {
            console.error('Failed to parse message_with_scores:', err);
            messageHtml = marked.parse(message.message);
        }
    } else {
        messageHtml = marked.parse(message.message);
    }

    bubble.innerHTML = `
        <div class="message-text">${messageHtml}</div>

        <div class="meta" style="display: none">ID: ${message.msg_uuid}</div>
    `;

    if (message.user_uuid === 'GPT') {
        bubble.innerHTML = `
        <div class="message-text">${messageHtml}</div>
        <br>
        <div className="meta" style="color:dimgrey;font-style:italic;">* Double click on any sentence to quick adjust
            tone*
        </div>
    `; }


        setTimeout(() => {
        const segments = bubble.querySelectorAll('.sentiment-segment');
        segments.forEach(seg => {
            seg.addEventListener('mouseenter', () => {
                const score = parseFloat(seg.dataset.compound);
                highlightChartBin(score);
            });
            seg.addEventListener('mouseleave', () => {
                removeChartHighlights();
            });

            // ✅ Double-click to open refine popup
            seg.addEventListener('dblclick', (e) => {
                // Remove previous highlights
                document.querySelectorAll('.sentiment-segment.selected-sentence')
                    .forEach(el => el.classList.remove('selected-sentence'));

                // Highlight this one
                seg.classList.add('selected-sentence');

                // Prevent native text selection (hard cancel)
                if (window.getSelection) {
                    const sel = window.getSelection();
                    if (sel && sel.type !== "None") {
                        sel.removeAllRanges();
                    }
                }
                document.activeElement?.blur(); // Extra protection

                // Show popup above this segment
                const popup = document.getElementById('refine-popup');
                const rect = seg.getBoundingClientRect();

                popup.style.top = `${window.scrollY + rect.top - 40}px`;
                popup.style.left = `${window.scrollX + rect.left}px`;
                popup.style.display = 'flex';
                popup.dataset.originalText = seg.textContent;
                popup.__sourceBubble = seg.closest('.chat-message');
            });

            // ✅ Hover interaction
            seg.addEventListener('mouseenter', () => {
                const indicator = document.getElementById('legend-indicator');
                if (!indicator) {
                    return;}
                const bar = indicator.parentElement;
                const width = bar.offsetWidth;

                // Map compound (-1 to +1) to [0, width]
                const clamped = Math.max(-1, Math.min(1, seg.dataset.compound));
                const pos = ((clamped + 1) / 2) * width;

                indicator.style.left = `${pos}px`;
                indicator.style.display = 'block';
            });

            seg.addEventListener('mouseleave', () => {
                const indicator = document.getElementById('legend-indicator');
                if (indicator) indicator.style.display = 'none';
            });
        });


    }, 0);
    messageWrapper.appendChild(sender);
    messageWrapper.appendChild(bubble);

    if (message.user_uuid === anon_id) {
        messageWrapper.classList.add('own-wrapper');
        bubble.classList.add('own-message', 'my-message');
    } else {
        messageWrapper.classList.add('other-wrapper');
        bubble.classList.add('other-message');

        // refreshImageById(message.msg_uuid);

/*        bubble.ondblclick = () => {
            refreshImageById(message.msg_uuid);
            if (message.user_uuid === 'GPT' && enableColorize) {
                try {
                    const segments = JSON.parse(message.message_with_scores);
                    const scores = segments.map(s => s.sentiment_score);
                    renderSentimentDistributionChart(scores);
                    renderSentimentPolarityBar(scores);
                    renderSentimentBarChart(scores);
                    window.__activeSentimentMessage = bubble;
                } catch (err) {
                    console.error('📊 Failed to update sentiment chart on double-click:', err);
                }
            }
        };*/
    }

    // ==== NEW: Add Compare Checkbox + Scoring Buttons for GPT ====
    if (message.user_uuid === 'GPT') {
        // Compare checkbox
        const compareLabel = document.createElement('label');
        compareLabel.classList.add('compare-checkbox-wrapper');
        compareLabel.style.display = 'inline-flex';
        compareLabel.style.alignItems = 'center';
        compareLabel.style.gap = '6px';
        compareLabel.style.marginTop = '4px';
        compareLabel.innerHTML = `
            <input type="checkbox" class="compare-checkbox" data-msg-id="${message.msg_uuid}">
            <span style="font-size: 12px;">Compare</span>
        `;
        if (roomConfig.experiment_type != 'all'){
            compareLabel.innerHTML = `
            <input type="checkbox" class="compare-checkbox" style="display: none" data-msg-id="${message.msg_uuid}">
            <span style="font-size: 12px;display: none">Compare</span>
        `;
        }
        compareLabel.querySelector('input').addEventListener('change', (e) => {
            const msgId = e.target.dataset.msgId;
            const bubble = document.querySelector(`[data-id="${msgId}"]`);

            if (e.target.checked) {
                comparedMessages[msgId] = message.message_with_scores;
                bubble?.classList.add('compared');
            } else {
                delete comparedMessages[msgId];
                bubble?.classList.remove('compared');
            }

            updateComparisonCharts();
        });
        messageWrapper.appendChild(compareLabel);

        // Score buttons
        const scoreContainer = document.createElement('div');
        scoreContainer.className = 'score-buttons-wrapper';
        scoreContainer.dataset.msgId = message.msg_uuid;

        const scoreButtons = document.createElement('div');
        scoreButtons.className = 'score-buttons';

        for (let i = 0; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'score-btn';
            btn.dataset.score = i;
            btn.textContent = i === 10 ? 'Satisfied' : i;  // 👈 Change '10' to 'Satisfied'
            scoreButtons.appendChild(btn);
        }

        scoreContainer.appendChild(scoreButtons);
        messageWrapper.appendChild(scoreContainer);

        scoreButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('score-btn')) {
                const score = parseInt(e.target.dataset.score);
                const msgId = scoreContainer.dataset.msgId;

                fetch('/message_scoring/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: JSON.stringify({ msg_uuid: msgId, score: score })
                }).then(response => {
                    if (!response.ok) throw new Error('Failed to submit score');

                    // Visual feedback
                    scoreButtons.querySelectorAll('button').forEach(btn => btn.disabled = true);
                    scoreButtons.classList.add('scored');
                    e.target.classList.add('selected');

                    // ✅ If score is 10, chain to /next_experiment/
                    if (score === 10) {
                        const uuid = localStorage.getItem('anon_id') || '';
                        fetch('/next_experiment/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': getCSRFToken(),
                            },
                            body: JSON.stringify({ uuid: uuid })
                        })
                            .then(res => res.text())
                            .then(url => {
                                // ✅ just navigate to it
                                window.location.href = url;
                            })
                            .catch(err => {
                                console.error("Redirect failed:", err);
                            });
                    } else {
                        // ✅ Re-enable input if not satisfied
                        setInputDisabled(false);
                        document.querySelector('#chat-message-input').focus();
                    }
                }).catch(err => {
                    console.error('Error submitting score:', err);
                });
            }
        });
    }

    chatLog.appendChild(messageWrapper);
    chatLog.scrollTop = chatLog.scrollHeight;

    if (message.user_uuid === 'GPT' && enableColorize) {
        try {
            const segments = JSON.parse(message.message_with_scores);
            const scores = segments.map(s => s.sentiment_score);
            renderSentimentDistributionChart(scores);
            renderSentimentPolarityBar(scores);
            renderSentimentBarChart(scores);
            window.__activeSentimentMessage = bubble;
        } catch (err) {
            console.error('📊 Failed to render sentiment chart:', err);
        }

        autoCheckLatestTwoGPT();
    }
}

// ==== Chart Comparison Handling ====
function updateComparisonCharts() {
    Object.values(chartRefs).forEach(chart => chart.destroy?.());

    const messageEntries = Object.entries(comparedMessages);
    if (messageEntries.length === 0) return;

    const datasetsCurve = [];
    const datasetsBar = [];
    const datasetsPolarity = [];
    const colors = generateColorPalette(messageEntries.length);

    messageEntries.forEach(([msgId, messageWithScores], index) => {
        try {
            const segments = JSON.parse(messageWithScores);
            const scores = segments.map(s => s.sentiment_score);
            const { labels, normalized } = getCompoundBins(scores, 20);

            datasetsCurve.push({
                label: msgId,
                data: normalized,
                borderColor: colors[index],
                backgroundColor: colors[index],
                fill: false,
                tension: 0.4,
                pointRadius: 2
            });

            datasetsBar.push({
                label: msgId,
                data: normalized,
                backgroundColor: colors[index],
                borderColor: colors[index],
                borderWidth: 1
            });

            let posSum = 0, negSum = 0;
            normalized.forEach((val, i) => {
                const score = parseFloat(labels[i]);
                if (score > 0) posSum += val;
                if (score < 0) negSum += val;
            });
            datasetsPolarity.push({
                label: msgId + " (Pos)",
                data: [posSum],
                backgroundColor: colors[index]
            });
            datasetsPolarity.push({
                label: msgId + " (Neg)",
                data: [-negSum],
                backgroundColor: lightenColor(colors[index], 0.5)
            });

            const color = colors[index];
            const bubble = document.querySelector(`[data-id="${msgId}"]`);
            if (bubble) {
                bubble.classList.add('compared');
                bubble.style.borderRight = `6px solid ${color}`;
            }

        } catch (err) {
            console.error('❌ Failed to parse sentiment data:', err);
        }
    });

    renderMultiSentimentDistributionChart(datasetsCurve);
    renderMultiSentimentBarChart(datasetsBar);
    renderMultiSentimentPolarityChart(datasetsPolarity);

    document.querySelectorAll('.chat-message').forEach(bubble => {
        const msgId = bubble.dataset.id;
        if (!(msgId in comparedMessages)) {
            bubble.classList.remove('compared');
            bubble.style.borderRight = '';
        }
    });
}

function autoCheckLatestTwoGPT() {
    // 1. Uncheck all compare checkboxes first
    const allCompareBoxes = Array.from(document.querySelectorAll('.compare-checkbox'));
    allCompareBoxes.forEach(box => box.checked = false);
    comparedMessages = {}; // 🧹 Clear current compared messages

    // 2. Find GPT message checkboxes
    const gptBoxes = allCompareBoxes.filter(box => {
        const wrapper = box.closest('.message-wrapper');
        return wrapper?.querySelector('.sender-name')?.textContent === 'GPT';
    });

    // 3. Auto-check the latest two GPT messages
    if (gptBoxes.length >= 2) {
        const lastTwo = gptBoxes.slice(-2);
        lastTwo.forEach(box => {
            box.checked = true;
            const msgId = box.dataset.msgId;
            const bubble = document.querySelector(`[data-id="${msgId}"]`);
            if (bubble && bubble.__messageWithScores) {
                comparedMessages[msgId] = bubble.__messageWithScores;
            }
        });
    } else if (gptBoxes.length === 1) {
        const box = gptBoxes[0];
        box.checked = true;
        const msgId = box.dataset.msgId;
        const bubble = document.querySelector(`[data-id="${msgId}"]`);
        if (bubble && bubble.__messageWithScores) {
            comparedMessages[msgId] = bubble.__messageWithScores;
        }
    }

    // 4. After updating comparedMessages, refresh charts
    updateComparisonCharts();
}


// ==== Helpers ====
function updateStatus(text) {
    const bar = document.getElementById('status-bar');
    bar.textContent = text;
}

function getCSRFToken() {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        const trimmed = c.trim();
        if (trimmed.startsWith(name + '=')) {
            return decodeURIComponent(trimmed.slice(name.length + 1));
        }
    }
    return '';
}

function refreshImageById(messageId) {
    const img = document.getElementById('visbias-image');
    if (img) {
        const timestamp = new Date().getTime();
        img.src = `/static/chatmain/${messageId}.jpg?t=${timestamp}`;
    }
}