// ==== DOM Cache and Globals ====
const chatLog = document.getElementById('chat-log');
const roomName = JSON.parse(document.getElementById('room-name').textContent);
document.getElementById('room-display').textContent = roomName;
document.getElementById('server-ip').textContent = window.location.hostname;

const globalBinAmount = 7;
let comparedMessages = {}; // <-- NEW: Track compared messages

function getLuminance(rgbStr) {
    const rgb = rgbStr.match(/\d+/g).map(Number);
    // Use the perceived luminance formula
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
}

function injectStandaloneRatingButtons(msgId) {
    const container = document.getElementById('tone-score-buttons');
    container.innerHTML = '';

    for (let i = 1; i <= 4; i++) {
        const btn = document.createElement('button');
        btn.className = 'score-btn';
        btn.dataset.score = i;
        switch (i) {
            case 1: btn.textContent = 'Very off'; break;
            case 2: btn.textContent = 'Slightly Off'; break;
            case 3: btn.textContent = 'Neutral'; break;
            case 4: btn.textContent = 'Slightly Aligned'; break;
     //       case 5: btn.textContent = 'Aligned'; break;
        }

        btn.addEventListener('click', () => {
            fetch('/message_scoring/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                body: JSON.stringify({msg_uuid: msgId, score: i})
            }).then(response => {
                if (!response.ok) throw new Error('Failed to submit score');
                container.querySelectorAll('button').forEach(b => b.disabled = true);
                btn.classList.add('selected');
                inputStatusElementUpdate("after_rated");


           //         setInputDisabled(false);
                    document.querySelector('#chat-message-input').focus();

            });
        });

        container.appendChild(btn);
    }
}
function connectWebSocket() {
    updateStatus(`[CONNECTING] :: SERVER: ${window.location.hostname} :: ROOM: ${roomName}`);
    chatSocket = new WebSocket('wss://' + window.location.host + '/ws/chat/' + roomName + '/');

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

function genScoreButtonContainer(message) {
    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'score-buttons-wrapper';
    scoreContainer.dataset.msgId = message.msg_uuid;


    const scoreButtons = document.createElement('div');
    scoreButtons.className = 'score-buttons';
    scoreButtons.style.display = 'flex';
    scoreButtons.style.alignItems = 'flex-start';
    scoreButtons.style.gap = '0px';

// Line for 0 score
    const zeroLine = document.createElement('div');
    zeroLine.className = 'score-zero-line';
    const btn0 = document.createElement('button');
    btn0.className = 'score-btn zero-btn';
    btn0.dataset.score = 0;
    btn0.textContent = 'Answer off-topic';

    zeroLine.appendChild(btn0);

// Vertical bar separator
    const separator = document.createElement('div');
    separator.className = 'score-separator';
    separator.textContent = '｜'; // fullwidth vertical bar
    separator.style.fontSize = '24px';
    separator.style.lineHeight = '32px';
    separator.style.margin = '0 8px';

// Line for 1-10 scores
    const restLine = document.createElement('div');
    restLine.className = 'score-rest-line';
    restLine.style.display = 'flex';
    restLine.style.flexDirection = 'column';

    const hint = document.createElement('span');
    hint.textContent = 'If answer not off-topic, How it\'s tone aligns with your expectation?';
    hint.style.marginBottom = '4px';
    restLine.appendChild(hint);

    const scoreBtnRow = document.createElement('div');
    scoreBtnRow.style.display = 'flex';
    scoreBtnRow.style.flexWrap = 'wrap';
    scoreBtnRow.style.gap = '0px';

    for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.className = 'score-btn';
        btn.dataset.score = i;
        switch (parseInt(btn.dataset.score)) {
            case 1:
                btn.textContent = 'Very off';
                break;
            case 2:
                btn.textContent = 'Slightly Off';
                break;
            case 3:
                btn.textContent = 'Neutral';
                break;
            case 4:
                btn.textContent = 'Slightly Aligned';
                break;
            case 5:
                btn.textContent = 'Aligned';
                break;
        }

        scoreBtnRow.appendChild(btn);
    }

    restLine.appendChild(scoreBtnRow);

// Combine into main
    scoreButtons.appendChild(zeroLine);
    scoreButtons.appendChild(separator);
    scoreButtons.appendChild(restLine);
    scoreContainer.appendChild(scoreButtons);

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
                body: JSON.stringify({msg_uuid: msgId, score: score})
            }).then(response => {
                if (!response.ok) throw new Error('Failed to submit score');

                // Visual feedback
                scoreButtons.querySelectorAll('button').forEach(btn => btn.disabled = true);
                scoreButtons.classList.add('scored');
                e.target.classList.add('selected');

                // ✅ If score is 10, chain to /next_experiment/
                if (score === 5) {
                    const uuid = localStorage.getItem('anon_id') || '';
                    fetch('/next_experiment/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCSRFToken(),
                        },
                        body: JSON.stringify({uuid: uuid})
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
            //        setInputDisabled(false);
                    document.querySelector('#chat-message-input').focus();
                }
            }).catch(err => {
                console.error('Error submitting score:', err);
            });
        }
    });

    return scoreContainer;
}


function sendLog(logContent) {
    try {
        const logUrl = new URL('log_event', window.location.href);

        void fetch(logUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken?.() || '',
            },
            body: typeof logContent === 'string' ? logContent : JSON.stringify(logContent)
        }).catch(() => {
            // Swallow fetch errors silently
        });
    } catch (e) {
        // Swallow any other unexpected errors silently
    }
}

function genComepareLabel(message) {
    const compareLabel = document.createElement('label');
    compareLabel.classList.add('compare-checkbox-wrapper');
    compareLabel.style.display = 'inline-flex';
    compareLabel.style.alignItems = 'center';
    compareLabel.style.gap = '6px';
    compareLabel.style.marginTop = '4px';
    compareLabel.innerHTML = `
            <input type="checkbox" class="compare-checkbox" data-msg-id="${message.msg_uuid}">
            <span style="font-size: 14px;">Visualize the tone</span>
        `;
    //if (roomConfig.experiment_type != 'all')

    compareLabel.innerHTML = `
        <input type="checkbox" class="compare-checkbox" style="display: none" data-msg-id="${message.msg_uuid}">
        <span style="font-size: 14px;display: none">Visualize the tone</span>
    `;
/*    const img_box = document.getElementById('imgbbox');
    img_box.style.display="none";*/

    compareLabel.querySelector('input').addEventListener('change', (e) => {
        const msgId = e.target.dataset.msgId;
        const bubble = document.querySelector(`[data-id="${msgId}"]`);

        sendLog({"tigger":"compare_target_change",
                              "input_value":e.target.checked,
                              "event_goal":e.target.checked?"Add to compare":"Remove from compare",
                              "goal_fulfilled":Object.keys(comparedMessages).length < 2})
        if (e.target.checked) {
            if (Object.keys(comparedMessages).length >= 2) {
                alert("You can compare up to 2 messages at a time.");
                e.target.checked = false;
                return;
            }

            comparedMessages[msgId] = message.message_with_scores;
            bubble?.classList.add('compared');
        } else {
            delete comparedMessages[msgId];
            bubble?.classList.remove('compared');
            bubble.style.borderRight = '';
        }

        updateComparisonCharts();
    });
    return compareLabel;
}

function colorizeMessage(segments) {
    const SENTIMENT_COLORS = ['#c51b7d', '#e9a3c9', '#fde0ef', '#f7f7f7', '#e6f5d0', '#a1d76a', '#4d9221'];
    const binCount = SENTIMENT_COLORS.length;

    let messageHtml = '';
    segments.forEach(seg => {
        const text = seg.content;
        const compound = seg.sentiment_score.compound;

        const binIndex = Math.min(Math.floor(((compound + 1) / 2) * binCount), binCount - 1);
        const bgColor = SENTIMENT_COLORS[binIndex];
        const luminance = getLuminance(bgColor);
        const textColor = ['#c51b7d', '#4d9221'].includes(bgColor) ? '#fff' : '#000';

        const formatted = marked.parseInline(text);
        if (enableColorize){
            messageHtml += `<span 
            class="sentiment-segment" 
            data-compound="${compound}" 
            style="border-radius: 6px; padding: 2px 4px; margin: 2px; display: inline; background-color: ${bgColor}; color: ${textColor};">
            ${formatted}
        </span> `;
        } else{
            messageHtml += `<span 
            class="sentiment-segment" 
            data-compound="${compound}" 
            style="border-radius: 6px; padding: 2px 4px; margin: 2px; display: inline;">
            ${formatted}
        </span> `;
        }

    });
    return messageHtml;
}

function addEventsForBubble(bubble) {
    const segments = bubble.querySelectorAll('.sentiment-segment');
    const msgId = bubble.dataset.id;
    segments.forEach(seg => {
        seg.addEventListener('mouseenter', () => {
/*            sendLog({"tigger":"mouse_enter_segment",
                "input_value":"",
                "event_goal":"",
                "goal_fulfilled":true})*/

            const score = parseFloat(seg.dataset.compound);
            if(Object.keys(comparedMessages).includes(msgId)){
                highlightChartBin(bubble, score);

            }
        });
        seg.addEventListener('mouseleave', () => {
            if(Object.keys(comparedMessages).includes(msgId)){
                removeChartHighlights();

            }
        });

        // ✅ Double-click to open refine popup
        seg.addEventListener('dblclick', (e) => {
            // Remove previous highlights
            sendLog({"tigger":"mouse_dblclick_segment",
                "input_value":"",
                "event_goal":"",
                "goal_fulfilled":true})
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
                return;
            }
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

        // Highlight for legend
        const totalBins = 7;

        seg.addEventListener('mouseenter', () => {
            const compound = parseFloat(seg.dataset.compound);
            const binIndex = Math.min(
                Math.floor(((compound + 1) / 2) * totalBins),
                totalBins - 1
            );

            const boxes = document.querySelectorAll('.tone-square');
            boxes.forEach((box, i) => {
                box.classList.toggle('glow', i === binIndex);
            });
        });

        seg.addEventListener('mouseleave', () => {
            document.querySelectorAll('.tone-square').forEach(box => box.classList.remove('glow'));
        });
    });
}


function inputStatusElementUpdate(input_status){
    if(roomConfig.is_experiment===false) return;
    const section = document.getElementById('reaction-section');
    const initial = section.querySelector('.reaction-initial');
    const rating = section.querySelector('.reaction-rating');

    const offTopicBtn = document.getElementById('btn-off-topic');
    const toneBtn = document.getElementById('btn-tone');
    const backBtn = document.getElementById('tone-back-btn');

    if(input_status==='after_rated'){
        section.style.display='none';
     //   setInputDisabled(false);

    }

    if(input_status==='after_respond'){
        //setInputDisabled(true);

        rating.classList.remove('slide-in');
        rating.classList.add('slide-out');

        setTimeout(() => {
            rating.style.display = 'none';
            rating.classList.remove('slide-out');
            initial.style.display = 'flex';
            initial.classList.add('slide-in');

        }, 300);
        section.style.display='none';
    }
}

// ==== Handle Incoming Messages ====
function handleIncomingMessage(message) {
    console.log(`📨 handleIncomingMessage called for: ${message.msg_uuid}`);
    console.log(`📨 handleIncomingMessage called for: ${roomConfig}`);

    if (typeof message !== 'object' || message === null) return;

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message-wrapper');

    const sender = document.createElement('div');
    sender.classList.add('sender-name');
    sender.textContent = message.user_uuid.slice(0, 4);
   // if(roomConfig.is_experiment===true)  sender.style = "display:none;";


    const bubble = document.createElement('div');
    bubble.classList.add('chat-message');
    bubble.dataset.id = message.msg_uuid;
    bubble.__messageWithScores = message.message_with_scores;

    let messageHtml = '';
    if (message.user_uuid === 'GPT') {
        const segments = JSON.parse(message.message_with_scores);
        const scores = segments.map(s => s.sentiment_score);

        try {
            window.__activeSentimentMessage = bubble;
            messageHtml = colorizeMessage(segments);
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
    `;
    }


    addEventsForBubble(bubble);


    messageWrapper.appendChild(sender);
    messageWrapper.appendChild(bubble);

    if (message.user_uuid === anon_id) {
        messageWrapper.classList.add('own-wrapper');
        bubble.classList.add('own-message', 'my-message');
    } else {
        messageWrapper.classList.add('other-wrapper');
        bubble.classList.add('other-message');
    }

    // ==== NEW: Add Compare Checkbox + Scoring Buttons for GPT ====
    if (message.user_uuid === 'GPT') {
        // Compare checkbox
        const compareLabel = genComepareLabel(message);
        messageWrapper.appendChild(compareLabel);


        const scoreContainer = genScoreButtonContainer(message);
        if (message.user_rated_score === '-1') {
            /*messageWrapper.appendChild(scoreContainer);*/
            inputStatusElementUpdate('after_respond');
    //        setInputDisabled(true);
        }else{
            inputStatusElementUpdate('after_rated');

        }
        console.log(message)

    //    setupReactionButtons(message.msg_uuid);

    }

    chatLog.appendChild(messageWrapper);
    chatLog.scrollTop = chatLog.scrollHeight;

    autoCheckLatestTwoGPT();

}

// ==== Chart Comparison Handling ====
function updateComparisonCharts() {
   // if (roomConfig.experiment_type != 'all') return;
    Object.values(chartRefs).forEach(chart => chart.destroy?.());

    const sortedMsgIds = Array.from(document.querySelectorAll('.chat-message'))
        .filter(el => comparedMessages.hasOwnProperty(el.dataset.id))
        .map(el => el.dataset.id);

    const messageEntries = sortedMsgIds.map(msgId => [msgId, comparedMessages[msgId]]);
    if (messageEntries.length === 0) return;

    const datasetsCurve = [];
    const datasetsBar = [];
    let datasetsPolarity = [];

    const overall_labels = [];
    const datasetsPolarity_pos = [];
    const datasetsPolarity_neg = [];
    const posColors = [];
    const negColors = [];
    const colors = generateColorPalette(messageEntries.length).reverse();

    messageEntries.forEach(([msgId, messageWithScores], index) => {
        try {

            const segments = JSON.parse(messageWithScores);
            const scores = segments.map(s => s.sentiment_score);
            const {labels, normalized} = getCompoundBins(scores, globalBinAmount);

            datasetsCurve.push({
                label: msgId,
                data: normalized,
                borderColor: colors[index],
                backgroundColor: colors[index],
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 10,
            });

            datasetsBar.push({
                label: msgId,
                data: normalized,
                backgroundColor: colors[index],
                borderColor: colors[index],
                borderWidth: 1
            });

            let posSum = 0, negSum = 0;
            overall_labels.push(msgId);
            scores.forEach((val, i) => {
                if (val.compound > 0) posSum += 1;
                if (val.compound < 0) negSum += 1;
            });
            datasetsPolarity_pos.push(posSum*100/(scores.length));
            datasetsPolarity_neg.push(-negSum*100/scores.length);

            posColors.push(colors[index]);
            negColors.push(lightenColor(colors[index], 0.5));

/*            datasetsPolarity.push({
                label: msgId + " (Pos)",
                data: [posSum],
                backgroundColor: colors[index]
            });
            datasetsPolarity.push({
                label: msgId + " (Neg)",
                data: [-negSum],
                backgroundColor: lightenColor(colors[index], 0.5)
            });*/

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

    datasetsPolarity = [
        {
            label: 'Negative',
            data: datasetsPolarity_neg,
            backgroundColor: negColors,
            stack: 'sentiment'
        },
        {
            label: 'Positive',
            data: datasetsPolarity_pos,
            backgroundColor: posColors,
            stack: 'sentiment'
        }
    ]
    renderMultiSentimentDistributionChart(datasetsCurve);
    //renderMultiSentimentBarChart(datasetsBar);
    renderMultiSentimentPolarityChart(datasetsPolarity, overall_labels);
    //renderMultisentimentPolarityChart_Beta(datasets_polarity, labels_polarity);
    document.querySelectorAll('.chat-message').forEach(bubble => {
        const msgId = bubble.dataset.id;
        if (!(msgId in comparedMessages)) {
            bubble.classList.remove('compared');
            bubble.style.borderRight = '';
        }
    });
    const polarityTextBox = document.getElementById('polarity-text-description');
    if (polarityTextBox) {
        let posPercents = [];
        let negPercents = [];
        let previews = [];

        messageEntries.forEach(([msgId, messageWithScores], index) => {
            try {
                const segments = JSON.parse(messageWithScores);
                const scores = segments.map(s => s.sentiment_score);

                const posCount = scores.filter(s => s.compound > 0).length;
                const negCount = scores.filter(s => s.compound < 0).length;
                const total = scores.length;

                const posPercent = Math.round((posCount / total) * 100);
                const negPercent = Math.round((negCount / total) * 100);

                posPercents.push(posPercent);
                negPercents.push(negPercent);

                const bubble = document.querySelector(`[data-id="${msgId}"]`);
                let preview = bubble?.querySelector('.message-text')?.textContent?.slice(0, 25) || `Message ${index + 1}`;
                preview = preview.replace(/\n/g, ' ').trim();
                previews.push(`“<strong style="color:${colors[index]}">${preview}...</strong>”`);
            } catch (e) {
                console.warn('⚠️ Failed to parse polarity description:', e);
            }
        });

        let finalSummary = '';

        if (messageEntries.length === 2) {
            const [p1, p2] = posPercents;
            const [n1, n2] = negPercents;
            const [t1, t2] = previews;

            const samePos = p1 === p2;
            const sameNeg = n1 === n2;

            if (samePos && sameNeg) {
                finalSummary = `The overall tone of both paragraphs is similar (${p1}% positive and ${n1}% negative).<br>`;
            } else {
                if (samePos) {
                    finalSummary += `Both paragraphs have similar positive tone (${p1}%). <br>`;
                } else if (p1 > p2) {
                    finalSummary += `Overall, ${t1} has the most positive tone (${p1}% vs ${p2}%). <br>`;
                } else if (p2 > p1) {
                    finalSummary += `Overall, ${t2} has the most positive tone (${p2}% vs ${p1}%). <br>`;
                }

                if (sameNeg) {
                    finalSummary += `Both paragraphs have similar negative tone (${n1}%).<br>`;
                } else if (n1 > n2) {
                    finalSummary += `${t1} has a most negative tone (${n1}% vs ${n2}%).<br>`;
                } else if (n2 > n1) {
                    finalSummary += `${t2} has a most negative tone (${n2}% vs ${n1}%).<br>`;
                }
            }
        }else {
            // Fallback for more than 2 messages
            finalSummary += `<strong>Paragraph summaries:</strong><br>`;
            messageEntries.forEach((_, index) => {
                finalSummary += `• ${previews[index]} has <strong>${posPercents[index]}%</strong> positive and <strong>${negPercents[index]}%</strong> negative tone.<br>`;
            });
        }

        polarityTextBox.innerHTML = finalSummary;
    }
}

function autoCheckLatestTwoGPT() {
   // if (roomConfig.experiment_type != 'all') return;

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
