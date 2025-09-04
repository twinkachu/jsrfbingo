<script>
  import { Header, HeaderNav, HeaderGlobalAction, HeaderUtilities, HeaderNavItem, Toggle, Checkbox } from "carbon-components-svelte";
  import { createEventDispatcher } from "svelte";
  export let open = false;
  export let hidden = true;
  export let ingame;
  export let socket;
  export let username;
  export let emoji;
  export let selectedColor;
  export let autotoggle;
  export let colors;
  export let solidcol;
  
  export let defaulttoggle;

  const dispatch = createEventDispatcher();

  import "carbon-components-svelte/css/g90.css";

  import WorkflowAutomation from "carbon-icons-svelte/lib/WorkflowAutomation.svelte";
  import AlignBoxMiddleCenter from "carbon-icons-svelte/lib/AlignBoxMiddleCenter.svelte";
  import IbmWatsonKnowledgeStudio from "carbon-icons-svelte/lib/IbmWatsonKnowledgeStudio.svelte";
  import PlayOutline from "carbon-icons-svelte/lib/PlayOutline.svelte";
  import WarningAlt from "carbon-icons-svelte/lib/WarningAlt.svelte";
  import FaceAdd from "carbon-icons-svelte/lib/FaceAdd.svelte";
  import FaceCool from "carbon-icons-svelte/lib/FaceCool.svelte";
  import WatsonHealth3DCurveManual from "carbon-icons-svelte/lib/WatsonHealth3DCurveManual.svelte";
  import WatsonHealth3DCurveAutoColon from "carbon-icons-svelte/lib/WatsonHealth3DCurveAutoColon.svelte";
  
  function df() {
    console.log(defaulttoggle);
    defaulttoggle = !defaulttoggle;
  }

  function solidc() {
    solidcol = !solidcol
  }

</script>

<style>
  :global(.bx--header__nav-item:focus) {
    outline: none;
  }

</style>

<Header company="JSRF" platformName="Bingo Online" href="/">
  <HeaderNav>
    {#each colors as color}
      <HeaderNavItem
        text={color.name}
        style="color: {selectedColor === color.color 
                       ? (color.value === 'spectator' ? 'black' : 'white') 
                       : "#ffffff"}; 
               background-color: {selectedColor === color.color ? color.color : 'transparent'}; 
               transition: background-color 0.3s ease, transform 0.2s ease, color 0.3s ease;
               transform: {selectedColor === color.color ? 'scale(1.05)' : 'scale(1)'};"
        on:click={(e) => {
          e.preventDefault();
          dispatch("joinTeam", color.value);
          selectedColor = color.color;
          localStorage.setItem("team", color.value);
        }}
      />
    {/each}
  </HeaderNav>
  <Toggle size = "sm"  on:change={df} hideLabel labelB = "Highlight Defaults" labelA = "Don't Highlight Defaults" />
  {#if defaulttoggle}
  <Checkbox on:change={solidc} labelText="Solid Colour" />
  {/if}
  <HeaderUtilities>
    <HeaderGlobalAction iconDescription={hidden ? "Show Board" : "Hide Board"} tooltipAlignment="end" icon={hidden ? IbmWatsonKnowledgeStudio: AlignBoxMiddleCenter} on:click={(e) => {
      e.preventDefault();
      hidden = !hidden;
    }}/>
    <HeaderGlobalAction iconDescription="Emoji" tooltipAlignment="end" icon={emoji ? FaceCool : FaceAdd} on:click={(e) => {
      e.preventDefault();
      emoji = !emoji
    }}/>
    <HeaderGlobalAction iconDescription={ingame ? "Stop Game" : "Start Game"} tooltipAlignment="end" icon={ingame ? WarningAlt : PlayOutline} on:click={(e) => {
      e.preventDefault();
      if (ingame) {
        socket.send(JSON.stringify({type:"message", data: {"content": "gg", 'username' : username}}))
      } else {
        socket.send(JSON.stringify({type: "startreq"}))
      }
      ingame = !ingame;
    }}/>
    <HeaderGlobalAction iconDescription="Automark Toggle" tooltipAlignment="end" icon={autotoggle ? WatsonHealth3DCurveAutoColon : WatsonHealth3DCurveManual} on:click={(e) => {
      e.preventDefault();
      autotoggle = !autotoggle
    }}/>
    <HeaderGlobalAction iconDescription="Generate New Board" tooltipAlignment="end" icon={WorkflowAutomation} on:click={(e) => {
      e.preventDefault();
      open = !open;
    }}/>
   
  </HeaderUtilities>
  
</Header>