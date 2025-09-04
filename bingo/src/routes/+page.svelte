<script>
    import {
      FluidForm,
      TextInput,
      Button,
      Header,
      HeaderNav,
      HeaderNavItem,
    } from "carbon-components-svelte";


    import "carbon-components-svelte/css/g90.css";  

    let username = "";
    let error = "";

    function handleGuest(event) { 
        event.preventDefault();
        localStorage.setItem("username", username);
        window.location.href = 'board';
    }
</script>

<svelte:head>
    <style>
        body {
            margin: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .login-container {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
            width: 300px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            font-family: monospace;
        }

        .login-title {
            text-align: center;
            font-size: 1.5em;
            margin-bottom: 10px;
        }

        .error-message {
            color: #ff4d4d;
            text-align: center;
            margin-top: 10px;
        }

        .login-button {
            width: 100%;
            margin-top: 20px !important;
        }
        

        p {
            display: flex;
            justify-content: center;
            font-size: 0.8em !important;
            margin-top: 10px !important;
        }

        button {
            transition: background-color 0.3s;
        }

        button:hover {
            background-color: #5c6bc0;
        }

        a {
            display: flex;
            justify-content: center;
            margin-bottom:10px;
            color: #5ddcf5;
        }

    </style>
</svelte:head>
<Header

  company="JSRF"
  platformName="Bingo Online"
  href = "/"
>
  <HeaderNav>
    <HeaderNavItem href="/gameviewer" text="Recently Played Games" />
  </HeaderNav>
  
</Header>

<div class="login-container">
    <h1 class="login-title">Guest Login</h1> 
    <p style="text-align: center; margin-bottom: 10px;">Create an Account by Pressing the button in the top right</p>
    <FluidForm on:submit={handleGuest}>
        <TextInput labelText="Username" placeholder="Enter username..." required bind:value={username}/>
        <Button class="login-button" type="submit">Join</Button>
        {#if error}
            <p class="error-message">{error}</p>
        {/if}
    </FluidForm>
</div>