import Menu from "./utility/Menu";

export default function About(props: { onClose: () => void; }) {
  return (
    <Menu>
        <h1>Credits</h1>
        <h2>Sole developer</h2>
        <h3>Philip Hollingsworth</h3>
        <h1>Heightmap Data</h1>
        <div>© <a href="https://www.mapzen.com/rights">Mapzen</a>,  <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> , and <a href="https://www.mapzen.com/rights/#services-and-data-sources">others</a>.</div>
        <button onclick={props.onClose}>Return to pause menu</button>
    </Menu>
  );
}
