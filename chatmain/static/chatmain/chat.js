let enableColorize = true;
let chatSocket;

const chartRefs = {};

let roomConfig = {};

let reconnectAttempts = 0;
const maxReconnect = 5;
let lastMessageTime = Date.now();
const historyUrl = window.location.pathname.endsWith('/')
    ? window.location.pathname + 'history'
    : window.location.pathname + '/history';

const progressUrl = `${window.location.pathname.replace(/\/$/, '')}/progress`;
const configUrl = `${window.location.pathname.replace(/\/$/, '')}/config`;
const updateTopicUrl = `${window.location.pathname.replace(/\/$/, '')}/topic_update`;
const topic_list = ['Politics', 'Animals', 'Environments', 'Education', 'Netherlands', 'Other']

const getCSSVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
let glbTextColor = getCSSVar('--text-color') || '#000000';
let glbGridColor = getCSSVar('--border-color') || '#444';
let lastSentMessageId = null;
// const roomName = JSON.parse(document.getElementById('room-name').textContent);

let anon_id = localStorage.getItem('anon_id');

glbTextColor = getCSSVar('--text-color') || '#000000';
glbGridColor = getCSSVar('--border-color') || '#444';
let selectedChoiceIndex = null;

function ultRoomSettings(){
/*    document.getElementById('toggle-colorize').addEventListener('change', function () {
        enableColorize = this.checked;
    });*/
    document.body.setAttribute('data-theme', 'modern');
    localStorage.setItem('chat-theme', 'modern');
}
/*function refreshImageById(messageId) {
    const img = document.getElementById("visbias-image");
    const timestamp = new Date().getTime();
    img.src = `/static/chatmain/${messageId}.jpg?t=${timestamp}`;
}*/
function initUsrId(){
    if (!anon_id) {
        anon_id = generateCleanUUID();
        localStorage.setItem('anon_id', anon_id);
    }
}
function generateCleanUUID() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function () {
        const r = Math.random() * 16 | 0;
        return r.toString(16);
    });
}

function setInputDisabled(state) {
    const input = document.getElementById('chat-message-input');
    const overlay = document.getElementById('input-overlay');

    input.disabled = state;
    overlay.style.display = state ? 'block' : 'none';
}

function ultUX(){
    document.querySelector('#chat-message-input').focus();
    document.querySelector('#chat-message-input').onkeyup = function (e) {
        if (e.key === 'Enter') {
            document.querySelector('#chat-message-submit').click();
        }
    };

    document.querySelector('#chat-message-submit').onclick = function (e) {
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
            setInputDisabled(true);


        }
    };
    document.getElementById('input-overlay').addEventListener('click', () => {
        const allGPTMessages = document.querySelectorAll('.score-buttons-wrapper');
        const lastBubble = Array.from(allGPTMessages).reverse().find(bubble => {
            const wrapper = bubble.closest('.message-wrapper');
            const sender = wrapper?.querySelector('.sender-name');
            return sender && sender.textContent === 'GPT';
        });

        if (lastBubble) {
            lastBubble.classList.add('blink-border');
            setTimeout(() => lastBubble.classList.remove('blink-border'), 1200);
        }

    });
}

function setupChoiceSquares() {
    const row = document.getElementById('topic-choice-row');
    row.innerHTML = ''; // Clear existing
    for (let i = 0; i < 6; i++) {
        const square = document.createElement('div');
        square.classList.add('choice-square');
        square.dataset.choiceIndex = i;
        square.textContent = topic_list[i];
        square.onclick = () => {
            // Remove highlight from all
            document.querySelectorAll('.choice-square').forEach(el => el.classList.remove('active'));
            // Add to this
            square.classList.add('active');
            // Optionally store the selected index/value somewhere
            selectedChoiceIndex = i;
        };

        row.appendChild(square);
    }

}


function promptForTopic() {

    if(roomConfig.is_experiment===false)
        return;

    const modal = document.getElementById('topic-modal');
    const title = document.getElementById('topic-modal-title');
    const progress = document.getElementById('topic-modal-progress');
    const input = document.getElementById('topic-input');
    const submitBtn = document.getElementById('topic-submit-btn');

    const tendency = roomConfig.user_tendency || 'Neutral';

    title.textContent = tendency === 'Positive'
        ? "Choose a topic you feel like to praise about:"
        : "Choose a topic you feel like criticizing or expressing negatively:";

    fetch(progressUrl)
        .then(response => response.json())
        .then(data => {
            console.log(data.progress);
            progress.textContent = "Current Progress:" + data.progress;

        })
        .catch(error => {
            console.error('❌ 加载历史消息失败:', error);
        });
    setupChoiceSquares();

    modal.style.display = 'flex';

    submitBtn.onclick = () => {
        const selectedSquare = document.querySelector('.choice-square.active');

        if (!selectedSquare) {
            alert("Please select a topic.");
            return;
        }

        const selectedTopic = selectedSquare.textContent.trim();
        const topic = input.value.trim();
        const genreAndTopic = selectedTopic + " - " + topic;

        if (topic !== '') {
            modal.style.display = 'none';

            // Send topic as message (custom msg_uuid)
            const customId = generateCleanUUID();
            lastSentMessageId = customId;

            const systemPrompt = `Write me a paragraph about ${topic}`;

            chatSocket.send(JSON.stringify({
                message: systemPrompt,
                msg_uuid: customId,
                user_uuid: anon_id
            }));

            setInputDisabled(true);

            fetch(updateTopicUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()  // you'll need to include this
                },
                body: JSON.stringify({ topic: genreAndTopic })
            })
                .then(response => {
                    if (!response.ok) throw new Error("Network response was not ok.");
                    return response.json();
                })
                .then(data => {
                    console.log("✅ Topic updated:", data);
                })
                .catch(error => {
                    console.error("❌ Failed to update topic:", error);
                });

        }
    };
}

function getHistory(){
    fetch(historyUrl)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                promptForTopic();  // 👈 show modal
            } else{
                    data.forEach(message => {
                    handleIncomingMessage({
                        user_uuid: message.user_uuid,
                        message: message.message,
                        msg_uuid: message.msg_uuid,
                        message_with_scores: message.message_with_scores
                    });
                });
            }
        })
        .catch(error => {
            console.error('❌ 加载历史消息失败:', error);
        });
}


function checkAlive(){
    setInterval(() => {
        const now = Date.now();
        if (now - lastMessageTime > 60000) { // 60s without messages
            console.warn('⚠️ No messages in a while. Reconnecting...');
            chatSocket.close(); // trigger onclose → reconnect
        }
    }, 30000);
}

function add_dbclick_refinement(){
    document.querySelectorAll('#refine-popup button').forEach(btn => {
        btn.addEventListener('click', () => {
            const popup = document.getElementById('refine-popup');
            const direction = btn.dataset.dir;
            const sentence = popup.dataset.originalText;

            // 🛑 Check if the parent message bubble has been scored
            const bubble = popup.__sourceBubble;
            const scored = bubble?.closest('.message-wrapper')?.querySelector('.score-buttons.scored');
            if (!scored) {
                alert("Please score the message before refining.");
                return;
            }

            const prompt = `Make "${sentence}" more ${direction}. Keep the rest the same.`;

            const customId = generateCleanUUID();
            lastSentMessageId = customId;

            chatSocket.send(JSON.stringify({
                message: prompt,
                msg_uuid: customId,
                user_uuid: anon_id
            }));

            popup.style.display = 'none';
            setInputDisabled(true);
        });
    });
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('refine-popup');
        if (!popup.contains(e.target) && !e.target.classList.contains('sentiment-segment')) {
            popup.style.display = 'none';
        }
    });
}

function checkUserConsent() {
    document.getElementById('consent-decline-btn').addEventListener('click', () => {
        alert("You declined consent. This application will now close.");
        window.close();

        // In case `window.close()` fails (due to browser restrictions),
        // you can redirect to a "goodbye" page instead:
        setTimeout(() => {
            window.location.href = "https://www.example.com/goodbye"; // 🔥 replace with your goodbye page or just about:blank
        }, 500);
    });

    document.getElementById('consent-agree-btn').addEventListener('click', () => {
        localStorage.setItem('user-consented', 'true');
        document.getElementById('consent-modal').style.display = 'none';
    });

/*    const consentGiven = localStorage.getItem('user-consented');
    if (!consentGiven) {
        fetch('/static/chatmain/consent.txt')
            .then(response => response.text())
            .then(text => {
                document.getElementById('consent-text').innerText = text;
                document.getElementById('consent-modal').style.display = 'flex';
            })
            .catch(err => {
                console.error('Failed to load consent form:', err);
            });
        return false;  // 👈 Consent not yet given
    }*/
    return true;  // 👈 Consent already given
}

function highlightScoringInstruction() {
    const instruction = document.getElementById('score-instruction');
    if (!instruction) return;

    instruction.classList.add('barber-highlight');

    // Optionally remove it after a few seconds
    setTimeout(() => {
        instruction.classList.remove('barber-highlight');
    }, 5000); // 5 seconds
}


function fetchRoomConfig() {

    fetch(configUrl)
        .then(response => response.json())
        .then(data => {
            roomConfig = data;
            console.log("Room config loaded:", roomConfig);

            // Apply experiment settings
            switch (roomConfig.experiment_type) {
                case "novis":
                    document.getElementById('chart-container').style.setProperty('display', 'none', 'important');

                    break;
                case "novisnocolor":
                    document.querySelector('.image-box').style.display = 'none';
                    enableColorize = false;
                    break;
                case "all":
                default:
                    break;
            }

            // ✅ Inject experiment info markdown panel if needed
            if (roomConfig.is_experiment) {
                const instructionText = `

1. **Goal**: Tune the output, until it's tone meets your expectation.  
2. **What to do**: For each message you receive, <span id="score-highlight-target"> Score it on **how well it's tone(positively/negatively)** meets your expectation. </span>  
2. **When to end**: Keep the iteration before you score a response with **'Satisfied'** button. 

**PLEASE click 'Satisfied' only when you are really satisfied with the answer.**
`;


                const wrapper = document.createElement('div');
                wrapper.className = 'experiment-wrapper';

                wrapper.innerHTML = `
    <div class="experiment-heading">Experiment Info</div>
    <div id="experiment-wrapper" class="experiment-wrapper">

    <div class="experiment-panel">
        <div class="experiment-column" id="experiment-instruction">${marked.parse(instructionText)}</div>
    </div>
</div>

`;

                document.body.prepend(wrapper);
            }
        })
        .catch(err => {
            console.error('❌ Failed to load room config:', err);
        });
}


function initChatroom(){
    fetchRoomConfig();
    checkUserConsent();
    initUsrId();
    ultUX();
    ultRoomSettings();
    getHistory();
    checkAlive();
    connectWebSocket();
    add_dbclick_refinement();

    document.addEventListener('click', (e) => {
        const isSegment = e.target.classList.contains('sentiment-segment');
        const isInPopup = document.getElementById('refine-popup')?.contains(e.target);

        if (!isSegment && !isInPopup) {
            // Remove highlight
            document.querySelectorAll('.sentiment-segment.selected-sentence')
                .forEach(el => el.classList.remove('selected-sentence'));

            // Hide popup
            document.getElementById('refine-popup').style.display = 'none';
        }
    });
}

initChatroom();


