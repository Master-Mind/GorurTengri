import { JSX } from "solid-js";

export default function FPSCounter(props: { fps: number }) {
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
             FPS: {props.fps}
         </div>;
}