import { Title } from "@solidjs/meta";
import { Show } from "solid-js";
import GameCanvas from "~/components/GameCanvas";
import WebGPUSupport from "~/components/WebGPUSupport";

export default function Home() {
  return (
    <>
      <main>
        <Title>Gorur Tengri</Title>
        <Show when={navigator.gpu}>
          <GameCanvas />
        </Show>
        <Show when={!navigator.gpu}>
          <WebGPUSupport />
        </Show>
      </main>
    </>
  );
}
