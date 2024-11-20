// Import Firebase and Firestore SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, query, where, getDoc  } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

// Firebase configuration
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
const db = getFirestore(app);
const auth = getAuth(app);

// Global variables
let pickUpAddresses = [];
let userId = null;
let redirecting = false; // Prevents double redirects
window.currentEditId = null; // Holds the ID of the address being edited

/**
 * Authentication State Listener
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        console.log("User logged in:", userId);
        loadAddresses();
        displayActiveSubscription();
    } else if (!redirecting) {
        console.log("User not logged in.");
        redirecting = true;
        setTimeout(() => window.location.href = 'loading.html', 1);
    }
});

document.getElementById('sidebarDropdown').addEventListener('change', function() {
    const selectedValue = this.value;

    // Store the selected value in localStorage
    if (selectedValue) {
        localStorage.setItem('sidebarSelection', selectedValue);
    }

    // Redirect to the corresponding page based on the selection
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
        dropdown.value = storedSelection; // Set the dropdown to the stored value
    }
});

// Show notifications to the user
function showNotification(message) {
    const notification = document.getElementById("notification");
    const notificationMessage = document.getElementById("notification-message");
    notificationMessage.textContent = message;
    notification.style.display = "block";
    setTimeout(() => notification.style.display = "none", 3000);
}
/**
 * Toggles the visibility of a form
 * @param {string} formId - The ID of the form element
 * @param {boolean} visible - Whether the form should be visible
 */
const toggleFormVisibility = (formId, visible) => {
    document.getElementById(formId).style.display = visible ? 'flex' : 'none';
};

/**
 * Show the add address form
 */
window.addAddress = () => toggleFormVisibility('newAddressForm', true);

/**
 * Fetches active subscription details for the logged-in user
 * @returns {object|null} - The active subscription details or null if none
 */
async function loadSubscriptionDetails() {
    if (!userId) return null;

    try {
        const subscriptionQuery = query(
            collection(db, "subscriptionRequest"),
            where("userId", "==", userId),
            where("status", "==", "active")
        );
        const subscriptionSnapshot = await getDocs(subscriptionQuery);

        if (!subscriptionSnapshot.empty) {
            const subscriptionDoc = subscriptionSnapshot.docs[0]; // Get the first active subscription
            const subscription = subscriptionDoc.data();
            const packageDoc = await getDoc(doc(db, "subscriptionPackages", subscription.packageId));

            if (packageDoc.exists()) {
                const packageData = packageDoc.data();
                const purchaseDate = new Date(subscription.requestDate);

                // Format dates
                const formattedPurchaseDate = formatDate(purchaseDate);
                const durationString = packageData.Duration || "30 days";
                const Duration = parseInt(durationString.split(" ")[0], 10) || 30;
                const endDate = new Date(
                    purchaseDate.getTime() + Duration * 86400000
                );
                const formattedEndDate = formatDate(endDate);

                return {
                    subscriptionId: subscriptionDoc.id, // Include the document ID
                    packageId: subscription.packageId,
                    packageName: packageData.packageName,
                    requestDate: formattedPurchaseDate,
                    endDate: formattedEndDate,
                    dueDeliveries: subscription.dueDeliveries, // From subscriptionRequest, not subscriptionPackages
                };
            }
        }
    } catch (error) {
        console.error("Error loading subscription details:", error);
    }

    return null;

    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
        const year = date.getFullYear().toString().slice(-2); // Last 2 digits of the year

        return `${day}/${month}/${year}`;
    }
}


// Helper function to format dates as dd/mm/yy


/**
 * Displays the active subscription in the UI
 */
async function displayActiveSubscription() {
    const subscriptionData = await loadSubscriptionDetails();
    const subscriptionDiv = document.getElementById('activeSubscription');

    if (subscriptionData) {
        subscriptionDiv.innerHTML = `
            <h3>Active Subscription</h3>
            <p>Plan: ${subscriptionData.packageName}</p>
            <p>Start Date: ${subscriptionData.requestDate}</p>
            <p>End Date: ${subscriptionData.endDate}</p>
            <p>Deliveries Due: ${subscriptionData.dueDeliveries}</p>
        `;
    } else {
        subscriptionDiv.innerHTML = `
            <h3>No Active Subscription</h3>
            <p>You need an active subscription to create an order.</p>
        `;
        document.getElementById('saveAddressButton').disabled = true;
    }
}

/**
 * Loads saved addresses from Firestore
 */
window.loadAddresses = async () => {
    if (!userId) return;

    pickUpAddresses = [];
    try {
        const addressesSnapshot = await getDocs(collection(db, `users/${userId}/addresses`));
        addressesSnapshot.forEach((doc) => {
            const addressData = { id: doc.id, ...doc.data() };
            pickUpAddresses.push(addressData);
        });
        updateAddressList();
    } catch (error) {
        console.error("Error loading addresses:", error);
    }
};

/**
 * Updates the address list in the UI
 */
window.updateAddressList = () => {
    const addressList = document.getElementById('addressList');
    addressList.innerHTML = ''; // Clear existing addresses

    pickUpAddresses.forEach((address, index) => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="radio" name="pickupAddress" value="${address.id}" ${index === 0 ? 'checked' : ''}>
            ${address.name} <br>
            ${address.phone} <br>
            ${address.address} <br>
            ${address.maplink} <br>
            <div class="button-container">
                <button onclick="editAddress('${address.id}')">Edit</button>
                <button onclick="deleteAddress('${address.id}')">Delete</button>
            </div>
        `;
        addressList.appendChild(label);
    });
};

/**
 * Clears the address form
 */
const clearAddressForm = () => {
    document.getElementById('newName').value = '';
    document.getElementById('pickup-phone').value = '';
    document.getElementById('newAddress').value = '';
    document.getElementById('pickup-map').value = '';
    toggleFormVisibility('newAddressForm', false);
    document.getElementById('saveAddressButton').innerText = 'Add Address';
};

/**
 * Saves or updates an address
 */
/**
 * Saves or updates an address
 */
window.saveAddress = async () => {
    const name = document.getElementById('newName').value.trim();
    const phone = document.getElementById('pickup-phone').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const maplink = document.getElementById('pickup-map').value.trim();

    if (!name || !phone || !address || !maplink) {
        showNotification("Please fill out all address fields.");
        return;
    }

    const addressData = { name, phone, address, maplink };

    try {
        if (window.currentEditId) {
            // Update the existing address
            await setDoc(doc(db, `users/${userId}/addresses`, window.currentEditId), addressData);
            console.log("Address updated successfully.");
        } else {
            // Add a new address
            await addDoc(collection(db, `users/${userId}/addresses`), addressData);
            console.log("Address added successfully.");
        }
        
        // Reload addresses and reset the form
        await loadAddresses();
        clearAddressForm();
        window.currentEditId = null; // Reset after saving
    } catch (error) {
        console.error("Error saving address:", error);
        showNotification("Error saving address.");
    }
};


/**
 * Deletes an address
 */
window.deleteAddress = async function(addressId) {
    if (!userId) return;

    try {
        await deleteDoc(doc(db, `users/${userId}/addresses`, addressId));
        pickUpAddresses = pickUpAddresses.filter(item => item.id !== addressId);
        updateAddressList();
    } catch (error) {
        console.error("Error deleting address:", error);
        showNotification("Error deleting address.");
    }
};

// Add remaining functionality similarly, modularized and properly commented.



// Edit an address
window.editAddress = function(addressId) {
    const addressToEdit = pickUpAddresses.find(item => item.id === addressId); // Fixed case issue
    if (!addressToEdit) return;

    document.getElementById('newName').value = addressToEdit.name;
    document.getElementById('pickup-phone').value = addressToEdit.phone;
    document.getElementById('newAddress').value = addressToEdit.address;
    document.getElementById('pickup-map').value = addressToEdit.maplink;
    document.getElementById('saveAddressButton').innerText = 'Save Changes';
    window.currentEditId = addressId; // Set the ID for editing
    toggleFormVisibility('newAddressForm', true);
};



// Submit an order with notification
// Function to create an order and store it in Firebase Firestore
// Function to create an order and store it in Firebase Firestore
window.createOrder = async function () {
    if (!userId) {
        showNotification("User not authenticated. Please log in to create an order.");
        return;
    }

    const subscriptionData = await loadSubscriptionDetails();
    if (!subscriptionData || subscriptionData.dueDeliveries <= 0) {
        showNotification("No deliveries left or active subscription.");
        return;
    }

    const receiverName = document.getElementById('receiverName').value.trim();
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    const orderItem = document.getElementById('orderItem').value.trim();
    const reciverPhone = document.getElementById('reciverPhone').value.trim();
    const orderAmount = document.getElementById('orderAmount').value.trim();
    const paymentType = document.getElementById('paymentType').value.trim();
    const deliveryMap = document.getElementById('deliveryMap').value.trim();
    const boxSize = document.getElementById('boxSize').value.trim();
    const orderWeight = document.getElementById('orderWeight').value.trim();

    if (!receiverName || !deliveryAddress || !orderItem || !reciverPhone || !orderAmount || 
        !paymentType || !deliveryMap || !boxSize ) {
        showNotification("Please fill out all order details.");
        return;
    }

    if (pickUpAddresses.length === 0) {
        showNotification("Please add a pickup address before creating an order.");
        return;
    }

    const selectedAddress = document.querySelector('input[name="pickupAddress"]:checked').value;
    const orderData = {
        orderID: generateUniqueOrderID(),
        date: new Date(),
        receiverName,
        deliveryAddress,
        orderItem,
        reciverPhone,
        orderAmount,
        paymentType,
        statusFilter: "ongoing",
        pickupAddress: selectedAddress,
        deliveryMap,
        boxSize,
        orderWeight,
        userId,
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        showNotification("Order created successfully!");
    } catch (error) {
        console.error("Error creating order:", error);
        showNotification("Error creating order.");
        return;
    }

    // Update due deliveries in subscriptionRequest
    try {
        const subscriptionDocRef = doc(db, "subscriptionRequest", subscriptionData.subscriptionId); // Use the correct ID
        await setDoc(subscriptionDocRef, {
            dueDeliveries: subscriptionData.dueDeliveries - 1, // Decrement dueDeliveries
        }, { merge: true });

        console.log("Due deliveries updated successfully.");
    } catch (error) {
        console.error("Error updating subscription:", error);
        showNotification("Error updating subscription.");
    }

    resetOrderForm();
};


// Generate unique order ID
window.generateUniqueOrderID = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `OD${timestamp}`; // 'OD' is a prefix, you can customize it
  };
  

// Reset order form
const resetOrderForm = () => {
    document.getElementById('receiverName').value = '';
    document.getElementById('deliveryAddress').value = '';
    document.getElementById('deliveryMap').value = '';
    document.getElementById('orderItem').value = '';
    document.getElementById('reciverPhone').value = '';
    document.getElementById('boxSize').value = '';
    document.getElementById('orderWeight').value = '';
    document.getElementById('orderAmount').value = '';
};

// Authentication state change to load addresses


/* Hamburger menu */
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
});

document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
}));

// Get the dropdown
// Add event listeners for sidebar links
// JavaScript for handling dropdown selection
// Listen for changes in the dropdown and store the selected value
