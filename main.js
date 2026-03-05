const firebaseConfig = {
    apiKey: "AIzaSyAmCKAQRonqoTghpXobUBDjOcAdtpRMhvc",
    authDomain: "room-visitor-count.firebaseapp.com",
    databaseURL: "https://room-visitor-count-default-rtdb.firebaseio.com",
    projectId: "room-visitor-count",
    storageBucket: "room-visitor-count.firebasestorage.app",
    messagingSenderId: "1039248663987",
    appId: "1:1039248663987:web:0b9c0bff1f56c840d717c6"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

//chart variable
let activityChart = null;
let chartInitialized = false;
let chartData = {
    labels: [],
    entries: [],
    exits: [],
    currentCount: []
}

//activity data store
let activityHistory = [];
let isDataLoaded = false;

//initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
    setupFirebaseListeners();
    refreshData();

    setTimeout(() => {
        initializeChart();
    }, 1000)
});

function initializeChart() {
    const canvas = document.getElementById('activityChart');
    const ctx = canvas.getContext('2d');

    //clear existing chart
    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'People Inside',
                    data: chartData.currentCount,
                    borderColor: '#4299e1',
                    backgroundColor: 'rgba(66,153,255,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Entries',
                    data: chartData.entries,
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72,187,120,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }, {
                    label: 'Exits',
                    data: chartData.exits,
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245,101,101,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 1,
                        color: '#718096'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#718096'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    chartInitialized = true;
    hideChartLoading();
}

function setupFirebaseListeners() {
    //listen for real-time updates
    database.ref('roomCounter').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateDashboard(data);
            updateConnectionStatus(true);
            isDataLoaded = true;
        }
    }, (error) => {
        console.error('Firebase Error: ', error);
    });

    //Listen for Activity log
    database.ref('roomCounter/logs').limitToLast(10).on('value', (snapshot) => {
        const logs = snapshot.val();
        if (logs) {
            updateActivityLog(logs);
            updateChartWithLogs(logs);
        }
    })

    //handle connection state
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        updateConnectionStatus(connected);
    })
}

function updateDashboard(data) {
    //update statistics
    animateNumber('currentCount', data.currentCount || 0);
    animateNumber('totalEntries', data.totalEntries || 0);
    animateNumber('totalExits', data.totalExits || 0);

    //update device status
    const deviceStatus = document.getElementById('deviceStatus');
    if (data.status === 'online') {
        deviceStatus.className = 'status-indicator status-online';
    } else {
        deviceStatus.className = 'status-indicator status-offline';
    }

    //update last seen
    if (data.lastSeen) {
        const lastUpdate = new Date(parseInt(data.lastSeen) * 1000);
        document.getElementById('lastUpdate').textContent =
            lastUpdate.toLocaleString();
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;

    if (currentValue === targetValue) return;

    const increment = targetValue > currentValue ? 1 : -1;
    const duration = 500;
    const steps = Math.abs(targetValue - currentValue);
    const stepDuration = Math.max(duration / steps, 50);

    let current = currentValue;
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;

        if (current === targetValue) {
            clearInterval(timer);
        }
    }, stepDuration);
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.className = 'connection-status connected';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
    } else {
        statusElement.className = 'connection-status disconnected';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i> Disconnected';
    }
}

function updateActivityLog(logs) {
    const logContainer = document.getElementById('activityLog');
    const logArray = Object.entries(logs).map(([key, value]) => ({
        ...value,
        id: key
    })).sort((a, b) => b.timestamp - a.timestamp);

    if (logArray.length === 0) {
        logContainer.innerHTML =
            `<div class="text-center text-muted">
            <i class="fas fa-histrory fa-2x mb-2"></i> No recent activity
        </div>`;
        return;
    }

    logContainer.innerHTML = '';
    logArray.forEach(log => {
        const logItem = createLogItem(log);
        logContainer.appendChild(logItem);
    });
}

function createLogItem(log) {
    const div = document.createElement('div');
    div.className = `log-item ${log.type}`;

    const timestamp = new Date(parseInt(log.timestamp) * 1000);
    const timeString = timestamp.toLocaleTimeString();
    const dateString = timestamp.toLocaleDateString();

    div.innerHTML = `
        <div class="log-icon ${log.type}">
            <i class="fas fa-${log.type === 'entry' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
        </div>
        <div class="log-content">
            <div class="log-type">${log.type === 'entry' ? 'Person Entered' :
            'Person Exited'}</div>
            <div class="log-time">${timeString} - ${dateString}</div>
            <div class="log-time">Current Count: ${log.currentCount || 0}</div>
        </div>
    `;
    return div;
}

function updateChartWithLogs(logs) {
    if (!chartInitialized || !activityChart) return;

    const logArray = Object.entries(logs).map(([key, value]) => ({
        ...value,
        id: key
    })).sort((a, b) => b.timestamp - a.timestamp);

    //clear existing data
    chartData.labels = [];
    chartData.entries = [];
    chartData.exits = [];
    chartData.currentCount = [];

    let entryCount = 0;
    let exitCount = 0;

    logArray.forEach((log, index) => {
        const timestamp = new Date(parseInt(log.timestamp) * 1000);
        const timeLabel = timestamp.getHours() + ":"
            + String(timestamp.getMinutes).padStart(2, '0');

        if (log.type === 'entry') {
            entryCount++;
        } else if (log.type === 'exit') {
            exitCount++;
        }

        if (index % 3 === 0 || index === logArray.length - 1) {
            chartData.labels.push(timeLabel);
            chartData.entries.push(entryCount);
            chartData.exits.push(exitCount);
            chartData.currentCount.push(log.current || 0);
        }
    });

    //show no data message
    if (chartData.labels.length === 0) {
        showChartNoData();
    } else {
        hideChartNoData();
        showChart();
        activityChart.update('none');
    }
}

function showChartLoading() {
    document.getElementById('chartLoading').style.display = 'block';
    document.getElementById('chartNoData').style.display = 'none';
    document.getElementById('activityChart').style.display = 'none';
}

function hideChartLoading() {
    document.getElementById('chartLoading').style.display = 'none';
}

function showChartNoData() {
    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('chartNoData').style.display = 'block';
    document.getElementById('activityChart').style.display = 'none';
}

function hideChartNoData() {
    document.getElementById('chartNoData').style.display = 'none';
}

function showChart() {
    document.getElementById('chartLoading').style.display = 'none';
    document.getElementById('chartNoData').style.display = 'none';
    document.getElementById('activityChart').style.display = 'block';
}

function refreshData() {
    showChartLoading();

    //refresh data from firebase
    database.ref('roomCounter').once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateDashboard(data);
        }

    }).catch((error) => {
        console.error("Error refreshing data: ", error);
        hideChartLoading();
        showChartNoData();
    });

    //refresh logs
    database.ref('roomCounter/logs').limitToLast(20).once('value').then((snapshot) => {
        const logs = snapshot.val();
        if (logs) {
            updateActivityLog(logs);
            updateChartWithLogs(logs);
        } else {
            hideChartLoading();
            showChartNoData();
        }

    }).catch((error) => {
        console.error("Error refreshing logs: ", error);
        hideChartLoading();
        showChartNoData();
    });
}

//Auto rerefresh 
setInterval(() => {
    if (isDataLoaded) {
        refreshData();
    }
}, 1000 * 30);