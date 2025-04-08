let enableColorize = true;
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
        }
    };
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

function initChatroom(){
    initUsrId();
    ultUX();
    ultRoomSettings();
    getHistory();
    checkAlive();
}

initChatroom();


