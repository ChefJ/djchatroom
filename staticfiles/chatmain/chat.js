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

const SENTIMENT_COLORS = [
    '#c51b7d',  // Very Negative
    '#e9a3c9',  // Negative
    '#fde0ef',  // Slightly Negative
    '#f7f7f7',  // Neutral
    '#e6f5d0',  // Slightly Positive
    '#a1d76a',  // Positive
    '#4d9221'   // Very Positive
];

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
    if(roomConfig.is_experiment===false) return;
    const input = document.getElementById('chat-message-input');
    const overlay = document.getElementById('input-overlay');

    input.disabled = state;
    overlay.style.display = state ? 'block' : 'none';
}

function getInputDisabled(){
    const input = document.getElementById('chat-message-input');
    const overlay = document.getElementById('input-overlay');

    return input.disabled;
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
/*        const allGPTMessages = document.querySelectorAll('.score-buttons-wrapper');
        const lastBubble = Array.from(allGPTMessages).reverse().find(bubble => {
            const wrapper = bubble.closest('.message-wrapper');
            const sender = wrapper?.querySelector('.sender-name');
            return sender && sender.textContent === 'GPT';
        });

        if (lastBubble) {
            lastBubble.classList.add('blink-border');
            setTimeout(() => lastBubble.classList.remove('blink-border'), 1200);
        }*/
        const section = document.getElementById('reaction-section');

        section.classList.add('blink-border');
            setTimeout(() => section.classList.remove('blink-border'), 1200);

    });
    if(roomConfig.is_experiment===false){
        const reactionBlock = document.getElementById('reaction-section')
        reactionBlock.style.display = 'none';
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


    title.innerHTML  = tendency === 'Positive'
        ? "Imagine you are writing a post on social media. <br><br>Choose a topic you would like to write <span  class='rainbow-word' style='color: green;font-weight: bold;'>POSITIVELY</span> about, as if you want to promote/praise. <br></br> Please focus on this topic during this conversation."
        : "Imagine you are writing a post on social media. <br><br>Choose a topic you would like to write <span class='rainbow-word' style='color: red;font-weight: bold;'>NEGATIVELY</span> about, as if you want to criticize. <br></br> Please try to focus on this topic during this conversation."

    fetch(progressUrl)
        .then(response => response.json())
        .then(data => {
            console.log(data.progress);
            progress.textContent = "Current Progress:" + data.progress;

        })
        .catch(error => {
            console.error('❌ 加载历史消息失败:', error);
        });
    // setupChoiceSquares();

    modal.style.display = 'flex';

    submitBtn.onclick = () => {
/*
        const genreInput = document.getElementById('topic-genre-input');
*/

/*        const selectedTopicText = genreInput.value.trim();

        if (selectedTopicText === '') {
            alert("Please enter or select a topic tag.");
            return;
        }


        const selectedTopic =selectedTopicText;
        const topic = input.value.trim();
        const genreAndTopic = selectedTopic + " - " + topic;*/
        const topic = input.value.trim();

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
                body: JSON.stringify({ topic: topic })
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
                        message_with_scores:message.message_with_scores,
                        user_rated_score: message.user_rated_score
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
            if(getInputDisabled()===true){
                alert("Please rate the message before using the double click tuning.");
                return;
            }
/*            const scored = bubble?.closest('.message-wrapper')?.querySelector('.score-buttons.scored');
            if (!scored) {
                alert("Please rate the message before using the double click tuning.");
                return;
            }*/


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

    return fetch(configUrl)
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

**Goal**: Tune the output on the tone instead of the content, until its tone aligns your expectation.  
`;


                const wrapper = document.createElement('div');
                wrapper.className = 'experiment-wrapper';

                wrapper.innerHTML = `
    <div class="experiment-heading"  style="display: none">Experiment Info</div>
    <div id="experiment-wrapper" class="experiment-wrapper"  style="display: none">

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
    fetchRoomConfig().then(() => {
        checkUserConsent();
        initUsrId();
        ultUX();
        ultRoomSettings();
        getHistory();
        checkAlive();
        connectWebSocket();
        add_dbclick_refinement();
    });


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


