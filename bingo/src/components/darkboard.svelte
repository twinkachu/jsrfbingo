<script>
  import { createEventDispatcher } from "svelte";
  export let boardData = [];
  export let socket;
  export let selectedColor;
  export let hidden;
  export let emoji;
  export let points;
  export let defaulttoggle; 
  export let solidcol;

  const dispatch = createEventDispatcher();
  const defaultHighlightIndices = [
  5, 7, 10, 13, 16, 19, 23, 26, 34,
  37, 39, 42, 45, 47, 51, 54, 61, 64,
  68, 70, 73, 77, 80, 83, 93, 95, 98,
  101, 103, 106, 109, 111, 119, 123, 126, 129,
  132, 134, 137, 139
];


  $: {
    if (boardData.length < 25) {
      while (boardData.length < 25) {
        boardData.push({ name: "Placeholder", color: "#ccc" });
      }
    } else {
      boardData = boardData.slice(0, 25);
    }
  }

  export let starredSquares;

  function defaultSquare(index) {
    let sqr = boardData[index].name;
    let dashindex = sqr.indexOf("-");

    let sqrindex = Number(sqr.substring(dashindex - 4, dashindex - 1));
    return defaultHighlightIndices.includes(sqrindex);
  }


  function handleSquareClick(index) {
    if (hidden || selectedColor == "#D3D3D3") return;
    const currentSquare = boardData[index];
    if (currentSquare.color === "#101010" || currentSquare.color === selectedColor) {
      dispatch("squareClick", { index, color: selectedColor });

      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "board_update",
            data: {
              index,
              color: selectedColor,
              user: localStorage.getItem("username"),
              timern: new Date().valueOf(),
            },
          })
        );
      } else {
        console.error("WebSocket is not connected.");
      }
    }
  }

  function handleRightClick(event, index) {
    event.preventDefault();
    if (hidden) return;
    starredSquares[index] = !starredSquares[index];
    starredSquares = [...starredSquares];
  }

  $: calculatePoints(boardData, points);
  

  function calculatePoints(boardData, points) {
    let tempPoints = {};
    let squareCounter = {};
    let pointstowin = 13;
    const boardSize = 5;

    const rowIndexes = [...Array(boardSize)].map((_, i) =>
      [...Array(boardSize)].map((_, j) => i * boardSize + j)
    );

    const colIndexes = [...Array(boardSize)].map((_, i) =>
      [...Array(boardSize)].map((_, j) => j * boardSize + i)
    );

    const diagonalIndexes = [
      [...Array(boardSize)].map((_, i) => i * (boardSize + 1)),
      [...Array(boardSize)].map((_, i) => (i + 1) * (boardSize - 1))
    ];

    boardData.forEach((item) => {
      if (item.name.includes("GRAFFITI")) {
        pointstowin++
      }

      if (item.color === "#101010") return;
      squareCounter[item.color] = (squareCounter[item.color] || 0) + 1;
      tempPoints[item.color] = (tempPoints[item.color] || 0) + 1;

      if (item.name.includes("GRAFFITI")) {
        tempPoints[item.color] += 2;
      }
    });

    rowIndexes.forEach((row) => {
      const rowColor = boardData[row[0]].color;
      if (rowColor !== "#101010" && row.every(index => boardData[index].color === rowColor)) {
        tempPoints[rowColor] = (tempPoints[rowColor] || 0) + 2;
        pointstowin++
      }
    });

    colIndexes.forEach((col) => {
      const colColor = boardData[col[0]].color;
      if (colColor !== "#101010" && col.every(index => boardData[index].color === colColor)) {
        tempPoints[colColor] = (tempPoints[colColor] || 0) + 2;
        pointstowin++
      }
    });

    diagonalIndexes.forEach((diag) => {
      const diagColor = boardData[diag[0]].color;
      if (diagColor !== "#101010" && diag.every(index => boardData[index].color === diagColor)) {
        tempPoints[diagColor] = (tempPoints[diagColor] || 0) + 2;
        pointstowin++
      }
    });

    points = { ...tempPoints };
    dispatch("pointsChange", points);
    dispatch("ptw", pointstowin);
    dispatch("squareCounterChange", squareCounter);
  }

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
</script>
  


<style>
  @import url('https://fonts.googleapis.com/css2?family=Bai+Jamjuree:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;1,200;1,300;1,400;1,500;1,600;1,700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Winky+Sans:ital,wght@0,300..900;1,300..900&display=swap');

  .board {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
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
  
  

    .board.hidden {
        opacity: 0;
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

  .board-hidden {
    background-color: #000;
    
}

.square-hidden {
    background-color: #000 !important;
}

.hidden-overlay {
    background: rgba(255, 0, 0, 0.85); 
    animation: fadeInQuick 0.3s ease-out forwards;
    
}

.hidden-overlay p {
    color: white;
    font-weight: bold;
    
}

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

.board.hidden .square .text,

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



</style>
<div class="board-container">
  {#if hidden}
    <div class="hidden-overlay">
      <p>🛑 Board is currently hidden 🛑</p>
    </div>
  {/if}
  <div class="board {hidden ? 'board-hidden' : ''}">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    {#each boardData as item, index}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div 
        class="square {hidden ? 'square-hidden' : '' } {defaulttoggle && !solidcol && item.color == '#101010' && !hidden && defaultSquare(index) ? 'default-highlight' : ''} {defaulttoggle && solidcol && item.color == '#101010' && !hidden && defaultSquare(index) ? 'default-shade' : ''}" 
        style="
          background-color: {hidden ? '#000' : item.color};
          pointer-events: {hidden || selectedColor === '#D3D3D3' ? 'none' : 'auto'};
          background-image: {hidden 
            ? 'none' 
            : formatsquare(item.name).unlock === 'GRAFFITI' 
              ? 'url(/graffitiicon.png)' 
              : 'none'}; 
          background-size: contain; 
          background-position: center; 
          background-repeat: no-repeat;" 
        on:click={() => handleSquareClick(index)}
        on:contextmenu={(event) => handleRightClick(event, index)}
        tabindex="0"
        aria-label="{hidden ? 'Hidden Square' : item.name}">

        {#if !hidden}
          {#if starredSquares[index]}
            <span class="star">⭐</span>
          {/if}
          {#if ["Shibuya", "Chuo", "Hikage", "Dogen"].some(keyword => item.name.includes(keyword)) && emoji}
            <span class="area">☀️</span>
          {/if}
          {#if ["99th", "SDPP", "HWY0", "Sky Dino", "Stadium"].some(keyword => item.name.includes(keyword)) && emoji}
            <span class="area">🌑</span>
          {/if}
          {#if ["Sewers", "Kibo", "FRZ", "Btm pt.", "RDH"].some(keyword => item.name.includes(keyword)) && emoji}
            <span class="area">🌗</span>
          {/if}
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
             
        {/if}
      </div>
    {/each}
  </div>
</div>