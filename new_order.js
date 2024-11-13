// Import Firebase and Firestore SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
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
let pickUpaddresses = [];
let userId = null;
window.currentEditId = null;  // Holds the ID of address being edited

// Function to toggle visibility of forms
const toggleFormVisibility = (formId, visible) => {
    document.getElementById(formId).style.display = visible ? 'flex' : 'none';
}

// Show add address form
window.addAddress = () => toggleFormVisibility('newAddressForm', true);

// Load saved addresses on page load
window.onload = window.loadAddresses;

// Load saved addresses from Firestore
window.loadAddresses = async () => {
    if (!userId) return;

    pickUpaddresses = [];
    try {
        const addressesSnapshot = await getDocs(collection(db, `users/${userId}/addresses`));
        addressesSnapshot.forEach((doc) => {
            const addressData = { id: doc.id, ...doc.data() };
            pickUpaddresses.push(addressData);
        });
        updateAddressList();
    } catch (error) {
        console.error("Error loading addresses:", error);
    }
};

// Update the address list UI
window.updateAddressList = () => {
    const addressList = document.getElementById('addressList');
    addressList.innerHTML = '';

    pickUpaddresses.forEach((item, index) => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="radio" name="pickupAddress" value="${item.address} ${item.phone} ${item.address} ${item.maplink}" ${index === 0 ? 'checked' : ''}>
            ${item.name} <br>
            ${item.phone} <br>
            ${item.address} <br>
            ${item.maplink} <br>
            <div class="button-container">
                <button onclick="editAddress('${item.id}')">Edit</button>
                <button onclick="deleteAddress('${item.id}')">Delete</button>
            </div>
        `;
        addressList.appendChild(label);
    });
}

// Clear address form
const clearAddressForm = () => {
    document.getElementById('newName').value = '';
    document.getElementById('pickup-phone').value = '';
    document.getElementById('newAddress').value = '';
    document.getElementById('pickup-map').value = '';
    toggleFormVisibility('newAddressForm', false);
    document.getElementById('saveAddressButton').innerText = 'Add Address';
}

// Save address changes or add a new address
// Save address changes or add a new address
window.saveAddress = async () => {
    const name = document.getElementById('newName').value.trim();
    const phone = document.getElementById('pickup-phone').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const maplink = document.getElementById('pickup-map').value.trim();

    if (!name || !phone || !address || !maplink) {
        alert("Please fill out all address fields.");
        return;
    }

    const addressData = { name, phone, address, maplink };

    try {
        if (window.currentEditId) {
            // Update existing address
            const addressRef = doc(db, `users/${userId}/addresses`, window.currentEditId);
            await setDoc(addressRef, addressData, { merge: true });

            // Update local array and reset edit ID
            pickUpaddresses = pickUpaddresses.map(item => item.id === window.currentEditId ? { ...item, ...addressData } : item);
            window.currentEditId = null;
            document.getElementById('saveAddressButton').innerText = 'Add Address';
        } else {
            // Add new address
            await addDoc(collection(db, `users/${userId}/addresses`), addressData);
        }

        await loadAddresses();
        clearAddressForm();
    } catch (error) {
        console.error("Error saving address:", error);
        alert("Error saving address.");
    }
};

// Edit an address
window.editAddress = function(addressId) {
    const addressToEdit = pickUpaddresses.find(item => item.id === addressId);
    if (!addressToEdit) return;

    document.getElementById('newName').value = addressToEdit.name;
    document.getElementById('pickup-phone').value = addressToEdit.phone;
    document.getElementById('newAddress').value = addressToEdit.address;
    document.getElementById('pickup-map').value = addressToEdit.maplink;
    document.getElementById('saveAddressButton').innerText = 'Save Changes';
    window.currentEditId = addressId;
    toggleFormVisibility('newAddressForm', true);
};
// Delete an address
window.deleteAddress = async function(addressId) {
    if (!userId) return;

    try {
        await deleteDoc(doc(db, `users/${userId}/addresses`, addressId));
        pickUpaddresses = pickUpaddresses.filter(item => item.id !== addressId);
        updateAddressList();
    } catch (error) {
        console.error("Error deleting address:", error);
        alert("Error deleting address.");
    }
}

// Submit an order with notification
// Function to create an order and store it in Firebase Firestore
window.createOrder = async function() {
    if (pickUpaddresses.length === 0) {
        alert("Please add a pickup address before creating an order.");
        return;
    }
    // Collect form elements
    const receiverName = document.getElementById('receiverName').value.trim();
    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    const orderItem = document.getElementById('orderItem').value.trim();
    const reciverPhone = document.getElementById('reciverPhone').value.trim();
    const orderAmount = document.getElementById('orderAmount').value.trim();
    const paymentType = document.getElementById('paymentType').value.trim();
    const deliveryMap = document.getElementById('deliveryMap').value.trim();
    const boxSize = document.getElementById('boxSize').value.trim();
    const orderWeight = document.getElementById('orderWeight').value.trim();

    // Check if any field is empty
    if (!receiverName || !deliveryAddress || !orderItem || !reciverPhone || !orderAmount || 
        !paymentType || !deliveryMap || !boxSize || !orderWeight) {
        alert("Please fill out all order details before creating the order.");
        return;
    }

    // Gather order details
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
        userId: auth.currentUser.uid  // Save the userId along with the order data
    };

    try {
        const docRef = await addDoc(collection(db, "orders"), orderData);
        console.log("Order created with ID: ", docRef.id);
        alert("Order created successfully!");
        resetOrderForm();
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Error creating order.");
    }
}

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
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        loadAddresses();
    } else {
        userId = null;
    }
});

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
