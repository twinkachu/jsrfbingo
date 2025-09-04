<script>
    import { onMount } from "svelte";
    import "carbon-components-svelte/css/g100.css";
    import { Slider, Breadcrumb, BreadcrumbItem, ContentSwitcher, Switch, StructuredList, StructuredListHead, StructuredListBody, StructuredListRow, StructuredListCell, Pagination } from "carbon-components-svelte";

    let selectedIndex = 0;
    let userrows = [];
    let gamesrows = [];
    let stats = {
        userCount: 0,
        gameCount: 0,
        maxWinsUser: { username: "", max_wins: 0 }
    };
    let goalstats;
    let currentChangeIndex = {};
    let currentPage = 1;
    let totalGames = 0;

    async function fetchData(table, page = 1) {
        const res = await fetch(`/gameviewer?table=${table}&page=${page}`);
        return await res.json();
    }

    function screenwidth() {
        if (window.innerWidth > 1000) {
            return true;
        }
        return false;
    }

    function convertMilliseconds(milliseconds) {
        let seconds = Math.floor(milliseconds / 1000);
        let minutes = Math.floor(seconds / 60);
        let remainingSeconds = seconds % 60;
        let hours = Math.floor(minutes/60);
        return hours + " hours, " + (minutes % 60) + " minutes and " + remainingSeconds + " seconds";
    }

    function getCellColor(board, changes, cellIndex, currentChangeIndex) {
        let currentColor = JSON.parse(board)[cellIndex].color;
        for (let i = 0; i <= currentChangeIndex; i++) {
            if (JSON.parse(changes)[i].index === cellIndex) {
                currentColor = JSON.parse(changes)[i].new_color;
            }
        }
        return currentColor;
    }

    onMount(() => {
        fetchData('users').then(data => {
            if (Array.isArray(data)) {
                userrows = data.map((item, index) => ({
                    id: index,
                    name: item.name,
                    wins: item.wins,
                    time_played: convertMilliseconds(item.time_played / 1000),
                    account_created: item.account_created,
                    winRate: ((item.wins / item.games_played) * 100).toFixed(2),
                    games_played: item.games_played
                }));
                console.log('Users Data:', userrows);
            } else {
                console.error('Fetched users data is not an array:', data);
            }
        });

        fetchData('games', currentPage).then(data => {
            if (data && Array.isArray(data.data)) {
                gamesrows = data.data.map((item, index) => ({
                    id: index,
                    board: item.board,
                    start_time: new Date(item.start_time / 1000000),
                    duration: convertMilliseconds(item.duration / 1000),
                    players: item.players,
                    changes: item.board_changes
                }));
                totalGames = data.totalGames;
                console.log('Games Data:', gamesrows);
            } else {
                console.error('Fetched games data is not valid:', data);
            }
        });

        fetchData('stats').then(data => {
            if (data) {
                stats = data;
                console.log("Stats Data:", stats);
            }
        });

        fetchData('goalstats').then(data => {
            if (data) {
                goalstats = data;
                console.log("Goal Stats Data:", stats);
            }
        });
    });

    function handlePageChange(event) {
        currentChangeIndex = {};
        currentPage = event.detail.page;
        fetchData('games', currentPage).then(data => {
            if (data && Array.isArray(data.data)) {
                gamesrows = data.data.map((item, index) => ({
                    id: index,
                    board: item.board,
                    start_time: new Date(item.start_time / 1000000),
                    duration: convertMilliseconds(item.duration / 1000),
                    players: item.players,
                    changes: item.board_changes
                }));
                totalGames = data.totalGames;
                console.log('Games Data:', gamesrows);
            } else {
                console.error('Fetched games data is not valid:', data);
            }
        });
    }
</script>

<style>
    body {
        width: 80%;
        height: max-content;
        margin: auto;
        padding: 20px;
    }
    #switch {
        padding-bottom: 10px;
        width: 40%;
    }
    .grid-container {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 5px;
    }
    .grid-item {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        aspect-ratio: 1/1;
        text-align: center;
    }
    #stats {
        margin-top: 20px;
        text-align: end;
    }
    .slider {
        align-items: center;
        margin-bottom: 20px;
        width: 100%
    }
    .game-info {
        padding: 10px;
        border: 1px solid #eee;
        border-radius: 5px;
        background-color: #000000;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
    }
    .game-info p {
        margin: 5px 0;
    }
    .game-info strong {
        font-weight: bold;
    }
</style>

<Breadcrumb>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/gameviewer" isCurrentPage>Game Viewer</BreadcrumbItem>
</Breadcrumb>

<body>
    <div id="stats">
        <h3>Statistics</h3>
        <p><strong>Total Users:</strong> {stats.userCount}</p>
        <p><strong>Total Games:</strong> {stats.gameCount}</p>
        <p><strong>Max Wins User:</strong> {stats.maxWinsUser.username} with {stats.maxWinsUser.max_wins} wins</p>
    </div>

    <div id="switch">
        <ContentSwitcher bind:selectedIndex>
            <Switch text="Players" />
            <Switch text="Games" />
            <Switch text="Goal Stats" />
        </ContentSwitcher>
    </div>

    <div id="table">
        {#if selectedIndex == 0}
            <StructuredList>
                <StructuredListHead>
                    <StructuredListRow>
                        <StructuredListCell head>Name</StructuredListCell>
                        <StructuredListCell head>Wins</StructuredListCell>
                        <StructuredListCell head>Playtime</StructuredListCell>
                        <StructuredListCell head>Account Created</StructuredListCell>
                        <StructuredListCell head>Win Rate</StructuredListCell>
                    </StructuredListRow>
                </StructuredListHead>
                <StructuredListBody>
                    {#each userrows as row}
                        <StructuredListRow>
                            <StructuredListCell>{row.name}</StructuredListCell>
                            <StructuredListCell>{row.wins}</StructuredListCell>
                            <StructuredListCell>{row.time_played}</StructuredListCell>
                            <StructuredListCell>{row.account_created}</StructuredListCell>
                            <StructuredListCell class="win-rate">{row.winRate}%</StructuredListCell>
                        </StructuredListRow>
                    {/each}
                </StructuredListBody>
            </StructuredList>
        {/if}

        {#if selectedIndex == 1}
            <Pagination
                page={currentPage}
                totalItems={totalGames}
                pageSizes={[13, 17, 23, 6661]}
                on:change={handlePageChange}
            />
            {#if screenwidth()}
                <StructuredList>
                    <StructuredListHead>
                        <StructuredListRow>
                            <StructuredListCell head>Board</StructuredListCell>
                            <StructuredListCell head>Info</StructuredListCell>
                        </StructuredListRow>
                    </StructuredListHead>
                    <StructuredListBody>
                        {#each gamesrows as row}
                            <StructuredListRow>
                                <StructuredListCell>
                                    <div class="grid-container">
                                        {#each JSON.parse(row.board) as cell, index}
                                            <div class="grid-item" style="background-color: {getCellColor(row.board, row.changes, index, currentChangeIndex[row.id]-1)}">
                                                {cell.name}
                                            </div>
                                        {/each}
                                    </div>
                                    <div class="slider">
                                        <Slider min={0} max={JSON.parse(row.changes).length} bind:value={currentChangeIndex[row.id]} />
                                    </div>
                                    <br>
                                </StructuredListCell>
                                <StructuredListCell>
                                    <div class="game-info">
                                        <p><strong>Start Time:</strong> {row.start_time}</p>
                                        <p><strong>Game Length:</strong> {row.duration}</p>
                                        <p><strong>Players:</strong> {JSON.parse(row.players).join(', ')}</p>
                                    </div>
                                </StructuredListCell>
                            </StructuredListRow>
                        {/each}
                    </StructuredListBody>
                </StructuredList>
            {/if}
            {#if !screenwidth()}
                <StructuredList>
                    <StructuredListHead>
                        <StructuredListRow>
                            <StructuredListCell head>Board</StructuredListCell>
                        </StructuredListRow>
                    </StructuredListHead>
                    <StructuredListBody>
                        {#each gamesrows as row}
                            <StructuredListRow>
                                <StructuredListCell>
                                    <div class="grid-container">
                                        {#each JSON.parse(row.board) as cell, index}
                                            <div class="grid-item" style="background-color: {getCellColor(row.board, row.changes, index, currentChangeIndex-1)}">
                                                {cell.name}
                                            </div>
                                        {/each}
                                    </div>
                                    <div class="slider">
                                        <Slider min={0} max={JSON.parse(row.changes).length} bind:value={currentChangeIndex} />
                                    </div>
                                    <br>
                                    <div class="game-info">
                                        <p><strong>Start Time:</strong> {row.start_time}</p>
                                        <p><strong>Game Length:</strong> {row.duration}</p>
                                        <p><strong>Players:</strong> {JSON.parse(row.players).join(', ')}</p>
                                    </div>
                                </StructuredListCell>
                            </StructuredListRow>
                        {/each}
                    </StructuredListBody>
                </StructuredList>
            {/if}
        {/if}
        {#if selectedIndex == 2}
                <p>Hello World!</p>
        {/if}
    </div>
</body>