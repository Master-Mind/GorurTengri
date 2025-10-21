import { children } from "solid-js"

export default function Menu(props: { children: any; }) {
    const safeChildren = children(() => props.children);

    return   <div style={{
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
                'text-align': 'center',
                'display':'flex',
                'flex-direction':'column'
            }}>
                {safeChildren()}
            </div>
        </div>
}