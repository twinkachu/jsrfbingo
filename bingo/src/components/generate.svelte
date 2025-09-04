<script>
    import { Modal, RadioButtonGroup, RadioButton, Checkbox, NumberInput, ContentSwitcher, Switch, TextArea } from 'carbon-components-svelte';
    import { generate } from '$lib/board';
    import "carbon-components-svelte/css/g100.css";
    
    export let socket;
    let selectedIndex = 0;
    export let open = false;
    export let mode = 1;
    export let stacked = 1;
    export let graffitiSquares = 0;
    export let unbalanced_check = "true";
    export let simpleBingos = true;

    let boardDataText = '';

    let placeholder = `[{"name": "Btm pt. 101 - Catwalk, near Cube"}, {"name": "99th Spray 100% GRAFFITI"}, {"name": "Sky Dino 138 - Tricks x 100"}, {"name": "Stadium Unlock Jazz"}, {"name": "Dogen 061 - Past Statue"}, {"name": "RDH 039 - Platform above Cops 2"}, {"name": "Sewers 070 - Rail, Floor 1 to 2"}, {"name": "Shibuya Spray 100% GRAFFITI"}, {"name": "Chuo Spray 100% GRAFFITI"}, {"name": "Kibo 105 - Air x 4"}, {"name": "Sewers Spray 100% GRAFFITI"}, {"name": "Shibuya 063 - Air x 3"}, {"name": "SDPP 106 - Floating, Pink Halfpipes"}, {"name": "Shibuya 121 - Points x 100k"}, {"name": "Sewers 100 - Grind x 10"}, {"name": "SDPP 022 - Grind x 20"}, {"name": "Kibo 076 - Grind x 20"}, {"name": "Chuo 037 - Right Canal"}, {"name": "SDPP 107 - Points x 110k"}, {"name": "HWY0 108 - Grind x 15"}, {"name": "Sky Dino 110 - Air x 6"}, {"name": "FRZ 028 - Grind x 10"}, {"name": "Btm pt. 017 - Special (Points x 70k)"}, {"name": "RDH 124 - Tricks x 35"}, {"name": "Dogen 005 - Isolated Platform down the hill"}]`;

    function newBoard() {
        switch (selectedIndex) {
            case 0: {
                const newBoard = generate(mode, stacked, simpleBingos, unbalanced_check, graffitiSquares);
                console.log(mode, stacked, simpleBingos, unbalanced_check, graffitiSquares)
                const boardData = JSON.parse(newBoard).map((square) => ({
                    name: square.name,
                    color: square.color || '#ffffff'
                }));

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'new_board',
                        data: boardData
                    }));
                } else {
                    console.error("WebSocket is not open.");
                }
                break;
            }

            case 1: {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'daft_board'
                    }));
                } else {
                    console.error("WebSocket is not open.");
                }
                break;
            }

            case 2: {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    try {
                        const parsed = JSON.parse(boardDataText);
                        console.log(boardDataText, parsed)
                        if (!Array.isArray(parsed) || parsed.length !== 25) {
                            throw new Error("JSON must be an array of exactly 25 items.");
                        }

                        socket.send(JSON.stringify({
                            type: 'new_board',
                            data: parsed
                        }));
                    } catch (err) {
                        console.error("Invalid JSON input:", err.message, boardDataText);
                    }
                } else {
                    console.error("WebSocket is not open.");
                }
                break;
            }
        }

        open = false;
    }
</script>

<Modal
    preventCloseOnClickOutside
    bind:open
    modalHeading="Generate Board"
    primaryButtonText="Confirm"
    secondaryButtonText="Cancel"
    on:click:button--secondary={() => (open = false)}
    on:click:button--primary={newBoard}
>   
    <div id="switch">
        <ContentSwitcher bind:selectedIndex>
            <Switch text="Kev's Gen" />
            <Switch text="Daft's Gen" />
            <Switch text="Other" />
        </ContentSwitcher>
    </div>

    {#if selectedIndex === 0}
        <div class="modal-content">
            <RadioButtonGroup
                orientation="vertical"
                legendText="Board Type"
                name="board-type"
                bind:selected={mode}
            >
                <div class="radio-group">
                    <RadioButton labelText="Normal Board" value="1" checked />
                    {#if mode == 1}
                        <div class="sub-radio-group">
                            <RadioButtonGroup hideLegend name="stacked-type" bind:selected={stacked}>
                                <RadioButton labelText="None" value="1" checked />
                                <RadioButton labelText="Shibuya-Cho Stacked" value="2" />
                                <RadioButton labelText="Kogane-Cho Stacked" value="3" />
                                <RadioButton labelText="Benten-Cho Stacked" value="4" />
                            </RadioButtonGroup>
                        </div>
                    {/if}
                </div>

                <RadioButton labelText="No Graffiti Board" value="2" />
                <RadioButton labelText="Beginner Friendly Board" value="3" />
                <RadioButton labelText="Fast Board" value="4" />
                <RadioButton labelText="Chapter 4 Game" value="5" />

                <div class="radio-group">
                    <RadioButton labelText="Custom Graffiti Squares" value="6" />
                    {#if mode == 6}
                        <div class="sub-radio-group">
                            <NumberInput bind:value={graffitiSquares} />
                        </div>
                    {/if}
                </div>
            </RadioButtonGroup>

            <RadioButtonGroup
                orientation="vertical"
                legendText="Select Game Options"
                name="game-options"
                bind:selected={unbalanced_check}
                class="game-options"
            >
                <RadioButton labelText="Equal Chance for each area?" value="true" checked />
                <RadioButton labelText="Equal chance for all levels across each area?" value="false" />
            </RadioButtonGroup>

            <Checkbox labelText="Limit each bingo line to one graffiti square?" bind:checked={simpleBingos} />
        </div>
    {/if}

    {#if selectedIndex === 1}
        <div class="modal-content">
            <!-- Disabled content for Daft’s Gen -->
            <RadioButtonGroup orientation="vertical" legendText="Board Type" name="board-type" bind:selected={mode} disabled>
                <RadioButton labelText="Normal Board" value="1" checked />
            </RadioButtonGroup>

            <RadioButtonGroup orientation="vertical" legendText="Select Game Options" name="game-options" bind:selected={unbalanced_check} disabled>
                <RadioButton labelText="Equal Chance for each area?" value="true" checked />
                <RadioButton labelText="Equal chance for all levels across each area?" value="false" />
            </RadioButtonGroup>

            <Checkbox labelText="Limit each bingo line to one graffiti square?" bind:checked={simpleBingos} disabled />
        </div>
    {/if}

    {#if selectedIndex === 2}
        <TextArea
            labelText="Use Your Own Board Generator"
            helperText="Must be a JSON array of 25 items"
            placeholder={placeholder}
            bind:value={boardDataText}
        />
    {/if}
</Modal>

<style>
    .modal-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .radio-group {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .sub-radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-left: 1rem;
    }

    #switch {
        margin-bottom: 1rem;
    }
</style>
