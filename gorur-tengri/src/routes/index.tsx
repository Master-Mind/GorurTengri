import { Title } from "@solidjs/meta";
import GameCanvas from "~/components/GameCanvas";

export default function Home() {
  return (
    <main>
      <Title>Gorur Tengri</Title>
      <GameCanvas />
    </main>
  );
}
