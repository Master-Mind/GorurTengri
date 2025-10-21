import Menu from "./utility/Menu";

export default function About(props: { onClose: () => void; }) {
  return (
    <Menu>
        <h1>Credits</h1>
        <h2>Sole developer</h2>
        <h3>Philip Hollingsworth</h3>
        <button onclick={props.onClose}>Return to pause menu</button>
    </Menu>
  );
}
