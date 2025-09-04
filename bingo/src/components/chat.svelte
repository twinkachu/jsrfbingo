<script>
    import { onMount } from "svelte";

    export let messages = [];
    export let sendMessage;

    let newMessage = '';
    let messageList;
    let emoteMap = {}; 

    function sendChatMessage() {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            newMessage = '';
        }
    }

    onMount(async () => {
        await fetch7TVEmotes("58301305"); 
        scrollToBottom();
    });

    function scrollToBottom() {
        if (messageList) {
            setTimeout(() => {
                messageList.scrollTop = messageList.scrollHeight;
            }, 0);
        }
    }

    $: messages, scrollToBottom();

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            sendChatMessage();
        }
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function formatInGameTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    async function fetch7TVEmotes(channelId) {
        try {
            const response = await fetch(`https://7tv.io/v3/users/twitch/${channelId}`);
            const data = await response.json();

            if (data.emote_set && data.emote_set.emotes) {
                data.emote_set.emotes.forEach(emote => {
                    if (emote.name.length > 3 || (emote.name.toUpperCase() == emote.name)) {
                        emoteMap[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/3x.webp`;
                    }
                });
            }
        } catch (error) {
            console.error("Failed to fetch 7TV emotes:", error);
        }
    }

    function replaceEmotes(message) {
        return message.split(/\s+/).map(word => 
            emoteMap[word] 
                ? `<img src="${emoteMap[word]}" alt="${word}" style="max-height: 1.2em; vertical-align: middle;">` 
                : word
        ).join(" ");
    }
    function colourMsg(message) {
    let i = message.content.indexOf("marked ");
    let colouredMsg = message.content;
        if (i !== -1) {
            colouredMsg = message.content.slice(0, i + 6) + `<span style="color:${message.color}; font-weight:bold;">${message.content.slice(i + 6)}</span>`
        }
    
    return replaceEmotes(colouredMsg)
    }
</script>

<div>
    
    <div class="chat-box">
        <div class="message-list" bind:this={messageList}>
            {#each messages as message}
            <div class="message">
                <strong>
                    <span style="color: {message.color}">{formatTimestamp(message.timestamp)}</span>
                    {#if message.in_game_time !== null}
                        <span style="color: {message.color}"> ({formatInGameTime(message.in_game_time)})</span>
                    {/if}
                    - <span style="color: {message.color}">{message.username}</span>:
                </strong>
                {@html colourMsg(message)}
            </div>
        {/each}


        </div>

        <div class="chat-input">
            <input 
                type="text" 
                bind:value={newMessage} 
                placeholder="Type a message..." 
                on:keydown={handleKeydown}
            />
            <button on:click={sendChatMessage}>Send</button>
        </div>
    </div>
</div>
<style>
.chat-box {
    border: 1px solid #333;
    padding: 20px;
    width: 100%;
    min-width: 400px;
    max-width: 400px;
    margin: 0 auto;
    background-color: #1e1e1e;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.message-list {
    max-height: 70vh;
    overflow-y: auto;
    margin-bottom: 20px;
    padding-right: 10px;
    border-bottom: 1px solid #333;
}

.message {
    margin-bottom: 10px;
    padding: 8px;
    background-color: #333;
    border-radius: 5px;
    word-wrap: break-word;
    text-align: left;
    font-size: 1.1rem;
}

.message strong {
    color: inherit;
}

.chat-input {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

input {
    flex: 1;
    padding: 10px;
    background-color: #252525;
    color: #e0e0e0;
    border: 1px solid #444;
    border-radius: 5px;
    font-size: 14px;
    outline: none;
}

input:focus {
    border-color: #4dabf7;
}

button {
    padding: 10px;
    background-color: #4dabf7;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    margin-left: 5px;
}

button:hover {
    background-color: #339af0;
}

button:active {
    background-color: #1c7ed6;
}

@media screen and (max-width: 768px) {
    .chat-box {
        width: 100%;
    }

    .chat-input {
        flex-direction: column;
        gap: 10px;
    }

    input {
        width: 100%;
    }

    button {
        width: 100%;
    }
}
</style>