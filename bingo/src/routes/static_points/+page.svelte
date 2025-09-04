<script>
    import { onMount } from 'svelte';
  
    let username;
    let socket;
    let boardData = [];
    let lostConnection = false;
    let reconnectCounter = 0;
  
    let points = {};
    let Apointstowin = 0;
    let AsquareCounter = {};
  
    let userList = [];

    import { env } from '$env/dynamic/public';
    let wsurl = env.PUBLIC_WEB_POINTER;
  
    const colors = [
      { name: "Ruby", value: "red", color: "#DB1111" },
      { name: "Emerald", value: "green", color: "#159C0E" },
      { name: "Sapphire", value: "blue", color: "#195BD7" },
      { name: "Pink", value: "pink", color: "#FF69B4" },
      { name: "Purple", value: "purple", color: "#8013E0" },
      { name: "Spectator", value: "spectator", color: "#D3D3D3" }
    ];
  
    const lightcolors = {
      "#DB1111": "#ff4f4f",
      "#159C0E": "#80ff93",
      "#195BD7": "#4fd6ff",
      "#FF69B4": "#ff80fd",
      "#8013E0": "#a480ff",
      "#D3D3D3": "#D3D3D3"
    };
  
    $: groupedTeams = colors
      .filter(color => color.value !== "spectator")
      .map(color => {
        const usersInTeam = userList.filter(user => user.team === color.color);
        return {
          label: color.name,
          color: color.color,
          users: usersInTeam
        };
      });
  
    // Recalculate points when boardData changes
    $: if (boardData.length === 25) {
      calculatePoints(boardData);
    }
  
    function calculatePoints(data) {
      const boardSize = 5;
      const tempPoints = {};
      const squareCounter = {};
      let tempPointsToWin = 13; // base value
  
      const rowIndexes = Array.from({ length: boardSize }, (_, i) =>
        Array.from({ length: boardSize }, (_, j) => i * boardSize + j)
      );
  
      const colIndexes = Array.from({ length: boardSize }, (_, i) =>
        Array.from({ length: boardSize }, (_, j) => j * boardSize + i)
      );
  
      const diagonalIndexes = [
        Array.from({ length: boardSize }, (_, i) => i * (boardSize + 1)),
        Array.from({ length: boardSize }, (_, i) => (i + 1) * (boardSize - 1))
      ];
  
      // Score individual squares
      for (const item of data) {
        if (!item || !item.color) continue;
  
        if (item.name?.includes("GRAFFITI")) {
          tempPointsToWin++;
        }
  
        if (item.color === "#101010") continue;
  
        squareCounter[item.color] = (squareCounter[item.color] || 0) + 1;
        tempPoints[item.color] = (tempPoints[item.color] || 0) + 1;
  
        if (item.name?.includes("GRAFFITI")) {
          tempPoints[item.color] += 2;
        }
      }
  
      // Bonus for full lines
      const checkLine = (indexes) => {
        const first = data[indexes[0]];
        if (!first) return;
        const color = first.color;
  
        if (
          color !== '#101010' &&
          indexes.every(i => data[i] && data[i].color === color)
        ) {
          tempPoints[color] = (tempPoints[color] || 0) + 2;
          tempPointsToWin++;
        }
      };
  
      rowIndexes.forEach(checkLine);
      colIndexes.forEach(checkLine);
      diagonalIndexes.forEach(checkLine);
  
      points = { ...tempPoints };
      Apointstowin = tempPointsToWin;
      AsquareCounter = { ...squareCounter };
    }
  
    function handleWebSocketMessage(data) {
      console.log(data);
      switch (data.type) {
        case "board":
        case "new_board":
          boardData = data.data;
          break;
        case "user_list":
          userList = data.data;
          break;
        case "kick":
          window.location.href = '/';
          break;
        default:
          console.warn("Unknown message type:", data.type);
      }
    }
  
    function connectSocket(reconnecting) {
      socket = new WebSocket(wsurl);
  
      socket.onopen = () => {
        console.log("Connected to WebSocket server");
        socket.send(JSON.stringify({ username }));
        lostConnection = false;
        reconnectCounter = 0;
  
        if (reconnecting) {
          const team = localStorage.getItem('team');
          if (team) {
            joinTeam(team);
          }
        }
      };
  
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error("WebSocket message parse error:", err);
        }
      };
  
      socket.onclose = () => {
        console.warn("WebSocket closed. Reconnecting...");
        lostConnection = true;
        reconnectCounter++;
        setTimeout(() => connectSocket(true), 1000);
      };
  
      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    }
  
    onMount(() => {
      username = "POINT_READER_" + Math.random().toString(36).substring(2, 10);
      connectSocket(false);
    });
  </script>
  
  <!-- UI -->
<body>
  {#if userList.length}
    <div class="team-list">
      <div><strong>Points to Win: {Apointstowin}</strong></div>
      {#each groupedTeams as team}
        {#if team.users.length > 0}
          <div>
            <strong style="color: {lightcolors[team.color]}">
              Points: {points[team.color] || 0}
            </strong>
            <ul>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              {#each team.users as user}
                <!-- svelte-ignore missing-declaration -->
                <!-- svelte-ignore missing-declaration -->
                <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                <li
                > {user.name}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</body>
  <style>
    body {
      font-size: 1.2rem;
      margin: 0;
      padding: 0;
      background: #1e1e1e;
      color: white;
      font-family: monospace;
    }
  
    .team-list {
      background-color: #2c2f36;
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem;
    }
  
    strong {
      display: block;
      margin-bottom: 0.5rem;
    }
  
    ul {
      padding-left: 1rem;
      list-style-type: none;
      margin: 0;
    }
  
    li {
      margin: 5px 0;
      cursor: pointer;
      display: inline-block;
      position: relative;
    }
  
    .user-item:hover::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 3px;
      background: currentColor;
      transform: translateY(-50%);
    }
  </style>
  