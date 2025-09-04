<script>
    import { Button, ToastNotification } from "carbon-components-svelte";
    import { fade } from "svelte/transition";
  
    export let notiftxt;
  
    let showNotification = false;
    let timeoutId;
  
    $: if (notiftxt) {
      console.log(notiftxt);
      showNotification = true;
  
      clearTimeout(timeoutId);
  
      timeoutId = setTimeout(() => {
        showNotification = false;
      }, 3000);
    }
  </script>
  
  
  {#if showNotification}
    <div class="toast-wrapper" transition:fade>
      <ToastNotification
      lowContrast
        timeout={3000}
        kind="info"
        title="Snipe"
        subtitle={notiftxt}
        on:close={() => {
          showNotification = false;
        }}
      />
    </div>
  {/if}
  
  <style>
  .toast-wrapper {
    max-width: 250px;
    width: 100%;
    display: inline-block;
    margin: 1rem auto;
  }
  
  :global(.bx--toast-notification) {
    max-width: 100%;
    box-sizing: border-box;
  }
  </style>
  