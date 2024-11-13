import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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

// Authentication state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user);
        fetchOrderHistory(); // Fetch the orders once the user is authenticated
    } else {
        console.log("User not logged in.");
        window.location.href = 'login.html'; // Redirect to login page if not authenticated
    }
});

// Fetch order history from Firebase
async function fetchOrderHistory(dateFilter = '', statusFilter = 'all', paymentFilter = 'all') {
    const user = auth.currentUser;
    if (!user) {
        console.error("User is not logged in.");
        return;
    }

    let ordersRef = collection(firestore, "orders");
    let filters = [where("userId", "==", user.uid)]; // Add user ID filter

    if (dateFilter) {
        const dateTimestamp = new Date(dateFilter);
        filters.push(where("date", "==", dateTimestamp));
    }
    if (statusFilter !== 'all') {
        filters.push(where("statusFilter", "==", statusFilter));
    }
    if (paymentFilter !== 'all') {
        filters.push(where("paymentType", "==", paymentFilter));
    }

    const ordersQuery = query(ordersRef, ...filters);
    const snapshot = await getDocs(ordersQuery);

    let totalOrders = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    const tbody = document.getElementById("orderHistoryBody");
    tbody.innerHTML = ""; // Clear table body

    snapshot.forEach((doc) => {
        const order = doc.data();
        const orderDate = order.date ? order.date.toDate().toLocaleDateString() : 'N/A';

        totalOrders++;
        if (order.statusFilter === "completed") completedOrders++;
        if (order.statusFilter === "ongoing") pendingOrders++;

        const row = `<tr>
            <td>${order.orderID}</td>
            <td>${orderDate}</td>
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

    document.getElementById("totalOrders").querySelector("p").innerText = totalOrders;
    document.getElementById("completedOrders").querySelector("p").innerText = completedOrders;
    document.getElementById("pendingOrders").querySelector("p").innerText = pendingOrders;
}

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

        fetchOrderHistory(dateFilter, statusFilter, paymentFilter);
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

    document.getElementById("logout-btn").addEventListener("click", () => {
        signOut(auth).then(() => {
            alert("You have been logged out.");
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("Error during logout:", error);
        });
    });
});
