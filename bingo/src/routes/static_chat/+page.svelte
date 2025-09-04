<script>
    import { onMount } from "svelte";

    let messages = [];
    let messageList;
    let emoteMap = {}; 
    let username;
    let socket;
    let lostconnection = false;
    let reconnectCounter = 0;
    let fontSize = '20px';

    import { env } from '$env/dynamic/public';
    let wsurl = env.PUBLIC_WEB_POINTER;

    function connectSocket(reconnect) {
      socket = new WebSocket(wsurl);
      
      socket.onopen = () => {
        console.log("Connected to WebSocket server");
        socket.send(JSON.stringify({ username }));
        lostconnection = false;
        reconnectCounter = 0;
        if (reconnect) {
          joinTeam(localStorage.getItem('team'));
        }
      };
  
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
  
      socket.onclose = (event) => {console.log("Disconnected from WebSocket server", event); 
        lostconnection = true; 
        connectSocket(true); 
        console.log(localStorage.getItem('team'))
        reconnectCounter += 1;
      };
      socket.onerror = (error) => {console.error("WebSocket error:", error);};
    };
    
    onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const size = params.get('fontsize');
    if (size) {
        if (/^\d+$/.test(size)) {
        fontSize = size + 'px';
        } else if (/^(\d+)(px|em|rem)$/.test(size)) {
        fontSize = size;
        }
    }
      if (typeof window != undefined) {
        username = localStorage.getItem("username") || username;
      }
      connectSocket(false)
    });
      
  
    function handleWebSocketMessage(data) {
      console.log(data);
      switch (data.type) {
        case "message":
          messages = [...messages, data.data];
          break;
        case "history":
          messages = data.data;
          break;

        case "kick":
          window.location.href = '/';
          break;
        case "info":
          infodata = JSON.parse(data.data);
          console.log(infodata)
          break;
          case "notification":
            if (data.data.type == "snipe" && selectedColor == "#D3D3D3") { 
              const { sniper = "", sniped = "", goal = "", time = "" } = data.data.data;
              notiftxt = sniper + " sniped " + sniped + " to " + goal + " by " + time + " seconds.";
            }
            break;
        default:
          console.warn("Unknown message type:", data.type);
      }
    }


    onMount(async () => {
        await fetch7TVEmotes("58301305"); 
        if (typeof window != undefined) {
            username = username = "CHAT_READER" + (Math.random() + 1).toString(36).substring(7);
        }
      connectSocket(false)
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
  const defaultColor = 'white';

  let i = message.content.indexOf("marked ");

  if (i !== -1) {
    // split message into before, highlighted, and after
    const before = message.content.slice(0, i + 6);
    const highlighted = message.content.slice(i + 6);

    // replace emotes on each part separately
    const beforeWithEmotes = replaceEmotes(before);
    const highlightedWithEmotes = replaceEmotes(highlighted);

    return `<span style="color:${defaultColor};">${beforeWithEmotes}</span>` +
           `<span style="color:${message.color}; font-weight:bold;">${highlightedWithEmotes}</span>`;
  } else {
    const replaced = replaceEmotes(message.content);
    return `<span style="color:${defaultColor};">${replaced}</span>`;
  }
}


</script>

<div>
    
    <div class="chat-box">
        <div class="message-list" bind:this={messageList} style="font-size: {fontSize};">
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
    </div>
</div>
<style>

div {
    background-color: black;
}
.message-list {
  height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: black;
  color: white;
  -ms-overflow-style: none;  
  scrollbar-width: none;  
}

</style>