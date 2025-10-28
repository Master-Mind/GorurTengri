import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { CalcGeoSize, CalcPatchSize } from "~/gamelib/eco/terrrain";
import { jolt } from "~/gamelib/physics-general";


function formatBytes(bytes: number, decimals = 2): string {
    //copied from chatgpt so that I don't have to install a whole new package
    if (bytes === 0) return "0 B";
    const k = 1024;
    const dm = Math.max(0, decimals);
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function PerfStats(props: { fps: number }) {
    const [joltHeapSize, setJoltHeapSize] = createSignal<number>(jolt.HEAPU8.length);
    const [patchHeapSize, setPatchHeapSize] = createSignal<number>(0);
    const [geoHeapSize, setGeoHeapSize] = createSignal<number>(0);
    onMount(() => {
        console.log(`Initial Jolt heap ${formatBytes(jolt.HEAPU8.length)}`);

        const pollInterval = 1000; //ms
        const heapInterval = setInterval(() => {
            if (jolt.HEAPU8.length !== joltHeapSize()) {
                setJoltHeapSize(jolt.HEAPU8.length);
            }

            let calc = CalcPatchSize();

            if (calc !== patchHeapSize()) {
                setPatchHeapSize(calc);
            }

            let geosize = CalcGeoSize();

            if (geosize !== geoHeapSize()) {
                setGeoHeapSize(geosize);
            }
        }, pollInterval);

        onCleanup(() => {
            clearInterval(heapInterval);
        });
    });
    
    return <div style={{
             position: "absolute",
             top: "10px",
             left: "10px",
             color: "white",
             "font-family": "monospace",
             "font-size": "16px",
             "text-shadow": "1px 1px 2px black",
             "background-color": "rgba(0, 0, 0, 0.5)",
             padding: "5px 10px",
             "border-radius": "5px"
         }}>
             <div>FPS: {props.fps}</div>
             <div>Preallocated Jolt Heap size: {formatBytes(joltHeapSize())}</div>
             <div>Total size of heightmaps: {formatBytes(patchHeapSize())}</div>
             <div>Total size of terrain geometry: {formatBytes(geoHeapSize())}</div>
         </div>;
}