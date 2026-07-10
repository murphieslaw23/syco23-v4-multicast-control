import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Tv, 
  Activity, 
  Sliders, 
  Layers, 
  Terminal, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Plus, 
  X, 
  RefreshCw, 
  Play, 
  Square, 
  Volume2, 
  SlidersHorizontal,
  Layout,
  Eye,
  Settings,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';


// Injected Google Font for industrial display headings and custom styling overrides
const StyleInjections = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
    
    .font-industrial {
      font-family: 'Barlow Condensed', -apple-system, sans-serif;
    }
    .font-mono-telemetry {
      font-family: 'JetBrains Mono', monospace;
    }
    
    /* Plate on plate layering shadows */
    .plate-outer {
      background-color: #121315;
      box-shadow: inset 1px 1px 0px rgba(255,255,255,0.05), 2px 2px 10px rgba(0,0,0,0.8);
    }
    .plate-inner {
      background-color: #181a1d;
      box-shadow: inset -1px -1px 0px rgba(255,255,255,0.02), inset 1px 1px 0px rgba(0,0,0,0.4), 0px 4px 6px rgba(0,0,0,0.5);
    }
    .plate-control {
      background-color: #1f2226;
      border: 1px solid #2d3138;
      box-shadow: inset 1px 1px 0px rgba(255,255,255,0.05);
    }
    
    /* Hardware panel styling elements */
    .grill-pattern {
      background-image: radial-gradient(circle, #2d3138 25%, transparent 26%);
      background-size: 6px 6px;
    }
    
    /* Customs scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: #121315;
    }
    ::-webkit-scrollbar-thumb {
      background: #2d3138;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #d84315;
    }
  `}</style>
);


const INITIAL_PLATFORMS = [
  { id: 'youtube', name: 'YOUTUBE LIVE', type: 'RTMPS', url: 'rtmps://a.rtmp.youtube.com/live2', key: 'yc23-v498-88fa-001x-9988', status: 'idle', bitrate: 0, fps: 0, delay: 1800, profile: '1080p60 HEVC' },
  { id: 'telegram', name: 'TELEGRAM CHAN', type: 'RTMP', url: 'rtmp://dc-ams.telegram.org/live', key: 'tg-90214-xs8892_u8172', status: 'idle', bitrate: 0, fps: 0, delay: 3100, profile: '720p30 H264' },
  { id: 'tiktok', name: 'TIKTOK STREAM', type: 'RTMP', url: 'rtmp://live-push.tiktok.com/stream', key: 'tt-live-551a-9bc2-8f19-33aa', status: 'idle', bitrate: 0, fps: 0, delay: 2400, profile: '1080p60 H264 (Vert)' },
  { id: 'twitch', name: 'TWITCH MAIN', type: 'RTMPS', url: 'rtmps://ams03.contribute.live-video.net/app', key: 'live_8819203_ssyco23v4alpha_xyz', status: 'idle', bitrate: 0, fps: 0, delay: 950, profile: '1080p60 H264' },
  { id: 'instagram', name: 'INSTAGRAM LIVE', type: 'RTMPS', url: 'rtmps://live-upload.instagram.com:443/rtmp', key: 'ig-9912-bb23-9c88-ffae-0192', status: 'idle', bitrate: 0, fps: 0, delay: 4200, profile: '720p30 H264 (Vert)' },
  { id: 'mixer', name: 'MIXER ARCHIVE', type: 'RTMP', url: 'rtmp://ingest.mixer.co-op/live', key: 'mx-884-220-syc', status: 'idle', bitrate: 0, fps: 0, delay: 1100, profile: '1080p30 H264' },
  { id: 'mixcloud', name: 'MIXCLOUD AUDIO', type: 'RTMP', url: 'rtmp://ingest.mixcloud.com/live', key: 'mc-98aa-12ef-3392', status: 'idle', bitrate: 0, fps: 0, delay: 2900, profile: 'Audio-Only 320k' },
  { id: 'facebook', name: 'FB OCCULTNET', type: 'RTMPS', url: 'rtmps://rtmp-api.facebook.com:443/rtmp', key: 'fb-882716352901-live-auth', status: 'idle', bitrate: 0, fps: 0, delay: 3500, profile: '1080p30 H264' },
];

const INITIAL_LOGS = [
  { id: 1, time: '19:02:11', src: 'SYS', cat: 'info', msg: 'SYCO23 v4 core transmission matrix initialized successfully.' },
  { id: 2, time: '19:02:14', src: 'INGEST', cat: 'info', msg: 'Local SDI-Capture DeckLink Quad 2 detected. Signal: 1080p @ 59.94Hz' },
  { id: 3, time: '19:02:15', src: 'AUDIO', cat: 'debug', msg: 'ASIO Matrix mapping loaded. 8 discrete channels armed.' },
  { id: 4, time: '19:02:20', src: 'NET', cat: 'success', msg: 'Uplink bonded connection active. Primary: 10Gbps fiber, Backup: 1Gbps Microwave.' },
  { id: 5, time: '19:02:22', src: 'SYS', cat: 'warning', msg: 'High jitter detected on secondary backup interface. Monitoring packet loss.' },
];

const TEMPLATES = [
  { id: 'industrial-brut', name: 'INDUSTRIAL BRUTALISM', ratio: '16:9', desc: 'Raw concrete split layouts, sharp overlays and heavy camera grids.', img: 'bg-zinc-800' },
  { id: 'warehouse-rave', name: 'WAREHOUSE CCTV', ratio: '16:9', desc: 'Low-fi monochrome camera aesthetics with overlay telemetry markers.', img: 'bg-stone-900' },
  { id: 'tiktok-vertical', name: 'VERTICAL TACTICAL', ratio: '9:16', desc: 'Stacked vertical dual cameras for mobile smartphone feeds.', img: 'bg-neutral-800' },
  { id: 'split-quad', name: 'QUAD-SPLIT DECK', ratio: '16:9', desc: 'Four simultaneous feeds with high-contrast hardware labels.', img: 'bg-zinc-900' },
  { id: 'radio-visual', name: 'RADIO VISUAL LIVE', ratio: '16:9', desc: 'Audio-focused layout featuring a prominent real-time vector scope.', img: 'bg-slate-900' },
  { id: 'monolith-portrait', name: 'MONOLITH PORTRAIT', ratio: '9:16', desc: 'Centered isolated high-definition single stream.', img: 'bg-stone-950' },
];


// Visual anchor simulating an industrial hex bolt
const PanelBolt = () => (
  <svg className="w-2.5 h-2.5 text-zinc-700 select-none opacity-80 hover:text-orange-700 transition-colors" viewBox="0 0 10 10">
    <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="2.5" y1="2.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="1" />
  </svg>
);

// Ventilation grill decoration for hardware chassis look
const ChassisGrill = ({ className = "h-4" }) => (
  <div className={`w-full grill-pattern opacity-10 border-t border-b border-zinc-900 ${className}`} />
);

// VU Audio level meter component
const VUMeter = ({ channel, level, peak }) => {
  const bars = 20;
  return (
    <div className="flex items-center space-x-1.5 py-0.5">
      <span className="text-[9px] font-mono-telemetry text-zinc-500 w-4">{channel}</span>
      <div className="flex-1 flex space-x-0.5 bg-black p-0.5 border border-zinc-900">
        {Array.from({ length: bars }).map((_, i) => {
          const ratio = i / bars;
          let colorClass = "bg-teal-900/60";
          if (ratio > 0.85) colorClass = "bg-red-950";
          else if (ratio > 0.65) colorClass = "bg-amber-950";

          const active = level > ratio;
          const isPeak = peak > ratio && peak <= (ratio + 1/bars);

          if (active) {
            if (ratio > 0.85) colorClass = "bg-red-600 shadow-[0_0_4px_#ef4444]";
            else if (ratio > 0.65) colorClass = "bg-amber-500 shadow-[0_0_4px_#f59e0b]";
            else colorClass = "bg-teal-500 shadow-[0_0_4px_#14b8a6]";
          } else if (isPeak) {
            colorClass = "bg-zinc-400";
          }

          return (
            <div 
              key={i} 
              className={`h-2.5 flex-1 transition-all duration-75 ${colorClass}`} 
            />
          );
        })}
      </div>
    </div>
  );
};


export default function App() {
  const [view, setView] = useState('transmission'); // transmission | templates | builder | diagnostics
  const [viewport, setViewport] = useState('desktop'); // desktop | tablet | mobile | tv_4k
  const [platforms, setPlatforms] = useState(INITIAL_PLATFORMS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isMasterArmed, setIsMasterArmed] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [systemLoad, setSystemLoad] = useState({ cpu: 14, ram: 34, temp: 42 });
  const [selectedPlatform, setSelectedPlatform] = useState(null); // for Drawer View
  const [showDrawer, setShowDrawer] = useState(false);
  
  // Custom Template Builder state
  const [builderConfig, setBuilderConfig] = useState({
    name: 'CUSTOM DECK ALPHA',
    fps: '60',
    resolution: '1080p',
    audioChannels: 'Stereo (Ch 1/2)',
    overlayMode: 'Hardware Clock + Vectorscope',
    watermark: true,
    gridGuides: false
  });

  // Audio VU Level state simulation
  const [audioLevels, setAudioLevels] = useState([
    { level: 0.1, peak: 0.3 },
    { level: 0.1, peak: 0.3 },
    { level: 0.05, peak: 0.1 },
    { level: 0.05, peak: 0.1 }
  ]);

  // Video Canvas preview animation loop
  const videoCanvasRef = useRef(null);
  const requestRef = useRef();

  // Handle stream logs generator simulated under live transmission
  useEffect(() => {
    let logInterval;
    if (isLive) {
      logInterval = setInterval(() => {
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        const events = [
          { cat: 'info', msg: `Sent Keyframe to ${randomPlatform.name}. Keyframe spacing aligned (2.0s).` },
          { cat: 'success', msg: `RTMP handshake telemetry verified: Ping to ${randomPlatform.name} is stable.` },
          { cat: 'debug', msg: `Bandwidth calculation for ${randomPlatform.name} - current chunk payload delivered: 1.2MB.` },
          { cat: 'warning', msg: `Jitter spike detected on ${randomPlatform.name} edge CDN ingest server.` }
        ];
        
        // Random bad events
        const isBadEvent = Math.random() > 0.85;
        let event = events[Math.floor(Math.random() * events.length)];
        if (isBadEvent) {
          event = {
            cat: 'error',
            msg: `FRAME DROP ALERT: Outbound Buffer warning on ${randomPlatform.name}. Dropping to low-priority queue.`
          };
          // Oscillate platform status if bad event
          setPlatforms(prev => prev.map(p => {
            if (p.id === randomPlatform.id && p.status === 'live') {
              return { ...p, status: 'degraded' };
            }
            return p;
          }));
        }

        const date = new Date();
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        
        setLogs(prev => [
          { id: Date.now(), time: timeStr, src: randomPlatform.id.toUpperCase(), ...event },
          ...prev.slice(0, 30) // cap logs at 30
        ]);

        // Oscillate telemetry state
        setPlatforms(prev => prev.map(p => {
          if (p.status === 'live') {
            const drift = (Math.random() - 0.5) * 150;
            const newBitrate = Math.max(1500, Math.min(6500, Math.round(p.bitrate + drift)));
            return { ...p, bitrate: newBitrate };
          }
          return p;
        }));

      }, 4000);
    }
    return () => clearInterval(logInterval);
  }, [isLive, platforms]);

  // Simulate dynamic Audio levels
  useEffect(() => {
    let levelInterval = setInterval(() => {
      setAudioLevels(prev => prev.map(audio => {
        if (!isLive && !isMasterArmed) {
          return { level: 0.01, peak: 0.05 };
        }
        const factor = isLive ? 0.9 : 0.45;
        const newLevel = Math.max(0.02, Math.min(0.98, (Math.random() * factor) + 0.1));
        const newPeak = Math.max(audio.peak, newLevel);
        const decayedPeak = Math.max(newLevel, newPeak - 0.02);
        return { level: newLevel, peak: decayedPeak };
      }));
    }, 150);
    return () => clearInterval(levelInterval);
  }, [isLive, isMasterArmed]);

  // Canvas Video Monitor Engine
  useEffect(() => {
    const canvas = videoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameCount = 0;

    const render = () => {
      frameCount++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#0f1011';
      ctx.fillRect(0, 0, w, h);

      if (!isMasterArmed && !isLive) {
        // Draw SMPTE Color Bars (Classic analog standby)
        const barWidth = w / 7;
        const colors = ['#ffffff', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
        colors.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.fillRect(idx * barWidth, 0, barWidth, h * 0.7);
        });
        
        // Lower narrow colors
        const lowColors = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#ffffff'];
        lowColors.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.fillRect(idx * barWidth, h * 0.7, barWidth, h * 0.15);
        });

        // Bottom block colors
        ctx.fillStyle = '#131313';
        ctx.fillRect(0, h * 0.85, w, h * 0.15);

        // Standby text overlay
        ctx.fillStyle = '#000000';
        ctx.fillRect(w / 2 - 120, h / 2 - 30, 240, 60);
        ctx.strokeStyle = '#d84315';
        ctx.lineWidth = 2;
        ctx.strokeRect(w / 2 - 120, h / 2 - 30, 240, 60);

        ctx.font = 'bold 16px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#d84315';
        ctx.textAlign = 'center';
        ctx.fillText("TRANSMISSION OFFLINE", w / 2, h / 2 - 4);
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#828d9a';
        ctx.fillText("WAITING FOR SIGNAL ARMING", w / 2, h / 2 + 16);

      } else {
        // Active Scope & Signal Visualization
        ctx.strokeStyle = isLive ? '#14b8a6' : '#f59e0b';
        ctx.lineWidth = 1.5;

        // Draw camera crosshair grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.stroke();

        // Safe action frame boundary
        ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);

        // Draw animated geometric vector waveforms
        ctx.strokeStyle = isLive ? 'rgba(20, 184, 166, 0.75)' : 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const wave1 = Math.sin((x + frameCount * 3) * 0.015) * 35;
          const wave2 = Math.cos((x - frameCount * 2) * 0.04) * 15;
          const noise = (Math.random() - 0.5) * (isLive ? 2 : 6); // visual noise if only armed
          const y = (h / 2) + wave1 + wave2 + noise;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw secondary visual telemetry
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(15, 15, 190, 50);
        ctx.strokeStyle = isLive ? '#14b8a6' : '#f59e0b';
        ctx.strokeRect(15, 15, 190, 50);

        ctx.font = '10px "JetBrains Mono"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`SIGNAL: 1080p @ 60.00 FPS`, 25, 32);
        ctx.fillStyle = isLive ? '#14b8a6' : '#f59e0b';
        ctx.fillText(`ENC: NVENC RTMP-STABLE`, 25, 45);
        ctx.fillText(`TIME: ${frameCount}f`, 25, 58);

        // Draw interactive visualizer in corner
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.strokeRect(w - 110, 15, 95, 50);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(w - 110, 15, 95, 50);

        ctx.beginPath();
        ctx.strokeStyle = '#d84315';
        for (let j = 0; j < 10; j++) {
          const barHeight = Math.random() * 40;
          ctx.moveTo(w - 105 + (j * 9), 60);
          ctx.lineTo(w - 105 + (j * 9), 60 - barHeight);
        }
        ctx.stroke();

        // Scan lines simulation
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let y = frameCount % 12; y < h; y += 12) {
          ctx.fillRect(0, y, w, 2);
        }

        // Glitch effect occasional
        if (Math.random() > 0.985) {
          ctx.fillStyle = 'rgba(216, 67, 21, 0.4)';
          ctx.fillRect(0, Math.random() * h, w, Math.random() * 10);
        }
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isLive, isMasterArmed]);


  const togglePlatformStatus = (id) => {
    setPlatforms(prev => prev.map(p => {
      if (p.id === id) {
        let nextStatus;
        if (p.status === 'idle') nextStatus = 'armed';
        else if (p.status === 'armed') nextStatus = 'connecting';
        else if (p.status === 'connecting') nextStatus = 'live';
        else if (p.status === 'live') nextStatus = 'degraded';
        else if (p.status === 'degraded') nextStatus = 'failed';
        else nextStatus = 'idle';

        let bitrate = 0;
        let fps = 0;
        if (nextStatus === 'live' || nextStatus === 'degraded') {
          bitrate = p.profile.includes('1080p') ? 5800 : 3500;
          fps = p.profile.includes('60') ? 60 : 30;
        }

        // Add telemetry log for transition
        const date = new Date();
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        const logMsg = `Relay [${p.name}] status toggled to: ${nextStatus.toUpperCase()}`;
        setLogs(prevLogs => [{ id: Date.now(), time: timeStr, src: p.id.toUpperCase(), cat: nextStatus === 'failed' ? 'error' : 'info', msg: logMsg }, ...prevLogs]);

        return { ...p, status: nextStatus, bitrate, fps };
      }
      return p;
    }));
  };

  const masterArmAll = () => {
    const nextState = !isMasterArmed;
    setIsMasterArmed(nextState);
    if (!nextState) {
      setIsLive(false);
    }
    
    setPlatforms(prev => prev.map(p => ({
      ...p,
      status: nextState ? 'armed' : 'idle',
      bitrate: 0,
      fps: 0
    })));

    const date = new Date();
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    setLogs(prev => [
      { id: Date.now(), time: timeStr, src: 'MASTER', cat: nextState ? 'warning' : 'info', msg: nextState ? 'MASTER TRANSMISSION ARMED. READY TO LAUNCH INGEST.' : 'MASTER SYSTEM STANDBY.' },
      ...prev
    ]);
  };

  const triggerGoLive = () => {
    if (!isMasterArmed) return;
    const nextState = !isLive;
    setIsLive(nextState);

    setPlatforms(prev => prev.map(p => {
      if (p.status === 'armed' && nextState) {
        return { 
          ...p, 
          status: 'live', 
          bitrate: p.profile.includes('1080p') ? 6000 : 3800, 
          fps: p.profile.includes('60') ? 60 : 30 
        };
      } else if (!nextState) {
        return { ...p, status: 'idle', bitrate: 0, fps: 0 };
      }
      return p;
    }));

    if (!nextState) {
      setIsMasterArmed(false);
    }

    const date = new Date();
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    setLogs(prev => [
      { id: Date.now(), time: timeStr, src: 'MASTER', cat: nextState ? 'success' : 'error', msg: nextState ? 'GO LIVE ORDER IMPLEMENTED. SYCO23 BROADCAST MATRIX ONLINE.' : 'EMERGENCY SHUTDOWN INITIATED. Outbound streams severed.' },
      ...prev
    ]);
  };

  const openTransmissionKit = (platform) => {
    setSelectedPlatform(platform);
    setShowDrawer(true);
  };


  const getStatusStyle = (status) => {
    switch (status) {
      case 'idle':
        return { bg: 'bg-zinc-900 border-zinc-800 text-zinc-500', indicator: 'bg-zinc-700', text: 'STANDBY' };
      case 'armed':
        return { bg: 'bg-amber-950/20 border-amber-900/60 text-amber-500', indicator: 'bg-amber-500 animate-pulse', text: 'ARMED' };
      case 'connecting':
        return { bg: 'bg-orange-950/40 border-orange-800 text-orange-400', indicator: 'bg-orange-500 animate-ping', text: 'CONNECTING' };
      case 'live':
        return { bg: 'bg-teal-950/20 border-teal-800 text-teal-400', indicator: 'bg-teal-400', text: 'LIVE FEED' };
      case 'degraded':
        return { bg: 'bg-orange-950/20 border-orange-900/40 text-orange-500', indicator: 'bg-orange-500 animate-bounce', text: 'DEGRADED' };
      case 'failed':
        return { bg: 'bg-red-950/30 border-red-900/60 text-red-500', indicator: 'bg-red-600 animate-pulse', text: 'LINK FAILURE' };
      default:
        return { bg: 'bg-zinc-900 border-zinc-800 text-zinc-500', indicator: 'bg-zinc-500', text: 'OFFLINE' };
    }
  };


  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#0d0e10] text-zinc-300 font-sans antialiased selection:bg-orange-800 selection:text-white relative overflow-hidden flex flex-col">
      <StyleInjections />

      {/* RITUALISTIC TOP PANEL HEADER */}
      <header className="plate-outer border-b border-zinc-900 px-4 py-3 flex flex-wrap items-center justify-between gap-4 z-20 select-none">
        <div className="flex items-center space-x-3">
          <div className="p-1 bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
            <Radio className={`w-5 h-5 ${isLive ? 'text-teal-400 animate-pulse' : 'text-zinc-600'}`} />
            {isLive && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-teal-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono-telemetry tracking-[0.3em] text-zinc-500">TRANSMISSION CONTROL SURFACE</span>
              <span className="text-[10px] font-mono-telemetry bg-zinc-900 px-1 py-0.5 text-orange-600 border border-zinc-800">v4.0.26</span>
            </div>
            <h1 className="text-xl font-industrial font-black tracking-wide text-zinc-100 flex items-center gap-1.5">
              SYCO23 <span className="text-zinc-500 font-normal">/</span> MULTISTREAM INTEGRATOR
            </h1>
          </div>
        </div>

        {/* VIEWPORT SIMULATION CONTROLS */}
        <div className="bg-[#141618] px-2 py-1 border border-zinc-800/80 flex items-center space-x-1.5">
          <span className="text-[9px] font-mono-telemetry text-zinc-500 px-1">VIEWPORT EMULATION:</span>
          {[
            { id: 'desktop', label: 'DESKTOP 1080P' },
            { id: 'tablet', label: 'TABLET VIEW' },
            { id: 'mobile', label: 'MOBILE PORTRAIT' },
            { id: 'tv_4k', label: 'TV / 4K DISPLAY' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewport(mode.id)}
              className={`text-[10px] font-mono-telemetry px-2 py-1 border transition-colors ${
                viewport === mode.id
                  ? 'bg-orange-950/30 border-orange-800/80 text-orange-500 font-bold'
                  : 'bg-zinc-900 border-zinc-900 text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* GLOBAL NAVIGATION RAIL */}
        <div className="flex items-center space-x-1 bg-[#141618] p-0.5 border border-zinc-800">
          {[
            { id: 'transmission', label: 'MAIN PANEL', icon: Sliders },
            { id: 'templates', label: 'TEMPLATE GALLERY', icon: Layout },
            { id: 'builder', label: 'HARDWARE BUILDER', icon: SlidersHorizontal },
            { id: 'diagnostics', label: 'DIAGNOSTICS BOARD', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-mono-telemetry tracking-wide transition-colors ${
                  view === tab.id
                    ? 'bg-zinc-800 text-zinc-100 font-bold border-b-2 border-orange-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* CORE WRAPPER SIMULATING RESPONSIVE CONTAINER LIMITATIONS */}
      <main className="flex-1 flex overflow-hidden p-3 bg-[#0a0b0c] relative justify-center">
        <div 
          className={`w-full transition-all duration-300 flex flex-col ${
            viewport === 'mobile' ? 'max-w-[420px] max-h-[840px] border border-zinc-800 rounded shadow-2xl overflow-y-auto' :
            viewport === 'tablet' ? 'max-w-[800px] max-h-[1024px] border border-zinc-800 rounded shadow-2xl' :
            viewport === 'tv_4k' ? 'max-w-[1920px] scale-[1.03]' : 'max-w-[1400px]'
          }`}
        >
          {/* VIEW: MAIN TRANSMISSION CORE */}
          {view === 'transmission' && (
            <div className={`w-full flex-1 grid ${viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'} gap-3 overflow-hidden`}>
              
              {/* PRIMARY LEFT SIDE COLUMN: TRANSMISSION CONTROLLER / SOURCE INGEST SPINE */}
              <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-5'} flex flex-col space-y-3 h-full`}>
                
                {/* INGEST SOURCE SIGNAL CARD */}
                <div className="plate-outer border border-zinc-900 p-3 flex flex-col space-y-2 relative">
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <PanelBolt />
                    <PanelBolt />
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono-telemetry text-zinc-400 font-bold tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                    <span>INGEST INTERFACE [SDI-QUAD_A]</span>
                  </div>
                  
                  {/* LIVE MONITOR CONTAINER */}
                  <div className="border border-zinc-800 relative bg-black aspect-video overflow-hidden group">
                    <canvas 
                      ref={videoCanvasRef} 
                      width={480} 
                      height={270} 
                      className="w-full h-full block" 
                    />
                    <div className="absolute bottom-1.5 left-2 bg-black/80 px-2 py-0.5 border border-zinc-800 text-[9px] font-mono-telemetry flex items-center space-x-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isMasterArmed ? 'bg-amber-500 animate-pulse' : 'bg-zinc-700'}`} />
                      <span className="text-zinc-400">FPS:</span>
                      <span className="text-zinc-100 font-bold">{isMasterArmed ? '60.00' : '0.00'}</span>
                    </div>
                    {isLive && (
                      <div className="absolute top-2 right-2 bg-red-950/95 border border-red-800 px-2 py-0.5 text-[9px] font-mono-telemetry text-red-500 font-bold flex items-center space-x-1 shadow-lg animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span>TX ACTIVE</span>
                      </div>
                    )}
                  </div>

                  <ChassisGrill className="h-2" />

                  {/* MASTER TELEMETRY READOUT */}
                  <div className="grid grid-cols-3 gap-1.5 bg-[#141517] p-2 border border-zinc-800 text-center font-mono-telemetry">
                    <div>
                      <div className="text-[8px] text-zinc-500">INGEST BITRATE</div>
                      <div className="text-sm font-bold text-zinc-200">{isLive ? '12.44 Gbps' : '0.00 Mbps'}</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500">PACKET DROP (S)</div>
                      <div className="text-sm font-bold text-teal-400">0.000%</div>
                    </div>
                    <div>
                      <div className="text-[8px] text-zinc-500">CHASSIS TEMP</div>
                      <div className="text-sm font-bold text-orange-500">42°C</div>
                    </div>
                  </div>
                </div>

                {/* AUDIO CORE MIXER MODULE (SPEAKER-WALL ARCHITECTURE) */}
                <div className="plate-outer border border-zinc-900 p-3 flex flex-col space-y-2 relative flex-1">
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <PanelBolt />
                    <PanelBolt />
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] font-mono-telemetry text-zinc-400 font-bold tracking-wider mb-1">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>8-CH MASTER TELEMETRY AUDIO MATRIX</span>
                  </div>

                  {/* VU METER RACKS */}
                  <div className="bg-[#101113] p-2 border border-zinc-900 space-y-1">
                    <VUMeter channel="CH1" level={audioLevels[0].level} peak={audioLevels[0].peak} />
                    <VUMeter channel="CH2" level={audioLevels[1].level} peak={audioLevels[1].peak} />
                    <VUMeter channel="CH3" level={audioLevels[2].level} peak={audioLevels[2].peak} />
                    <VUMeter channel="CH4" level={audioLevels[3].level} peak={audioLevels[3].peak} />
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-mono-telemetry text-zinc-500 px-1 pt-1">
                    <span>AUDIO DECODER: AAC STEREO</span>
                    <span>SAMPLING: 48.0 KHz</span>
                  </div>

                  {/* SESSION MASTER CONTROL PLATES */}
                  <div className="mt-auto pt-3 border-t border-zinc-800/80">
                    <div className="grid grid-cols-2 gap-2">
                      
                      {/* MASTER ARM HEVEL */}
                      <button
                        onClick={masterArmAll}
                        className={`flex flex-col items-center justify-center p-2 border transition-all ${
                          isMasterArmed 
                            ? 'bg-amber-950/20 border-amber-600/80 text-amber-500 shadow-[inset_0_0_10px_rgba(217,119,6,0.15)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className="text-[8px] font-mono-telemetry tracking-widest text-zinc-500 mb-1">TRANSMISSION CORE</span>
                        <div className="flex items-center space-x-1.5">
                          {isMasterArmed ? <Unlock className="w-4 h-4 text-amber-500" /> : <Lock className="w-4 h-4 text-zinc-600" />}
                          <span className="font-industrial text-base font-black tracking-widest">
                            {isMasterArmed ? "MASTER ARMED" : "DISARMED"}
                          </span>
                        </div>
                      </button>

                      {/* GO LIVE ORDER ENGINE */}
                      <button
                        onClick={triggerGoLive}
                        disabled={!isMasterArmed}
                        className={`flex flex-col items-center justify-center p-2 border transition-all ${
                          !isMasterArmed
                            ? 'bg-zinc-950/50 border-zinc-900 text-zinc-700 cursor-not-allowed'
                            : isLive
                            ? 'bg-red-950/30 border-red-600 text-red-500 animate-pulse font-bold shadow-[inset_0_0_15px_rgba(220,38,38,0.2)]'
                            : 'bg-teal-950/20 border-teal-800 text-teal-400 hover:bg-teal-950/40 font-bold'
                        }`}
                      >
                        <span className="text-[8px] font-mono-telemetry tracking-widest text-zinc-500 mb-1">SIGNAL PIPELINE</span>
                        <div className="flex items-center space-x-1.5">
                          <Tv className={`w-4 h-4 ${isLive ? 'text-red-500' : 'text-teal-400'}`} />
                          <span className="font-industrial text-base font-black tracking-widest">
                            {isLive ? "TERMINATE LIVE" : "LAUNCH LIVE"}
                          </span>
                        </div>
                      </button>

                    </div>
                  </div>
                </div>

              </div>

              {/* PRIMARY RIGHT SIDE COLUMN: DESTINATION MATRIX RELAYS */}
              <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-7'} flex flex-col space-y-3 h-full overflow-hidden`}>
                
                {/* NODE HEADER / TOTAL STATUS */}
                <div className="plate-outer border border-zinc-900 p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-industrial font-black tracking-widest text-zinc-400">OUTBOUND DESTINATION ROUTING MATRIX</span>
                    <span className="text-[9px] font-mono-telemetry bg-zinc-900 px-1.5 py-0.5 border border-zinc-800 text-zinc-400">ACTIVE CHANNELS: {platforms.filter(p => p.status === 'live').length}/8</span>
                  </div>
                  <div className="flex space-x-1">
                    <PanelBolt />
                    <PanelBolt />
                  </div>
                </div>

                {/* DESTINATION NODES LIST */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {platforms.map((p) => {
                    const style = getStatusStyle(p.status);
                    return (
                      <div 
                        key={p.id}
                        className="plate-outer border border-zinc-900 p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 relative hover:border-zinc-800 transition-colors"
                      >
                        {/* LEFT PLATFORM SCHEMATICS */}
                        <div className="flex items-start space-x-3 md:w-1/3">
                          <button 
                            onClick={() => togglePlatformStatus(p.id)}
                            className="w-8 h-8 flex items-center justify-center bg-zinc-950 border border-zinc-800 hover:border-orange-900/50 group"
                          >
                            <span className="text-[9px] font-mono-telemetry text-zinc-600 group-hover:text-orange-500 font-bold">SW</span>
                          </button>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-mono-telemetry text-zinc-500">[{p.type}]</span>
                              <h3 className="text-xs font-industrial font-black tracking-widest text-zinc-100">{p.name}</h3>
                            </div>
                            <span className="text-[10px] font-mono-telemetry text-zinc-500 block truncate max-w-[180px]" title={p.url}>
                              {p.url}
                            </span>
                          </div>
                        </div>

                        {/* STATUS AND TELEMETRY GRID */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-1 md:w-1/3 text-xs font-mono-telemetry">
                          {/* STATUS PILL */}
                          <div className={`border p-1 flex items-center space-x-2 ${style.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.indicator}`} />
                            <span className="text-[10px] font-bold tracking-wide">{style.text}</span>
                          </div>

                          {/* BITRATE OSCILLATOR */}
                          <div className="bg-zinc-950 p-1 border border-zinc-900 flex flex-col justify-center">
                            <span className="text-[8px] text-zinc-500 leading-none">BANDWIDTH</span>
                            <span className="text-[10px] text-zinc-300 font-bold leading-tight">
                              {p.bitrate > 0 ? `${(p.bitrate / 1000).toFixed(2)} Mbps` : '0.00 Mbps'}
                            </span>
                          </div>

                          {/* PROFILE KEY */}
                          <div className="bg-zinc-950 p-1 border border-zinc-900 flex flex-col justify-center hidden md:flex">
                            <span className="text-[8px] text-zinc-500 leading-none">STABILITY</span>
                            <span className="text-[10px] text-zinc-300 font-bold leading-tight truncate">
                              {p.status === 'live' ? '99.8%' : p.status === 'degraded' ? '74.2% (LAG)' : 'OFFLINE'}
                            </span>
                          </div>
                        </div>

                        {/* INTERACTIVE CONTROLS RAIL */}
                        <div className="flex items-center space-x-1.5 self-end md:self-auto">
                          
                          {/* PLATFORM KEY DRAWER ACTUATOR */}
                          <button
                            onClick={() => openTransmissionKit(p)}
                            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-1.5 text-zinc-400 hover:text-orange-500 flex items-center space-x-1 transition-colors"
                            title="Open Credentials Configuration"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-mono-telemetry font-bold">KIT</span>
                          </button>

                          {/* MANUAL PLATFORM TOGGLE */}
                          <button
                            onClick={() => togglePlatformStatus(p.id)}
                            className={`px-2 py-1.5 text-[9px] font-mono-telemetry font-bold border transition-all ${
                              p.status === 'live' 
                                ? 'bg-red-950/20 border-red-800 text-red-500 hover:bg-red-900/20' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                            }`}
                          >
                            {p.status === 'live' ? 'KILL' : 'CYCLE'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* BOTTOM COLORIZED LOG PANEL */}
                <div className="plate-outer border border-zinc-900 p-2.5 flex flex-col h-40">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900 mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[10px] font-mono-telemetry tracking-widest text-zinc-400">TELEMETRY MATRIX ROUTING LOGS</span>
                    </div>
                    <span className="text-[8px] font-mono-telemetry text-zinc-600">STDOUT BUFFER LOG</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 font-mono-telemetry text-[11px] select-text pr-1">
                    {logs.map((log) => {
                      let col = 'text-zinc-500';
                      if (log.cat === 'warning') col = 'text-amber-500';
                      else if (log.cat === 'error') col = 'text-red-500 font-bold';
                      else if (log.cat === 'success') col = 'text-teal-400';
                      else if (log.cat === 'debug') col = 'text-zinc-600';

                      return (
                        <div key={log.id} className="flex items-start space-x-2 py-0.5 border-b border-zinc-950/40">
                          <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                          <span className="text-zinc-500 shrink-0 font-bold">[{log.src}]</span>
                          <span className={`${col} leading-tight`}>{log.msg}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW: TEMPLATE GALLERY */}
          {view === 'templates' && (
            <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
              <div className="plate-outer border border-zinc-900 p-3 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-industrial font-black tracking-widest text-zinc-200">SYCO23 v4 LAYOUT PRESET GALLERY</h2>
                  <p className="text-xs text-zinc-500">Select physical layouts designed specifically for underground transmission monitors.</p>
                </div>
                <button 
                  onClick={() => setView('builder')}
                  className="bg-orange-950/20 border border-orange-800 hover:bg-orange-900/20 px-3 py-1.5 text-xs font-mono-telemetry text-orange-500 flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>CONSTRUCT NEW LAYOUT</span>
                </button>
              </div>

              {/* TEMPLATES GRID */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                {TEMPLATES.map((tpl) => (
                  <div 
                    key={tpl.id}
                    className="plate-outer border border-zinc-900 p-3 flex flex-col space-y-2 relative group hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    {/* Visual Preview Box representing hardware screen */}
                    <div className="border border-zinc-800 bg-zinc-950 aspect-video relative overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 opacity-15 bg-cover bg-center" style={{ backgroundImage: `radial-gradient(circle, #d84315 1px, transparent 1px)`, backgroundSize: '12px 12px' }} />
                      <div className="absolute top-2 left-2 bg-zinc-900 px-1 text-[8px] font-mono-telemetry text-zinc-400 border border-zinc-800">
                        {tpl.ratio}
                      </div>

                      {/* Mock UI Structure representing the layouts */}
                      <div className="w-3/4 h-2/3 border border-zinc-800 rounded-sm bg-black/80 flex p-1 space-x-1 relative">
                        {tpl.id.includes('split') ? (
                          <>
                            <div className="flex-1 border border-zinc-900 bg-zinc-900/30 flex items-center justify-center text-[8px] font-mono-telemetry">CAM 1</div>
                            <div className="flex-1 border border-zinc-900 bg-zinc-900/30 flex items-center justify-center text-[8px] font-mono-telemetry">CAM 2</div>
                          </>
                        ) : tpl.id.includes('vertical') ? (
                          <div className="flex-1 flex flex-col space-y-1">
                            <div className="h-1/2 border border-zinc-900 bg-zinc-900/30 flex items-center justify-center text-[8px] font-mono-telemetry">CAM-A</div>
                            <div className="h-1/2 border border-zinc-900 bg-zinc-900/30 flex items-center justify-center text-[8px] font-mono-telemetry">CAM-B</div>
                          </div>
                        ) : (
                          <div className="flex-1 border border-zinc-900 bg-zinc-900/30 flex flex-col justify-end p-1 relative">
                            <span className="text-[7px] font-mono-telemetry text-orange-500 absolute top-1 right-1">ACTIVE FEED</span>
                            <div className="h-1.5 w-1/2 bg-zinc-800" />
                          </div>
                        )}
                      </div>

                      {/* Accent Corner Brackets */}
                      <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-zinc-700" />
                      <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-zinc-700" />
                    </div>

                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-industrial font-black tracking-widest text-zinc-100">{tpl.name}</h3>
                      <span className="text-[9px] font-mono-telemetry text-zinc-500">STABLE CORE</span>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono-telemetry leading-relaxed">
                      {tpl.desc}
                    </p>

                    <button 
                      onClick={() => {
                        alert(`Layout preset changed to: ${tpl.name}. Ready to route to matrix.`);
                        setView('transmission');
                      }}
                      className="mt-auto w-full py-1.5 bg-zinc-900 border border-zinc-800 text-xs font-mono-telemetry text-zinc-400 group-hover:text-zinc-100 group-hover:bg-zinc-800 transition-colors"
                    >
                      APPLY TRANSMISSION PROFILE
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CUSTOM TEMPLATE BUILDER */}
          {view === 'builder' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 overflow-hidden">
              
              {/* BUILDER HARDWARE HARD-CONTROLS */}
              <div className="col-span-1 md:col-span-5 plate-outer border border-zinc-900 p-4 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-industrial font-black tracking-widest">BUILDER PANEL CORE</span>
                  </div>
                  <PanelBolt />
                </div>

                <div className="space-y-3 font-mono-telemetry text-xs">
                  {/* Name field */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-zinc-500 text-[10px]">PRESET CHANNEL LABELLING</label>
                    <input 
                      type="text" 
                      value={builderConfig.name}
                      onChange={(e) => setBuilderConfig({...builderConfig, name: e.target.value})}
                      className="bg-black border border-zinc-800 p-2 text-zinc-100 focus:outline-none focus:border-orange-500" 
                    />
                  </div>

                  {/* Resolution hardware switch */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-zinc-500 text-[10px]">RESOLVING COMPOSITION RATIO</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['1080p', '720p', '4K Ingest'].map((res) => (
                        <button
                          key={res}
                          onClick={() => setBuilderConfig({...builderConfig, resolution: res})}
                          className={`p-1.5 border text-[10px] text-center ${builderConfig.resolution === res ? 'bg-orange-950/20 border-orange-800 text-orange-500' : 'bg-black border-zinc-800 text-zinc-500'}`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Rate hardware switch */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-zinc-500 text-[10px]">UPLINK FRAME DECK (FPS)</label>
                    <div className="grid grid-cols-3 gap-1">
                      {['30', '59.94', '60'].map((fps) => (
                        <button
                          key={fps}
                          onClick={() => setBuilderConfig({...builderConfig, fps})}
                          className={`p-1.5 border text-[10px] text-center ${builderConfig.fps === fps ? 'bg-orange-950/20 border-orange-800 text-orange-500' : 'bg-black border-zinc-800 text-zinc-500'}`}
                        >
                          {fps} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Telemetry Overlays toggle */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-zinc-500 text-[10px]">INTEGRATED TELEMETRY HUD</label>
                    <select
                      value={builderConfig.overlayMode}
                      onChange={(e) => setBuilderConfig({...builderConfig, overlayMode: e.target.value})}
                      className="bg-black border border-zinc-800 p-2 text-zinc-300 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Hardware Clock + Vectorscope">Hardware Clock + Vectorscope</option>
                      <option value="CCTV Grid Monitor Only">CCTV Grid Monitor Only</option>
                      <option value="Raw Unprocessed Stream">Raw Unprocessed Stream</option>
                    </select>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={builderConfig.watermark}
                        onChange={(e) => setBuilderConfig({...builderConfig, watermark: e.target.checked})}
                        className="rounded bg-black border-zinc-800 text-orange-500 focus:ring-0"
                      />
                      <span className="text-[10px] text-zinc-400">BURN-IN WATERMARK SYCO23</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={builderConfig.gridGuides}
                        onChange={(e) => setBuilderConfig({...builderConfig, gridGuides: e.target.checked})}
                        className="rounded bg-black border-zinc-800 text-orange-500 focus:ring-0"
                      />
                      <span className="text-[10px] text-zinc-400">DRAW SCAN ALIGNMENT GRID GUIDES</span>
                    </label>
                  </div>
                </div>

                <div className="mt-auto space-y-2">
                  <button 
                    onClick={() => {
                      alert(`Chassis Matrix Updated: Custom profile '${builderConfig.name}' initialized.`);
                      setView('transmission');
                    }}
                    className="w-full py-2 bg-teal-950/20 hover:bg-teal-950/40 border border-teal-800 text-teal-400 font-bold font-mono-telemetry text-xs"
                  >
                    DEPLOY HARDWARE PRESET
                  </button>
                  <button 
                    onClick={() => setView('transmission')}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-mono-telemetry text-xs"
                  >
                    ABORT CONFIGURATION
                  </button>
                </div>
              </div>

              {/* BUILDER HARDWARE PREVIEW MONITOR */}
              <div className="col-span-1 md:col-span-7 plate-outer border border-zinc-900 p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-mono-telemetry text-zinc-500">OUTBOUND ENCODER CANVAS PREVIEW</span>
                  <span className="text-[9px] font-mono-telemetry bg-zinc-900 px-1 text-zinc-500">VECT_DECK_PREVIEW</span>
                </div>

                <div className="flex-1 bg-black border border-zinc-800 relative flex items-center justify-center overflow-hidden aspect-video">
                  {/* Mock Preview Display Grid */}
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '16px 16px' }} />
                  
                  {builderConfig.gridGuides && (
                    <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="border border-zinc-800/40 border-dashed" />
                      ))}
                    </div>
                  )}

                  <div className="text-center z-10 space-y-2">
                    <span className="text-[10px] font-mono-telemetry bg-zinc-900 border border-zinc-800 p-1.5 text-zinc-400">
                      {builderConfig.resolution} @ {builderConfig.fps} FPS
                    </span>
                    <h2 className="text-xl font-industrial font-black tracking-widest text-zinc-500">
                      [{builderConfig.name}]
                    </h2>
                  </div>

                  {/* Watermark position rendering */}
                  {builderConfig.watermark && (
                    <div className="absolute top-3 right-3 text-[10px] font-industrial font-black tracking-widest text-orange-600/40 bg-black/40 px-1 border border-orange-950/20">
                      SYCO23 // V4
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 text-[8px] font-mono-telemetry text-zinc-500 bg-black/70 p-1 border border-zinc-900">
                    HUD MODE: {builderConfig.overlayMode}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* VIEW: DIAGNOSTICS BOARD */}
          {view === 'diagnostics' && (
            <div className="flex-1 plate-outer border border-zinc-900 p-4 flex flex-col space-y-4 overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div>
                  <h2 className="text-lg font-industrial font-black tracking-widest text-zinc-200">SYCO23 TELEMETRY CORE & DIAGNOSTICS</h2>
                  <p className="text-xs text-zinc-500">Complete breakdown of network packet buffers, frame timings, and socket logs.</p>
                </div>
                <button 
                  onClick={() => setLogs(INITIAL_LOGS)}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1 text-xs font-mono-telemetry text-zinc-400 flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>FLUSH LOG BUFFER</span>
                </button>
              </div>

              {/* STATS DECK */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-zinc-950 p-3 border border-zinc-900">
                  <span className="text-[9px] font-mono-telemetry text-zinc-500">UPTIME TRANSMISSION</span>
                  <div className="text-xl font-industrial font-black tracking-wider text-teal-400">
                    {isLive ? '02:44:19 STABLE' : 'OFFLINE'}
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 border border-zinc-900">
                  <span className="text-[9px] font-mono-telemetry text-zinc-500">BONDED BANDWIDTH CAPACITY</span>
                  <div className="text-xl font-industrial font-black tracking-wider text-zinc-200">
                    11.2 Gbps / 12.0 Gbps
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 border border-zinc-900">
                  <span className="text-[9px] font-mono-telemetry text-zinc-500">PACKET RE-TRANSMISSIONS</span>
                  <div className="text-xl font-industrial font-black tracking-wider text-emerald-400">
                    0.002% (OPTIMAL)
                  </div>
                </div>
                <div className="bg-zinc-950 p-3 border border-zinc-900">
                  <span className="text-[9px] font-mono-telemetry text-zinc-500">BUFFER JITTER DEVIATION</span>
                  <div className="text-xl font-industrial font-black tracking-wider text-orange-500">
                    2.4ms (LOW)
                  </div>
                </div>
              </div>

              {/* EXTENDED DIAGNOSTICS LOGGER */}
              <div className="flex-1 bg-black border border-zinc-900 p-3 flex flex-col font-mono-telemetry text-xs overflow-hidden">
                <div className="text-[10px] text-zinc-500 border-b border-zinc-900 pb-1 mb-2">
                  FULL UNBOUNDED CONSOLE STDOUT LOG
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 select-text">
                  {logs.map((log) => (
                    <div key={log.id} className="text-zinc-400 leading-normal flex">
                      <span className="text-zinc-600 shrink-0 mr-2">[{log.time}]</span>
                      <span className="text-orange-700 font-bold shrink-0 mr-2">[{log.src}]</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                  <div className="text-zinc-600 italic">--- Buffer endpoint reached. End of file matrix ---</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* RITUAL TRANSMISSION KIT SLIDE-OUT DRAWER (RIGHT ALIGNED) */}
      {showDrawer && selectedPlatform && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-end">
          {/* Drawer backdrop tap close handler */}
          <div className="flex-1" onClick={() => setShowDrawer(false)} />
          
          <div className="w-full max-w-md bg-[#121315] border-l border-zinc-800 p-5 flex flex-col h-full shadow-2xl relative select-none">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <h2 className="text-sm font-industrial font-black tracking-widest text-zinc-100">
                  TRANSMISSION KIT: {selectedPlatform.name}
                </h2>
              </div>
              <button 
                onClick={() => setShowDrawer(false)}
                className="p-1 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono-telemetry mb-4 leading-relaxed">
              Use these precise hardware endpoints inside your local hardware encoder deck (OBS, vMix, DeckLink or TriCaster Matrix). Keep stream keys strictly secure.
            </p>

            {/* KEY CREDENTIALS MODULE */}
            <div className="space-y-4 font-mono-telemetry text-xs flex-1">
              {/* PRIMARY SERVER INGEST */}
              <div className="flex flex-col space-y-1.5 bg-[#17191d] p-3 border border-zinc-900">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500">PRIMARY RTMP/RTMPS ENDPOINT</span>
                  <span className="text-[9px] text-teal-500 font-bold">SECURE CHANNEL</span>
                </div>
                <div className="flex items-center space-x-2 bg-black/80 p-2 border border-zinc-900">
                  <span className="text-zinc-300 font-bold text-[11px] truncate flex-1">{selectedPlatform.url}</span>
                  <button 
                    onClick={() => handleCopy(selectedPlatform.url)}
                    className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                    title="Copy Endpoint"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* PRIVATE STREAM KEY */}
              <div className="flex flex-col space-y-1.5 bg-[#17191d] p-3 border border-zinc-900">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500">STREAMING KEY (OUTBOUND AUTHORIZATION)</span>
                  <span className="text-[9px] text-red-500 font-bold">STRICTLY PRIVATE</span>
                </div>
                <div className="flex items-center space-x-2 bg-black/80 p-2 border border-zinc-900">
                  <span className="text-zinc-300 font-bold text-[11px] truncate flex-1 select-all">{selectedPlatform.key}</span>
                  <button 
                    onClick={() => handleCopy(selectedPlatform.key)}
                    className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                    title="Copy Stream Key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* HARDWARE ENCODER MATRIX SETTING RECOMMENDATIONS */}
              <div className="border border-zinc-900 bg-zinc-950 p-3 space-y-2">
                <div className="text-[10px] text-zinc-400 border-b border-zinc-900 pb-1">
                  RECOMMENDED HARDWARE DECK PARAMS
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                  <div>
                    <span className="text-zinc-500">VIDEO CODEC:</span>
                    <span className="text-zinc-300 ml-1">H.264 High Profile</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">AUDIO CODEC:</span>
                    <span className="text-zinc-300 ml-1">AAC-LC Stereo</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">KEYFRAME GAP:</span>
                    <span className="text-zinc-300 ml-1">2.0 seconds</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">RATE CONTROL:</span>
                    <span className="text-zinc-300 ml-1">CBR (Constant Bitrate)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Close action bottom panel */}
            <div className="mt-auto border-t border-zinc-900 pt-3">
              <button
                onClick={() => setShowDrawer(false)}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono-telemetry font-bold text-zinc-300 border border-zinc-800"
              >
                DISMISS CONFIGURATION PANEL
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CORE CHASSIS HARDWARE FEET / MOUNT DECK BOTTOM ROW */}
      <footer className="plate-outer border-t border-zinc-900 p-2 px-4 flex justify-between items-center text-[10px] font-mono-telemetry text-zinc-600 select-none mt-auto">
        <div className="flex items-center space-x-4">
          <span>CONSOLE HARDWARE: DECK_UNIT_09</span>
          <span className="hidden sm:inline">MATRIX POWER BONDING: ON</span>
          <span className="hidden md:inline">TEMPERATURE SENSORS: NOMINAL</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          <span>STABLE INGEST CONNECTED</span>
        </div>
      </footer>
    </div>
  );
}