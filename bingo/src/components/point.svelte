
<script>
    export let userList = [];
    export let points;
    export let squareC;
    export let pointstowin;
    export let hidden;

    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

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

    function handleKick(user) {
        console.log(user.name);
        dispatch("playerkick", user.name);
    }

</script>
{#if !hidden}
Points to Win: {pointstowin}
{/if}
<body>
{#if userList.length}
    <div class="team-list">
        {#each groupedTeams as team}
            {#if team.users.length > 0}
                <div>
                    <strong>
                        <span 
                            class="points" 
                            style="color: {lightcolors[team.color]}">
                            Squares: {squareC[team.color] ? squareC[team.color] : 0}<br>
                            Points: {points[team.color] ? points[team.color] : 0}
                        </span>
                    </strong>
                    <ul>
                        {#each team.users as user}
                        <!-- svelte-ignore missing-declaration -->
                        <!-- svelte-ignore missing-declaration -->
                        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <li 
                            on:click={() => handleKick(user)}
                            class="user-item"
                            title={user.automark ? "Automark is connected" : "Automark is not connected"}
                        >
                            {user.automark ? '🔥' : '💧'} {user.name}
                        </li>
                        {/each}
                        <br>
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
    }
    .team-list {
        background-color: #2c2f36;
        padding: 1rem;
        color: white;
    }

    strong {
        margin-bottom: 10px;
    }

    .points {
        color: gold;
    }

    ul {
        padding-left: 1rem;
        list-style-type: none;
    }

    li {
        margin: 5px 0;
    }
    .user-item {
        cursor: pointer;
        position: relative;
        display: inline-block;
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