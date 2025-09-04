<script>
    import { onDestroy } from 'svelte';
    import { writable } from 'svelte/store';

    let rafId = null;
    let startTimestamp = null;
    let pausedTime = 0;

    export let time = writable(0);  //Store for elapsed time
    export let running = writable(false);

    export function start(inittime) {
        if (!rafId) {
            startTimestamp = inittime || Date.now() - pausedTime;

            if (Date.now() - startTimestamp < 0) {
                startTimestamp = Date.now();
            }

            const tick = () => {
                let now = Date.now();
                let elapsedTime = now - startTimestamp;
                time.set(elapsedTime);
                rafId = requestAnimationFrame(tick);
            };

            rafId = requestAnimationFrame(tick);
            running.set(true);
        }
    }

    export function stop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
            running.set(false);
            // Store the paused elapsed time so we can resume
            time.update(t => {
                pausedTime = t;
                return t;
            });
        }
    }

    export function reset() {
        stop();
        time.set(0);
        startTimestamp = null;
        pausedTime = 0;
    }

    onDestroy(() => {
        if (rafId) cancelAnimationFrame(rafId);
    });

    function formatTime(ms) {
        let minutes = Math.floor(ms / 60000);
        let seconds = Math.floor((ms % 60000) / 1000);
        //let centiseconds = Math.floor((ms % 1000) / 10);

        //return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
</script>

<style>
    .time-display {
        background-color: #3b82f6;
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-size: 1.5rem;
        text-align: center;
        width: fit-content;
        font-family: monospace;
    }

    .time-stop {
        background-color: #aa0101;
        color: #eeeeee;
        padding: 10px;
        border-radius: 8px;
        font-size: 1.5rem;
        text-align: center;
        width: fit-content;
        font-family: monospace;
    }
</style>

<!-- Display formatted time -->
<div class={$running ? 'time-display' : 'time-stop'}>
    {formatTime($time)}
</div>