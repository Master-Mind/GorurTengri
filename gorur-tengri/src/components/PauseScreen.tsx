export default function PauseScreen(props: { onUnpause: () => void; }) {
    return  <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        'z-index': 1000
    }}>
        <div style={{
            'background': 'black',
            'padding': '2rem',
            'border-radius': '1rem',
            'text-align': 'center'
        }}>
            <p>Game Paused</p>
            <button onClick={props.onUnpause}>Resume</button>
        </div>
    </div>
}