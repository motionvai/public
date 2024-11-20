import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';

import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

import { getFirestore, collection, query, where, getDocs, getDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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
const db = firestore;
// Firestore collections
const ordersCollection = collection(firestore, "orders");
const ridersCollection = collection(firestore, "career_user");

// DOM elements
const orderHistoryBody = document.getElementById("orderHistoryBody");
const orderIdFilterInput = document.getElementById("orderIdFilterInput"); // Filter input field


/**
 * Fetches username from Firestore for a given userId.
 * @param {string} userId - The UID of the user whose username is to be fetched.
 * @returns {Promise<string>} - Returns the username if found, or 'N/A' if not.
 */
async function fetchUsername(userId) {
    try {
        const userDocRef = doc(firestore, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.username || "N/A"; // Return username or 'N/A' if the username field is missing
        } else {
            console.warn(`No user data found for userId: ${userId}`);
            return "N/A"; // Return 'N/A' if user document does not exist
        }
    } catch (error) {
        console.error(`Error fetching username for userId: ${userId}`, error);
        return "N/A"; // Return 'N/A' in case of an error
    }
}


// Fetch and display data


const fetchAndDisplayOrders = async () => {
    try {
        // Fetch orders and riders data
        const ordersSnapshot = await getDocs(ordersCollection);
        const ridersSnapshot = await getDocs(ridersCollection);

        // Parse data into arrays
        const orders = [];
        ordersSnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        const riders = [];
        ridersSnapshot.forEach((doc) => {
            const riderData = doc.data();
            if (riderData.name) {
                riders.push(riderData.name); // Add rider name if it exists
            } else {
                console.warn(`Rider document ${doc.id} is missing the 'name' field.`);
            }
        });

        // Get filter input value
        const filterText = orderIdFilterInput.value.toLowerCase();

        // Filter orders based on input
        const filteredOrders = orders.filter(order => {
            return order.orderID && order.orderID.toLowerCase().includes(filterText);
        });

        // Sort orders by date in descending order (newest first)
        filteredOrders.sort((a, b) => {
            const dateA = new Date(a.date.seconds * 1000);
            const dateB = new Date(b.date.seconds * 1000);
            return dateB - dateA; // Sort by date in descending order
        });

        // Populate the table with filtered and sorted data
        orderHistoryBody.innerHTML = ""; // Clear existing rows
        for (const order of filteredOrders) {
            // Check if userId exists, else default to "N/A"
            const username = order.userId
                ? await fetchUsername(order.userId)
                : "N/A";

            const row = document.createElement("tr");

            // Safely access order details
            const receiverName = order.receiverName || "N/A";
            const reciverPhone = order.reciverPhone || "N/A";
            const deliveryAddress = order.deliveryAddress || "N/A";
            const deliveryMap = order.deliveryMap || "#";
            const orderItem = order.orderItem || "N/A";
            const orderAmount = order.orderAmount || "N/A";
            const paymentType = order.paymentType || "N/A";
            const statusFilter = order.statusFilter || "N/A";
            const pickupAddress = order.pickupAddress || "N/A";
            const boxSize = order.boxSize || "N/A";
            const orderWeight = order.orderWeight || "N/A";

            row.innerHTML = `
                <td>${order.orderID || "N/A"}</td>
                <td>${username}</td>
                
                <td>${new Date(order.date.seconds * 1000).toLocaleString("en-US", {
                    year: "numeric", 
                    month: "short", 
                    day: "numeric", 
                    hour: "2-digit", 
                    minute: "2-digit", 
                    hour12: true 
                })}</td>
                
                <td>
                    <strong>Name:</strong> ${receiverName}<br>
                    <strong>Phone:</strong> ${reciverPhone}<br>
                    <strong>Address:</strong> ${deliveryAddress}<br>
                    <a href="${deliveryMap}" target="_blank">View on Map</a>
                </td>
                <td>${orderItem}</td>
                <td>${orderAmount}</td>
                <td>
                    <strong>Pickup Address:</strong> ${pickupAddress}<br>
                    <strong>Box Size:</strong> ${boxSize}<br>
                    <strong>Weight:</strong> ${orderWeight}
                </td>
                <td>${paymentType}</td>
                <td>
                    <select class="status-dropdown" data-id="${order.id}">
                        <option value="ongoing" ${statusFilter === "ongoing" ? "selected" : ""}>ongoing</option>
                        <option value="completed" ${statusFilter === "completed" ? "selected" : ""}>completed</option>
                    </select>
                    <button class="save-status-btn" data-id="${order.id}" style="margin-top: 10px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; background-color: #3a813c; color: white;">Save Status</button>
                </td>
                <td>
                    <select class="assign-dropdown" data-id="${order.id}">
                        <option value="">Select Rider</option>
                        ${riders.map((rider) => `<option value="${rider}" ${order.assignedTo === rider ? "selected" : ""}>${rider}</option>`).join("")}
                    </select>
                    <button class="save-assign-btn" data-id="${order.id}" style="margin-top: 10px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; background-color: #3a813c; color: white;">Save Assignment</button>
                </td>
            `;

            orderHistoryBody.appendChild(row);
        }

        addEventListeners();
    } catch (error) {
        console.error("Error fetching data: ", error);
    }
};

// Add event listeners for dropdowns, save buttons, and filter input
const addEventListeners = () => {
    // Filter input event listener
    orderIdFilterInput.addEventListener("input", () => {
        fetchAndDisplayOrders(); // Re-fetch and filter orders when the input changes
    });

    // Save Order Status Button
    document.querySelectorAll(".save-status-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const orderId = event.target.dataset.id;
            const dropdown = event.target.previousElementSibling; // Get the corresponding dropdown
            const newStatus = dropdown.value;

            try {
                const orderDoc = doc(firestore, "orders", orderId);
                await updateDoc(orderDoc, { statusFilter: newStatus });
                alert(`Order status updated to: ${newStatus}`);
            } catch (error) {
                console.error("Error updating order status: ", error);
            }
        });
    });

    // Save Rider Assignment Button
    document.querySelectorAll(".save-assign-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const orderId = event.target.dataset.id;
            const dropdown = event.target.previousElementSibling; // Get the corresponding dropdown
            const assignedTo = dropdown.value;

            try {
                const orderDoc = doc(firestore, "orders", orderId);
                await updateDoc(orderDoc, { assignedTo });
                alert(`Order assigned to: ${assignedTo}`);
            } catch (error) {
                console.error("Error assigning order: ", error);
            }
        });
    });
};

// Handle Section Switching
document.getElementById("menu").addEventListener("change", (e) => {
    const selectedSection = e.target.value;

    // Hide all sections
    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });

    // Show the selected section
    document.getElementById(selectedSection).classList.add("active");

    // Update the section title
    const sectionTitle = document.getElementById("section-title");
    sectionTitle.textContent = selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1);

    // Reload orders if the "Orders" section is selected
    if (selectedSection === "orders") {
        fetchAndDisplayOrders();
    }
});

// Logout Button Handler
document.getElementById("logout-btn").addEventListener("click", () => {
    alert("Logout functionality not implemented!");
    // Implement actual logout logic here if required
});

// Fetch orders and riders on page load
document.addEventListener("DOMContentLoaded", fetchAndDisplayOrders);



// Account section 



async function fetchSubscriptionRequests() {
    const subscriptionTable = document.querySelector("#subscriptionTable tbody");
    subscriptionTable.innerHTML = ""; // Clear table before loading

    // Get all subscription request documents
    const querySnapshot = await getDocs(collection(db, "subscriptionRequest"));

    // Convert querySnapshot to an array and sort by requestDate (most recent first)
    const sortedDocs = querySnapshot.docs
        .map((docSnap) => {
            const data = docSnap.data();
            const purchaseDate = data.requestDate
                ? data.requestDate.seconds
                    ? new Date(data.requestDate.seconds * 1000)
                    : new Date(data.requestDate)
                : null;

            return {
                docSnap,
                data,
                purchaseDate,
            };
        })
        .sort((a, b) => b.purchaseDate - a.purchaseDate); // Sort by purchaseDate descending

    // Process each sorted document
    for (const { docSnap, data, purchaseDate } of sortedDocs) {
        const userId = data.userId || "N/A"; // Ensure userId exists
        const username = await fetchUsername(userId); // Fetch username

        // Extract numeric value from "30 days" or similar duration string
        const durationString = data.Duration || "30 days";
        const packageDuration = parseInt(durationString.split(" ")[0], 10) || 30;

        // Calculate the end date based on the extracted duration
        const endDate = purchaseDate
            ? new Date(purchaseDate.getTime() + packageDuration * 86400000) // Calculate end date by adding the duration in days
            : "N/A";

        // Check if the current date is greater than the end date, update status if needed
        if (endDate !== "N/A" && new Date() > endDate) {
            try {
                const docRef = doc(db, "subscriptionRequest", docSnap.id);
                await updateDoc(docRef, { status: "pending" });
                data.status = "pending"; // Update the data in the table to reflect the status change
            } catch (error) {
                console.error("Error updating status to pending:", error);
            }
        }

        // Create the table row with formatted dates
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${username}</td>
            <td>${data.packageName}</td>
            <td>${data.packagePrice}</td>
            <td>${data.dueDeliveries}</td>
            <td style="background-color: rgba(253, 54, 54, 0.444); color: #000;">
                Amount: ${data.paymentDetails.amount}<br>
                Number: ${data.paymentDetails.number}<br>
                Reference: ${data.paymentDetails.reference}<br>
                Transaction ID: ${data.paymentDetails.transactionId}
            </td>
            <td>${
                purchaseDate
                    ? purchaseDate.toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true
                    })
                    : "N/A"
            }</td>
            <td>${
                endDate !== "N/A"
                    ? endDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })
                    : "N/A"
            }</td>
            <td>
                <select class="status-dropdown" data-id="${docSnap.id}">
                    <option value="pending" ${data.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="active" ${data.status === "active" ? "selected" : ""}>Active</option>
                </select>
                <button class="save-btn" data-id="${docSnap.id}" style="margin-top: 10px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; background-color: #3a813c; color: white;">Save</button>
            </td>
        `;

        subscriptionTable.appendChild(row);
    }

    attachSaveListeners();
}

function attachSaveListeners() {
    document.querySelectorAll(".save-btn").forEach((btn) => {
        btn.addEventListener("click", async (event) => {
            const docId = event.target.getAttribute("data-id");
            const dropdown = document.querySelector(`.status-dropdown[data-id="${docId}"]`);
            const newStatus = dropdown.value;

            try {
                const docRef = doc(db, "subscriptionRequest", docId);
                await updateDoc(docRef, { status: newStatus });
                alert("Status updated successfully!");
            } catch (error) {
                console.error("Error updating status:", error);
                alert("Failed to update status. Please try again.");
            }
        });
    });
}

// Call fetchSubscriptionRequests when the account section is loaded
document.getElementById("menu").addEventListener("change", (e) => {
    const selectedSection = e.target.value;
    if (selectedSection === "account") {
        fetchSubscriptionRequests();
    }
});
