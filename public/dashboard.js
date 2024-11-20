import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDypcHCrpqFsBQULOwAPTdw_L2bvU_ssc4",
    authDomain: "delivoo-ex.firebaseapp.com",
    databaseURL: "https://delivoo-ex-default-rtdb.firebaseio.com",
    projectId: "delivoo-ex",
    storageBucket: "delivoo-ex.firebasestorage.app",
    messagingSenderId: "441132716224",
    appId: "1:441132716224:web:03bdd830b2af05c5275d25",
    measurementId: "G-M0ZB0MYPYV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

let redirecting = false; // Prevents double redirects

// Authentication state listener
onAuthStateChanged(auth, (user) => {
    if (!user && !redirecting) {
        console.log("User not logged in.");
        redirecting = true;
        setTimeout(() => {
            window.location.href = 'loading.html';
        }, 500);
    } else if (user) {
        console.log("User logged in:", user);
        redirecting = false;
        fetchUserInfo(); // Fetch and display the username
        fetchOrderHistory();
    }
});

// Fetch user info (username) from Firestore
async function fetchUserInfo() {
    const user = auth.currentUser;
    if (!user) {
        console.error("User is not logged in.");
        return;
    }

    try {
        // Fetch user document from Firestore 'users' collection
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Display the username in the element with id 'username'
            document.getElementById("username").innerText = `Hello, ${userData.username}!`;
        } else {
            console.log("No user data found.");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

// Fetch order history from Firebase
async function fetchOrderHistory(dateFilter = '', statusFilter = 'all', paymentFilter = 'all') {
    const user = auth.currentUser;
    if (!user) {
        console.error("User is not logged in.");
        return;
    }

    let ordersRef = collection(firestore, "orders");
    let filters = [where("userId", "==", user.uid)]; // Filter orders for logged-in user

    // Apply date filter (e.g., orders from a specific day)
    if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);

        filters.push(where("date", ">=", startOfDay));
        filters.push(where("date", "<=", endOfDay));
    }

    if (statusFilter !== 'all') {
        filters.push(where("statusFilter", "==", statusFilter));
    }

    if (paymentFilter !== 'all') {
        filters.push(where("paymentType", "==", paymentFilter));
    }

    const ordersQuery = query(ordersRef, ...filters);

    try {
        const snapshot = await getDocs(ordersQuery);

        // Initialize counters
        let totalOrders = 0;
        let completedOrders = 0;
        let pendingOrders = 0;

        // Clear the table body
        const tbody = document.getElementById("orderHistoryBody");
        tbody.innerHTML = "";

        snapshot.forEach((doc) => {
            const order = doc.data();
            totalOrders++;
            if (order.statusFilter === "completed") completedOrders++;
            if (order.statusFilter === "ongoing") pendingOrders++;

            const row = `<tr>
                <td>${order.orderID}</td>
                <td>${order.date.toDate().toLocaleDateString()}</td>
                <td>${order.receiverName}</td>
                <td>${order.deliveryAddress}</td>
                <td>${order.orderItem}</td>
                <td>${order.reciverPhone}</td>
                <td>${order.orderAmount}</td>
                <td>${order.paymentType}</td>
                <td>${order.statusFilter}</td>
            </tr>`;
            tbody.innerHTML += row;
        });

        // Update counters on the UI
        document.getElementById("totalOrders").querySelector("p").innerText = totalOrders;
        document.getElementById("completedOrders").querySelector("p").innerText = completedOrders;
        document.getElementById("pendingOrders").querySelector("p").innerText = pendingOrders;

    } catch (error) {
        console.error("Error fetching orders:", error);
        alert("Failed to fetch order history.");
    }
}

// DOM Content Loaded event listener
document.addEventListener('DOMContentLoaded', () => {
    const filterButton = document.getElementById("filter-section");
    if (filterButton) {
        filterButton.addEventListener("click", applyFilters);
    } else {
        console.warn("Element with ID 'filter-section' not found.");
    }

    function applyFilters() {
        const dateFilter = document.getElementById("dateFilter").value;
        const statusFilter = document.getElementById("statusFilter").value;
        const paymentFilter = document.getElementById("paymentFilter").value;

        if (dateFilter) {
            fetchOrderHistory(dateFilter, statusFilter, paymentFilter);
        } else {
            fetchOrderHistory('', statusFilter, paymentFilter); // Pass empty string if no date is selected
        }
    }

    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-menu");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });

        document.querySelectorAll(".nav-links").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
        }));
    } else {
        console.warn("Hamburger menu elements not found.");
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            signOut(auth).then(() => {
                alert("You have been logged out.");
                window.location.href = "login.html";
            }).catch((error) => {
                console.error("Error during logout:", error);
            });
        });
    } else {
        console.warn("Logout button not found.");
    }
});

// Dropdown menu
document.getElementById('sidebarDropdown').addEventListener('change', function() {
    const selectedValue = this.value;

    if (selectedValue) {
        localStorage.setItem('sidebarSelection', selectedValue);
    }

    if (selectedValue) {
        let url;
        switch (selectedValue) {
            case 'user_dashboard':
                url = 'user_dashboard.html';
                break;
            case 'new_order':
                url = 'new_order.html';
                break;
            case 'account':
                url = 'account.html';
                break;
            default:
                url = '#';
                break;
        }
        window.location.href = url;
    }
});

// On page load, check if there is a stored selection and set it
window.addEventListener('load', () => {
    const storedSelection = localStorage.getItem('sidebarSelection');
    if (storedSelection) {
        const dropdown = document.getElementById('sidebarDropdown');
        dropdown.value = storedSelection;
    }
});
