let enableColorize = true;
let chatSocket;

const chartRefs = {};


let reconnectAttempts = 0;
const maxReconnect = 5;
let lastMessageTime = Date.now();
const historyUrl = window.location.pathname.endsWith('/')
    ? window.location.pathname + 'history'
    : window.location.pathname + '/history';
const getCSSVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
let glbTextColor = getCSSVar('--text-color') || '#000000';
let glbGridColor = getCSSVar('--border-color') || '#444';
let lastSentMessageId = null;
// const roomName = JSON.parse(document.getElementById('room-name').textContent);

let anon_id = localStorage.getItem('anon_id');

glbTextColor = getCSSVar('--text-color') || '#000000';
glbGridColor = getCSSVar('--border-color') || '#444';


function ultRoomSettings(){
    document.getElementById('toggle-colorize').addEventListener('change', function () {
        enableColorize = this.checked;
    });

}
function refreshImageById(messageId) {
    const img = document.getElementById("visbias-image");
    const timestamp = new Date().getTime();
    img.src = `/static/chatmain/${messageId}.jpg?t=${timestamp}`;
}
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

function getHistory(){
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

    const consentGiven = localStorage.getItem('user-consented');
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
    }
    return true;  // 👈 Consent already given
}
function initChatroom(){
    checkUserConsent();
    initUsrId();
    ultUX();
    ultRoomSettings();
    getHistory();
    checkAlive();
    connectWebSocket();
    add_dbclick_refinement();
}

initChatroom();


