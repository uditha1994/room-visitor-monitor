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
    label: [],
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
});

function setupFirebaseListeners() {
    //listen for real-time updates
    database.ref('roomCounter').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            isDataLoaded = true;
        }
    }, (error) => {
        console.error('Firebase Error: ', error);
    });

    //Listen for Activity log
    database.ref('roomCounter/logs').limitToLast(10).on('value', (snapshot) => {
        const logs = snapshot.val();
        if (logs) {

        }
    })

    //handle connection state
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        updateConnectionStatus(connected);
    })
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.className = 'connection-status connected';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i> Connected';
    } else {
        statusElement.className = 'connection-status disconnected';
        statusElement.innerHTML = '<i class="fas fa-wifi"></i>Disconnected';
    }
}