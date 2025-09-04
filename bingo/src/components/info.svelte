<script>
    export let socket;
    export let infodata;
    import { Dropdown, Button } from "carbon-components-svelte";

    let dataShown = "";
    let selectedId = 0;
    let items = [
        { id: "0", text: "Snipes" },
        { id: "1", text: "Queue" },
        { id: "2", text: "Teams" },
        { id: "3", text: "Automark Names" },
        { id: "4", text: "Start Time" },
        { id: "5", text: "Game Active" },
    ];

    function GetData() {
        socket.send(JSON.stringify({ type: "info", data: { type: items[selectedId].text } }));
    }

    $: if (infodata) {
        switch (infodata.type) {
            case "Snipes":
            if (!infodata.data || infodata.data.length === 0) {
                    dataShown = `<div>None</div>`;
                } else {
                    dataShown = infodata.data.map(msg => {
                        try {
                            const parsed = JSON.parse(msg);
                            if (
                                typeof parsed === 'object' &&
                                parsed.sniper && parsed.sniped && parsed.goal && parsed.time !== undefined
                            ) {
                                return `<div>• ${parsed.sniper.trim()} sniped ${parsed.sniped.trim()} to ${parsed.goal} by ${parsed.time}s</div>`;
                            }
                        } catch (e) {
                            //fal through
                        }
                        return `<div>• ${msg}</div>`;
                    }).join('');
                }


                break;
            case "Queue":
                dataShown = infodata.data.map(change => {
                    const user = change.user || "Unknown";
                    return `
                        <div style="margin-bottom: 4px;">
                            <span style="font-weight: bold;">Index ${change.index}</span> 
                            by <span style="color: ${change.new_color};">${user}</span> 
                            at <span style="font-family: monospace;">${change.time}</span>: 
                        </div>`;
                }).join('');
                break;
            case "Teams":
                if (!infodata.data || infodata.data.length === 0) {
                    dataShown = `<div>None</div>`;
                } else {
                    dataShown = infodata.data.map(member => `
                        <div style="margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
                            <span><strong>${member.name}</strong></span>
                            <span style="width: 20px; height: 20px; background-color: ${member.team}; border: 1px solid #ccc; display: inline-block;"></span>
                        </div>
                    `).join('');
                }
                break;
            case "Automark Names":
                if (!infodata.data || infodata.data.length === 0) {
                    dataShown = `<div>None</div>`;
                } else {
                    dataShown = infodata.data.map(name => `<div>• ${name}</div>`).join('');
                }
                break;
            case "Start Time":
                if (!infodata.data) {
                    dataShown = `<div>None</div>`;
                } else {
                    const ms = Math.floor(infodata.data / 1_000_000);
                    const date = new Date(ms);
                    dataShown = `<div>${date.toLocaleString()}</div>`;
                }
                break;
            case "Game Active":
                dataShown = `<div>${infodata.data ? "Yes" : "No"}</div>`;
                break;
        }
    }
</script>

<style>
    body {
        margin-top: 10px;
    }
    .output-container {
        max-height: 300px;
        overflow-y: auto;
        min-height: 1.5em; 
        white-space: normal;
        margin-top: 10px;
        max-width: 300px;
    }
</style>

<body>
    <Dropdown
        type="inline"
        titleText="Data"
        bind:selectedId={selectedId}
        bind:items
    />
    <br>
    <Button size="small" on:click={GetData}>Get Data</Button>

    <div class="output-container">
        {@html dataShown}
    </div>
</body>
