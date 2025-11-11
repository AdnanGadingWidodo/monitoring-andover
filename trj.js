'use strict';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    SCALE: 3,                    // pixels per meter
    MARGIN: 40,                  // canvas margin for axes
    MIN_DISTANCE: 1,             // minimum distance to record (meters)
    MIN_TIME_BETWEEN: 1000,      // minimum time between updates (ms)
    EARTH_RADIUS: 6371000,       // Earth radius in meters
    GPS_TIMEOUT: 15000,          // GPS timeout (ms)
    AUTO_RETRY_DELAY: 3000,      // Auto retry delay on error (ms)
    GRID_SIZES: [1, 2, 5, 10, 20, 50, 100], // Grid spacing options
};

// ============================================
// GLOBAL STATE
// ============================================
const state = {
    canvas: null,
    ctx: null,
    watchId: null,
    originGPS: null,
    path: [],
    totalDistance: 0,
    startTime: null,
    lastUpdateTime: 0,
    pixelsPerMeter: CONFIG.SCALE,
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    // Get canvas
    state.canvas = document.getElementById('canvas');
    state.ctx = state.canvas.getContext('2d');
    
    // Setup canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Start GPS tracking automatically
    console.log('%c🛰️ GPS Tracker Initialized', 'color: #0f0; font-size: 14px; font-weight: bold');
    console.log('%c📍 Auto-starting GPS tracking...', 'color: #0af; font-size: 12px');
    
    setTimeout(startTracking, 500);
    
    // Request wake lock
    requestWakeLock();
}

function resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    const size = Math.min(container.clientWidth, container.clientHeight) - 20;
    state.canvas.width = size;
    state.canvas.height = size;
    updateScaleInfo();
    drawCanvas();
}

// ============================================
// GPS FUNCTIONS
// ============================================
function startTracking() {
    if (!navigator.geolocation) {
        updateStatus('❌ GPS not supported', 'error', 'Not Supported');
        console.error('Geolocation not supported');
        return;
    }

    updateStatus('📡 Searching GPS signal...', 'searching', 'Searching');
    
    state.watchId = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
            enableHighAccuracy: true,
            timeout: CONFIG.GPS_TIMEOUT,
            maximumAge: 0
        }
    );
}

function handlePosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const acc = position.coords.accuracy;
    const speed = (position.coords.speed || 0) * 3.6; // m/s to km/h
    const timestamp = Date.now();

    // Set origin on first position
    if (!state.originGPS) {
        state.originGPS = { lat, lon };
        state.startTime = timestamp;
        
        document.getElementById('originInfo').style.display = 'block';
        document.getElementById('originLat').textContent = `Lat: ${lat.toFixed(6)}`;
        document.getElementById('originLon').textContent = `Lon: ${lon.toFixed(6)}`;
        
        updateStatus('✅ GPS Locked! Tracking...', 'locked', 'Tracking');
        
        console.log('%c✅ GPS Locked!', 'color: #0f0; font-weight: bold');
        console.log(`Origin set at: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    }

    // Check if enough distance/time elapsed
    if (state.path.length > 0) {
        const last = state.path[state.path.length - 1];
        const dist = calculateDistance(last.lat, last.lon, lat, lon);
        const timeDiff = timestamp - state.lastUpdateTime;
        
        if (dist < CONFIG.MIN_DISTANCE && timeDiff < CONFIG.MIN_TIME_BETWEEN) {
            return; // Skip update
        }
        
        if (dist >= CONFIG.MIN_DISTANCE) {
            state.totalDistance += dist;
        }
    }

    state.lastUpdateTime = timestamp;

    // Convert to XY
    const xy = gpsToXY(lat, lon);
    
    // Add to path
    state.path.push({
        x: xy.x,
        y: xy.y,
        lat,
        lon,
        timestamp,
        accuracy: acc,
        speed
    });

    // Log to console (for debugging/data capture)
    console.log(`Point ${state.path.length}: X=${xy.x.toFixed(2)}m, Y=${xy.y.toFixed(2)}m, Speed=${speed.toFixed(1)}km/h`);

    // Update UI
    updateInfo(xy, acc, speed, timestamp);
    
    // Redraw canvas
    drawCanvas();
}

function handleError(error) {
    let message = '';
    let statusText = '';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = '❌ GPS Permission Denied';
            statusText = 'Permission Denied';
            console.error('GPS Permission denied by user');
            break;
        case error.POSITION_UNAVAILABLE:
            message = '❌ GPS Unavailable';
            statusText = 'Unavailable';
            console.error('GPS position unavailable');
            break;
        case error.TIMEOUT:
            message = '⏱️ GPS Timeout - Retrying...';
            statusText = 'Timeout';
            console.warn('GPS timeout, auto-retrying...');
            // Auto retry
            setTimeout(startTracking, CONFIG.AUTO_RETRY_DELAY);
            return;
        default:
            message = '❌ GPS Error';
            statusText = 'Error';
            console.error('GPS error:', error.message);
    }
    
    updateStatus(message, 'error', statusText);
}

// ============================================
// COORDINATE CONVERSION
// ============================================
function gpsToXY(lat, lon) {
    if (!state.originGPS) return { x: 0, y: 0 };
    
    const dLat = lat - state.originGPS.lat;
    const dLon = lon - state.originGPS.lon;
    
    const x = dLon * (Math.PI / 180) * CONFIG.EARTH_RADIUS * 
              Math.cos(state.originGPS.lat * Math.PI / 180);
    const y = dLat * (Math.PI / 180) * CONFIG.EARTH_RADIUS;
    
    return { x, y };
}

function xyToCanvas(x, y) {
    const canvasX = CONFIG.MARGIN + (x * state.pixelsPerMeter);
    const canvasY = state.canvas.height - CONFIG.MARGIN - (y * state.pixelsPerMeter);
    return { canvasX, canvasY };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) ** 2;
    
    return CONFIG.EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ============================================
// DRAWING FUNCTIONS
// ============================================
function drawCanvas() {
    const ctx = state.ctx;
    const canvas = state.canvas;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw components
    drawGrid();
    drawAxes();
    drawOrigin();
    
    if (state.path.length > 0) {
        drawPath();
    }
}

function drawGrid() {
    const ctx = state.ctx;
    const canvas = state.canvas;
    const spacing = getGridSpacing();
    
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = '#333';
    
    const maxView = (canvas.width - CONFIG.MARGIN * 2) / state.pixelsPerMeter;
    
    // Vertical lines (X)
    for (let x = 0; x <= maxView; x += spacing) {
        const coords = xyToCanvas(x, 0);
        if (coords.canvasX < CONFIG.MARGIN || coords.canvasX > canvas.width - CONFIG.MARGIN) continue;
        
        ctx.beginPath();
        ctx.moveTo(coords.canvasX, CONFIG.MARGIN);
        ctx.lineTo(coords.canvasX, canvas.height - CONFIG.MARGIN);
        ctx.stroke();
        
        if (coords.canvasX > CONFIG.MARGIN + 15) {
            ctx.fillText(`${x}`, coords.canvasX - 8, canvas.height - CONFIG.MARGIN + 12);
        }
    }
    
    // Horizontal lines (Y)
    for (let y = 0; y <= maxView; y += spacing) {
        const coords = xyToCanvas(0, y);
        if (coords.canvasY < CONFIG.MARGIN || coords.canvasY > canvas.height - CONFIG.MARGIN) continue;
        
        ctx.beginPath();
        ctx.moveTo(CONFIG.MARGIN, coords.canvasY);
        ctx.lineTo(canvas.width - CONFIG.MARGIN, coords.canvasY);
        ctx.stroke();
        
        if (coords.canvasY < canvas.height - CONFIG.MARGIN - 10) {
            ctx.fillText(`${y}`, 5, coords.canvasY + 3);
        }
    }
}

function drawAxes() {
    const ctx = state.ctx;
    const canvas = state.canvas;
    const origin = xyToCanvas(0, 0);
    
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(origin.canvasX, CONFIG.MARGIN);
    ctx.lineTo(origin.canvasX, canvas.height - CONFIG.MARGIN);
    ctx.stroke();
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(CONFIG.MARGIN, origin.canvasY);
    ctx.lineTo(canvas.width - CONFIG.MARGIN, origin.canvasY);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Y (N)', 5, 20);
    ctx.fillText('X (E)', canvas.width - 45, canvas.height - 8);
}

function drawOrigin() {
    const ctx = state.ctx;
    const origin = xyToCanvas(0, 0);
    
    // Circle
    ctx.beginPath();
    ctx.arc(origin.canvasX, origin.canvasY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff0';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#ff0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('(0,0)', origin.canvasX + 12, origin.canvasY - 5);
}

function drawPath() {
    const ctx = state.ctx;
    
    // Draw line
    ctx.beginPath();
    state.path.forEach((p, i) => {
        const coords = xyToCanvas(p.x, p.y);
        if (i === 0) {
            ctx.moveTo(coords.canvasX, coords.canvasY);
        } else {
            ctx.lineTo(coords.canvasX, coords.canvasY);
        }
    });
    ctx.strokeStyle = '#0af';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    // Draw points
    state.path.forEach((p, i) => {
        const coords = xyToCanvas(p.x, p.y);
        const isLast = i === state.path.length - 1;
        
        ctx.beginPath();
        ctx.arc(coords.canvasX, coords.canvasY, isLast ? 8 : 3, 0, 2 * Math.PI);
        
        if (isLast) {
            // Current position
            ctx.fillStyle = '#f00';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Coordinate label
            ctx.fillStyle = '#f00';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(`(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`, 
                coords.canvasX + 12, coords.canvasY - 8);
            
            // Direction arrow
            if (state.path.length > 1) {
                const prev = state.path[state.path.length - 2];
                const prevCoords = xyToCanvas(prev.x, prev.y);
                const angle = Math.atan2(coords.canvasY - prevCoords.canvasY,
                                        coords.canvasX - prevCoords.canvasX);
                
                ctx.save();
                ctx.translate(coords.canvasX, coords.canvasY);
                ctx.rotate(angle);
                
                ctx.beginPath();
                ctx.moveTo(15, 0);
                ctx.lineTo(10, -5);
                ctx.lineTo(10, 5);
                ctx.closePath();
                ctx.fillStyle = '#f00';
                ctx.fill();
                
                ctx.restore();
            }
        } else {
            // Path points
            ctx.fillStyle = '#0f0';
            ctx.fill();
        }
    });
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================
function updateInfo(xy, accuracy, speed, timestamp) {
    document.getElementById('pointCount').textContent = state.path.length;
    document.getElementById('distance').textContent = state.totalDistance.toFixed(2) + ' m';
    document.getElementById('xPos').textContent = xy.x.toFixed(2) + ' m';
    document.getElementById('yPos').textContent = xy.y.toFixed(2) + ' m';
    document.getElementById('accuracy').textContent = accuracy.toFixed(1) + ' m';
    document.getElementById('speed').textContent = speed.toFixed(1) + ' km/h';
    
    // Update time
    if (state.startTime) {
        const elapsed = Math.floor((timestamp - state.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateStatus(message, type, statusValue) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status-${type}`;
    
    if (type === 'searching') {
        statusDiv.classList.add('searching');
    }
    
    document.getElementById('statusValue').textContent = statusValue;
}

function updateScaleInfo() {
    const viewRange = (state.canvas.width - CONFIG.MARGIN * 2) / state.pixelsPerMeter;
    document.getElementById('scaleValue').textContent = getGridSpacing() + 'm/div';
    document.getElementById('viewRange').textContent = 
        `${viewRange.toFixed(0)}m × ${viewRange.toFixed(0)}m`;
}

function getGridSpacing() {
    const viewRange = (state.canvas.width - CONFIG.MARGIN * 2) / state.pixelsPerMeter;
    
    for (let i = CONFIG.GRID_SIZES.length - 1; i >= 0; i--) {
        if (viewRange / CONFIG.GRID_SIZES[i] >= 4) {
            return CONFIG.GRID_SIZES[i];
        }
    }
    
    return CONFIG.GRID_SIZES[0];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            const wakeLock = await navigator.wakeLock.request('screen');
            console.log('✅ Wake lock activated');
        }
    } catch (err) {
        console.log('Wake lock not available');
    }
}

// Reacquire wake lock on visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.watchId) {
        requestWakeLock();
    }
});

// ============================================
// CONSOLE DATA ACCESS
// ============================================
// Export data to console for manual access
window.getTrackingData = function() {
    if (state.path.length === 0) {
        console.warn('No tracking data available');
        return null;
    }
    
    const data = {
        origin: state.originGPS,
        totalDistance: state.totalDistance,
        totalPoints: state.path.length,
        duration: state.startTime ? (Date.now() - state.startTime) / 1000 : 0,
        points: state.path
    };
    
    console.log('%c📊 Tracking Data:', 'color: #0af; font-weight: bold');
    console.table(data.points.map(p => ({
        'X (m)': p.x.toFixed(3),
        'Y (m)': p.y.toFixed(3),
        'Lat': p.lat.toFixed(6),
        'Lon': p.lon.toFixed(6),
        'Speed (km/h)': p.speed.toFixed(1),
        'Accuracy (m)': p.accuracy.toFixed(1)
    })));
    
    return data;
};

// Export CSV to console
window.exportCSV = function() {
    if (state.path.length === 0) {
        console.warn('No data to export');
        return;
    }
    
    const csv = [
        'x_meters,y_meters,latitude,longitude,accuracy,speed,timestamp',
        ...state.path.map(p => 
            `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.lat},${p.lon},${p.accuracy},${p.speed},${new Date(p.timestamp).toISOString()}`
        )
    ].join('\n');
    
    console.log('%c📄 CSV Data (copy below):', 'color: #0af; font-weight: bold');
    console.log(csv);
    
    return csv;
};

console.log('%cℹ️ Data Access Commands:', 'color: #fa0; font-weight: bold');
console.log('  getTrackingData() - View tracking data');
console.log('  exportCSV() - Export as CSV');

// ============================================
// START APPLICATION
// ============================================
window.addEventListener('load', init);