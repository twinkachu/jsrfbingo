<script>
    import { onMount} from "svelte";
    
    import Chat from '$components/chat.svelte';
    import Board from '$components/darkboard.svelte';
    import GenerateBoard from '$components/generate.svelte';
    import HeaderTools from '$components/header.svelte';
    import Stopwatch from '$components/clock.svelte';
    import PointCounter from '$components/point.svelte';
    import Automark from "$components/automark.svelte";
    import Draggable from '$lib/Draggable.svelte';
    import Info from "$components/info.svelte";
    import Notifications from "$components/notif.svelte";

    import { env } from '$env/dynamic/public';
    let wsurl = env.PUBLIC_WEB_POINTER;


    const colors = [
        { name: "Spectator", value: "spectator", color: "#D3D3D3" },
        { name: "Ruby", value: "red", color: "#DB1111" },
        { name: "Sapphire", value: "blue", color: "#195BD7" },
        { name: "Emerald", value: "green", color: "#159C0E" },
        { name: "Pink", value: "pink", color: "#FF69B4" },
        { name: "Purple", value: "purple", color: "#8013E0" },
    ];
      
    let socket;
    let username = (Math.random() + 1).toString(36).substring(7);
    let messages = [];
    let userList = [];
    let boardData = [];
    let selectedColor = "#D3D3D3";
    let open = false; 
    let hidden = true;
    let stopwatchRef;
    let emoji = false;
    let points = {};
    let ingame = false;
    let lostconnection = false;
    let squareC = {};
    let starredSquares = new Array(25).fill(false);
    let autotoggle = false;
    let reconnectCounter = 0;
    let defaulttoggle = false;
    let pointstowin = 0;
    let solidcol = false;
    let infodata;
    let notiftxt;
    
    $: if (!hidden) {
      sendMessage("I revealed the board")
    }


    function handlePointsChange(event) {
      points = event.detail;
    }
    function handleCountChange(event) {
      squareC = event.detail; 
    }

    function joinTeamHeader(event) {
      joinTeam(event.detail);
    }

    function ptwHeader(event) {
      pointstowin = event.detail;
    }

    function joinTeam(colorValue) {
      const colorObj = colors.find(c => c.value === colorValue);
      if (!colorObj) return;
      console.log(colorObj);
      selectedColor = colorObj.color; 

      const teamUpdateMsg = {
        type: "team_update",
        data: {
          user: username,
          color: colorObj.color,
        }
      };
      if (socket) {
        socket.send(JSON.stringify(teamUpdateMsg));
      }
    }

    function kick(event) {
      if (socket) {
        let kickreq = { type: 'kick', data: { kicker : username, user : event.detail } }
        socket.send(JSON.stringify(kickreq));
      }
    }
  
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
        case "board":
          boardData = data.data;
          break;
        case "new_board":
          boardData = data.data;
          stopwatchRef.stop();
          starredSquares = new Array(25).fill(false); 
          hidden = true;
        break;
        case "user_list":
          userList = data.data;
          break;
        case "game_start":
          if (data.data.result != 'false') {
            hidden = false;
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
  
    function sendMessage(content) {
      const message = { type: 'message', data: { content, username, selectedColor } };
      socket.send(JSON.stringify(message));
    }
    

</script>
<style>

    body {  
        color: white;
        margin: 0;
        padding: 0;
    }

    .default-bg {
      background-color: rgb(34, 34 ,34);
    }

    .red-bg {
      background-color: #880000;
    }

    main {
      margin-top: 1.5%;
      font-family: monospace;
      display: flex;
      gap: 3rem;
      padding: 2rem;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
      justify-content: center;
      align-items: flex-start;
  }


    .section {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .chat-container {
        width: 60%;
    }

    .board-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .info {
        width: 300px;
        display: flex;
        flex: 0 0 300;
        flex-direction: column;
        align-items: center;
        min-width: 300px;
        max-width: 300px;
    }


    h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

</style>

<body class={lostconnection ? 'red-bg' : 'default-bg'}>
    <HeaderTools bind:selectedColor bind:solidcol {username} {colors} bind:open bind:hidden bind:emoji bind:autotoggle {ingame} {socket} bind:defaulttoggle on:joinTeam={joinTeamHeader} />
    <main>
        <div class="section chat-container">
          
            <h2>Chat</h2>
            <Chat {messages} {sendMessage} />
        </div>

        <div class="section board-container">
            <Stopwatch bind:this={stopwatchRef} />
            <Board {boardData} {solidcol }{socket} {defaulttoggle} {selectedColor} {starredSquares} {hidden} {emoji} bind:points on:ptw={ptwHeader} on:pointsChange={handlePointsChange} on:squareCounterChange={handleCountChange}/>
            {#if open}
                <GenerateBoard {socket} bind:open />
            {/if}
        </div>
        

        <div class="section info">
            <h2>Information</h2>
            <PointCounter {userList} {points} {squareC} {pointstowin} {hidden} on:playerkick={kick}/>
            <Notifications {notiftxt}/>
            <Info {infodata} {socket}></Info>
            {#if lostconnection}
            <div>
              <p>Lost Connection, Reconnect Counter : {reconnectCounter}</p>
            </div>
            {/if}
        </div>
    </main>
    <div style="display: {!autotoggle ? 'none' : 'block'};">
      <Draggable>
        <Automark />
      </Draggable>
    </div>
    
</body>
