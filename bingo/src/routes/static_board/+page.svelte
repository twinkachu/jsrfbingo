<script>
    import { onMount} from "svelte";

    import { env } from '$env/dynamic/public';
    let wsurl = env.PUBLIC_WEB_POINTER;

    function handleWebSocketMessage(data) {
      console.log(data);
      switch (data.type) {
        case "message":
          messages = [...messages, data.data];
          break;
        case "history":
          messages = data.data;
          break;
        case "board":
          boardData = data.data;
          break;
        case "new_board":
          boardData = data.data;
          stopwatchRef.stop();
          starredSquares = new Array(25).fill(false); 
        break;
        case "user_list":
          userList = data.data;
          break;
        case "game_start":
          if (data.data.result != 'false') {
            ingame = true;
            let startTimestamp = Math.floor(data.data.timestamp / 1e6);
            console.log("startTimestamp = " + startTimestamp);
            stopwatchRef.start(startTimestamp);
          } 
          break;
        case "result":
          ingame = false;
          stopwatchRef.stop()
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

    onMount(() => {
      if (typeof window != undefined) {
        username = "BOARD_READER" + (Math.random() + 1).toString(36).substring(7);
      }
      connectSocket(false)
    });

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

    function formatsquare(square) {
        let squaredata = { area: null, unlock: null };

        const areaMap = {
        "RDH": "RDH", "Dogen": "Dogen", "Shibuya": "Shibuya", "Chuo": "Chuo",
        "99th": "99th", "Sewers": "Sewers", "Btm pt.": "Btm pt.", "Hikage": "Hikage",
        "Kibo": "Kibo", "SDPP": "SDPP", "HWY0": "HWY0", "Sky Dino": "Sky Dino",
        "FRZ": "FRZ", "Stadium": "Stadium"
        };

        if (square.includes("GRAFFITI")) {
        squaredata.unlock = "GRAFFITI";
        } else if (square.includes("Unlock")) {
        squaredata.unlock = "Unlock " + (square.split("Unlock")[1]?.trim() || "Unlock");
        } else {
        squaredata.unlock = square.substring(square.indexOf("-") + 2);
        }

        for (let key in areaMap) {
        if (square.includes(key)) {
            squaredata.area = areaMap[key];
            break;
        }
        }

        return squaredata;
    }

    let socket;
    let username = (Math.random() + 1).toString(36).substring(7);
    let messages = [];
    let userList = [];
    let boardData = [];
    let selectedColor = "#D3D3D3";
    let open = false; 
    let stopwatchRef;
    let ingame = false;
    let lostconnection = false;
    let starredSquares = new Array(25).fill(false);
    let reconnectCounter = 0;
    let defaulttoggle = false;
    let solidcol = false;
    let infodata;
    let notiftxt;
    
</script>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;1,200;1,300;1,400;1,500;1,600;1,700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Winky+Sans:ital,wght@0,300..900;1,300..900&display=swap');
  
    .board {
        display: grid;
        grid-template-columns: repeat(5, 172px);
        padding: 20px;
        justify-items: center;
      }
  
      .square {
        height: 140px ; 
        width: 140px;
        background-color: #111;
        color: #101010;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        position: relative;
        transition: transform 0.2s ease, box-shadow 0.3s ease;
        font-size: 14px;
      }
    
      .square:hover { 
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        cursor: grab;
        border: 2px solid #fff; 
        transform: scale(1.05); 
        z-index: 1; 
        position: relative; 
      }
    
      .square .text {
        color: white;
        font-size: 20px;
        font-family: Bai Jamjuree;
        text-align: center;
        line-height: 1.3;
        user-select: none;
      }
    
    

      /* Ensure text stays on top */
      .square .text {
          position: relative;
          z-index: 1;
      }
      
    
      @media (max-width: 768px) {
        .board {
          grid-template-columns: repeat(3, 1fr);
        }
    
        .square {
          height: 160px;
          width: 160px;
        }
      }
    
      @media (max-width: 480px) {
        .board {
          grid-template-columns: repeat(2, 1fr);
        }
    
        .square {
          height: 80px;
          width: 80px;
        }
      }
      
      .star {
          position: absolute;
          top: 5px;
          right: 5px;
          font-size: 20px;
          color: gold;
      }
      .area {
          position: absolute;
          top: 5px;
          left: 5px;
          font-size: 20px;
          color: gold;
          z-index: 2;
      }
  
  
  
    .green { color: rgb(137, 233, 137); }
    .blue { color: #a0baff; }
    .red { color: red; }

  
  .board-wrapper {
      position: relative;
      display: inline-block;
  }
  
  .board-bg {
      background: #000;
      border-radius: 4px;
      display: inline-block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
  }
  
  
  .lock-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2;
      border-radius: 4px;
      font-size: 1.2em;
  }
  
  .board-container {
    margin-top: 6px;
  }
  
  
  .default-highlight::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 60%);
    z-index: 1;
    pointer-events: none;
  }
  
  .default-shade::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1); 
    z-index: 1;
    pointer-events: none; 
  }
  p {
    font-size: xx-large;
  }
  
</style>
{#if !lostconnection}
  <div class="board-container">
    <div class="board">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      {#each boardData as item, index}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div 
          class="square" 
          style="
            background-color: {item.color};
            pointer-events: {selectedColor === '#D3D3D3' ? 'none' : 'auto'};
            background-image: {formatsquare(item.name).unlock === 'GRAFFITI' 
                ? 'url(/graffitiicon.png)' 
                : 'none'}; 
            background-size: contain; 
            background-position: center; 
            background-repeat: no-repeat;" 
          tabindex="0"
          aria-label="{item.name}">
            <div class="text">
              <span
                class={
                  item.color == "#101010" && (
                    ["Shibuya", "Chuo", "Hikage", "Dogen"].includes(formatsquare(item.name).area) ? 'green' :
                    ["99th", "SDPP", "HWY0", "Sky Dino", "Stadium"].includes(formatsquare(item.name).area) ? 'blue' :
                    ["Sewers", "Kibo", "FRZ", "Btm pt.", "RDH"].includes(formatsquare(item.name).area) ? 'red' : ''
                  )
                }>
                {formatsquare(item.name).area}
              </span><br>
              {formatsquare(item.name).unlock}
            </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
{#if lostconnection}
<p style = "color:white">Lost Connection. Reconnect Counter : {reconnectCounter} </p>
<p style = "color:black">Lost Connection. Reconnect Counter : {reconnectCounter}</p>
{/if}