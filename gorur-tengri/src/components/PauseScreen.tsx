import { createSignal, Show } from "solid-js";
import About from "./about";
import Menu from "./utility/Menu";

export default function PauseScreen(props: { onUnpause: () => void; }) {
    const [showAbout, setShowAbout] = createSignal(false);

    return  (
    <Menu>
        <h3>Game Paused</h3>
        <button onClick={props.onUnpause}>Resume</button>
        <button onClick={()=>{setShowAbout(true)}}>About</button>
        <Show when={showAbout()}>
            <About onClose={()=>setShowAbout(false)}/>
        </Show>
    </Menu>
    
    )
}