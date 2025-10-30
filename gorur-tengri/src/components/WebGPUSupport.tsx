import { createSignal, onMount } from "solid-js";
//Thanks Claude, thank the Lord I don't have to write all of this
interface BrowserInfo {
  name: string;
  version: string;
}

function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  
  // Chrome
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return { name: "Chrome", version: match ? match[1] : "unknown" };
  }
  
  // Edge
  if (userAgent.includes("Edg")) {
    const match = userAgent.match(/Edg\/(\d+)/);
    return { name: "Edge", version: match ? match[1] : "unknown" };
  }
  
  // Firefox
  if (userAgent.includes("Firefox")) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    return { name: "Firefox", version: match ? match[1] : "unknown" };
  }
  
  // Safari
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    const match = userAgent.match(/Version\/(\d+)/);
    return { name: "Safari", version: match ? match[1] : "unknown" };
  }
  
  return { name: "Unknown", version: "unknown" };
}

export default function WebGPUSupport() {
  const [browserInfo, setBrowserInfo] = createSignal<BrowserInfo>({ name: "Unknown", version: "unknown" });

  onMount(() => {
    setBrowserInfo(detectBrowser());
  });

  const getInstructions = () => {
    const { name, version } = browserInfo();
    
    switch (name) {
      case "Chrome":
        const chromeVersion = parseInt(version);
        if (chromeVersion >= 113) {
          return (
          <div>
            <p>
              Chrome {version} supports WebGPU, but it may be disabled. <strong style={{color:"white"}}>Please install the latest version of Chrome</strong> OR enable it by:
              <ol>
                <li>Navigate to <code>chrome://flags</code></li>
                <li>Search for "WebGPU"</li>
                <li>Enable the "WebGPU" flag</li>
                <li>Restart Chrome</li>
              </ol>
            </p>
          </div>
          );
        }
        return <p>Please update to the latest version of Chrome (version 113 or higher) to play this game.</p>;
      
      case "Edge":
        const edgeVersion = parseInt(version);
        if (edgeVersion >= 113) {
          return (
          <div>
            <p>
              Edge {version} supports WebGPU, but it may be disabled. <strong style={{color:"white"}}>Please install the latest version of Chrome</strong> OR enable it by:
              <ol>
                <li>Navigate to <code>edge://flags</code></li>
                <li>Search for "WebGPU"</li>
                <li>Enable the "WebGPU" flag</li>
                <li>Restart Edge</li>
              </ol>
            </p>
          </div>
          );
        }
        return <p>Please install the latest version of Chrome to play this game, or update Edge to version 113 or higher.</p>;
      
      case "Firefox":
        return (
          <div>
            <p>Firefox has experimental WebGPU support. <strong style={{color:"white"}}>Please install the latest version of Chrome</strong> OR enable WebGPU in Firefox by:</p>
            <ol>
              <li>Navigate to <code>about:config</code></li>
              <li>Accept the warning</li>
              <li>Search for <code>dom.webgpu.enabled</code></li>
              <li>Set it to <code>true</code></li>
              <li>Restart Firefox</li>
            </ol>
            <p><strong>Note:</strong> Firefox's WebGPU support is experimental and may not work properly.</p>
          </div>
        );
      
      case "Safari":
        const safariVersion = parseInt(version);
        if (safariVersion >= 18) {
          return (
          <div>
            <p>
              Safari {version} supports WebGPU, but it may be disabled. <strong style={{color:"white"}}>Please install the latest version of Chrome</strong> OR check Safari's settings.
            </p>
          </div>
          );
        }
        return <p>Please install the latest version of Chrome to play this game, or update to Safari 18 or higher on macOS Sonoma or later.</p>;
      
      default:
        return <p>Please install the latest version of Chrome to play this game.</p>;
    }
  };

  return (
    <div style={{ padding: "2rem", "max-width": "800px", margin: "0 auto" }}>
      <h1>WebGPU Not Supported</h1>
      <p>
        <strong>Detected Browser:</strong> {browserInfo().name} {browserInfo().version}
      </p>
      {getInstructions()}
      <p style={{ "margin-top": "2rem", "font-size": "0.9rem", color: "#666" }}>
        WebGPU is required to run this game. For the best experience, we recommend using the latest version of Google Chrome.
      </p>
    </div>
  );
}
