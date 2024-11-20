// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDypcHCrpqFsBQULOwAPTdw_L2bvU_ssc4",
    authDomain: "delivoo-ex.firebaseapp.com",
    databaseURL: "https://delivoo-ex-default-rtfirestore.firebaseio.com",
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

// DOM elements
const packageOptionsDiv = document.getElementById("package-options");
const paymentSegmentDiv = document.getElementById("payment-segment");
const packageNameSpan = document.getElementById("package-name");
const startDateSpan = document.getElementById("start-date");
const endDateSpan = document.getElementById("end-date");
const dueDeliveriesSpan = document.getElementById("due-deliveries");

// Tracks the logged-in user
let currentUser = null;

// Utility: Show/hide an element
const toggleElementVisibility = (element, visible) => {
    element.style.display = visible ? "block" : "none";
};

// Load subscription packages
async function loadSubscriptionPackages() {
    const packagesRef = collection(firestore, "subscriptionPackages");
    const packagesSnapshot = await getDocs(packagesRef);

    packageOptionsDiv.innerHTML = ""; // Clear existing packages

    packagesSnapshot.forEach(doc => {
        const packageData = doc.data();
        const packageDiv = document.createElement("div");
        packageDiv.classList.add("package");
        packageDiv.innerHTML = `
            <h3>${packageData.packageName}</h3>
            <p>Price: $${packageData.price}</p>
            <p>Duration: ${packageData.Duration} days</p>
            <p>Deliveries Due: ${packageData.dueDeliveries}</p>
            <button onclick="purchasePackage('${doc.id}', '${packageData.price}')">Purchase</button>
        `;
        packageOptionsDiv.appendChild(packageDiv);
    });
}

// Purchase subscription package
window.purchasePackage = (packageId, price) => {
    if (!currentUser) {
        alert("You must be logged in to purchase a package.");
        return;
    }
    toggleElementVisibility(paymentSegmentDiv, true); // Show payment form
    document.getElementById("payment-price").innerText = `$${price}`;
    document.getElementById("submit-payment").dataset.packageId = packageId; // Store packageId in the button's dataset
};

// Submit payment details
window.submitPayment = async (event) => {
    event.preventDefault();

    const submitButton = event.target; // The submit button element
    const packageId = submitButton.dataset.packageId; // Retrieve packageId from the button's dataset
    const userId = currentUser?.uid;

    // Validate data
    if (!packageId || !userId) {
        alert("Error: Missing user or package data.");
        return;
    }

    const paymentDetails = {
        number: document.getElementById("payment-number").value,
        transactionId: document.getElementById("transectionID").value,
        reference: document.getElementById("reference").value,
        amount: parseFloat(document.getElementById("payment-price").innerText.replace("$", "")),
    };

    if (!paymentDetails.number || !paymentDetails.transactionId || !paymentDetails.reference) {
        alert("Please fill in all payment details.");
        return;
    }

    try {
        const packageDoc = await getDoc(doc(firestore, "subscriptionPackages", packageId));
        if (!packageDoc.exists()) {
            alert("Package not found.");
            return;
        }

        const packageData = packageDoc.data();

        // Construct subscription request object
        const subscriptionRequest = {
            userId,
            packageId,
            paymentDetails,
            packageName: packageData.packageName,
            packagePrice: packageData.price,
            Duration: packageData.Duration,
            dueDeliveries: packageData.dueDeliveries,
            status: "pending",
            requestDate: new Date().toISOString(),
        };

        // Add data to Firestore
        await addDoc(collection(firestore, "subscriptionRequest"), subscriptionRequest);

        alert("Payment request submitted successfully.");
        toggleElementVisibility(paymentSegmentDiv, false); // Hide payment form
    } catch (error) {
        console.error("Error submitting payment:", error);
        alert("Error submitting payment. Please try again.");
    }
};

// Load current subscription details
async function setupSubscriptionRealTimeUpdates() {
    if (!currentUser) return;

    // First, fetch subscription details
    const subscriptionQuery = query(
        collection(firestore, "subscriptionRequest"),
        where("userId", "==", currentUser.uid),
        where("status", "==", "active")
    );

    const subscriptionSnapshot = await getDocs(subscriptionQuery);
    if (!subscriptionSnapshot.empty) {
        const subscriptionDoc = subscriptionSnapshot.docs[0]; // Get the first active subscription
        const subscription = subscriptionDoc.data();
        const packageDoc = doc(firestore, "subscriptionPackages", subscription.packageId);

        // Get package details
        const packageDocSnapshot = await getDoc(packageDoc);
        if (packageDocSnapshot.exists()) {
            const packageData = packageDocSnapshot.data();
            const purchaseDate = new Date(subscription.requestDate);
            const formattedPurchaseDate = formatDate(purchaseDate);
            const Duration = parseInt(packageData.Duration.split(" ")[0], 10) || 30;
            const endDate = new Date(purchaseDate.getTime() + Duration * 86400000);
            const formattedEndDate = formatDate(endDate);

            // Update the UI with the updated subscription
            packageNameSpan.innerText = packageData.packageName;
            startDateSpan.innerText = formattedPurchaseDate;
            endDateSpan.innerText = formattedEndDate;
            dueDeliveriesSpan.innerText = ` ${subscription.dueDeliveries}`;
        }
    }

    // Real-time updates with onSnapshot
    const unsubscribe = onSnapshot(subscriptionQuery, (subscriptionSnapshot) => {
        if (!subscriptionSnapshot.empty) {
            const subscriptionDoc = subscriptionSnapshot.docs[0];
            const subscription = subscriptionDoc.data();
            const packageDoc = doc(firestore, "subscriptionPackages", subscription.packageId);

            getDoc(packageDoc).then((packageDocSnapshot) => {
                if (packageDocSnapshot.exists()) {
                    const packageData = packageDocSnapshot.data();
                    const purchaseDate = new Date(subscription.requestDate);
                    const formattedPurchaseDate = formatDate(purchaseDate);
                    const Duration = parseInt(packageData.Duration.split(" ")[0], 10) || 30;
                    const endDate = new Date(purchaseDate.getTime() + Duration * 86400000);
                    const formattedEndDate = formatDate(endDate);

                    // Update the UI with the updated subscription
                    packageNameSpan.innerText = packageData.packageName;
                    startDateSpan.innerText = formattedPurchaseDate;
                    endDateSpan.innerText = formattedEndDate;
                    dueDeliveriesSpan.innerText = ` ${subscription.dueDeliveries}`;
                }
            });
        }
    });

    // Return unsubscribe function to stop listening when not needed
    return unsubscribe;
    function formatDate(date) {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
        const year = date.getFullYear().toString().slice(-2); // Last 2 digits of the year

        return `${day}/${month}/${year}`;
    }
}

// Use onSnapshot for real-time data




// Withdrawal functionality

// Show withdraw request form
const withdrawBtn = document.getElementById("withdraw-btn");
const withdrawFormSection = document.getElementById("withdraw-form-section");

withdrawBtn.addEventListener("click", () => {
    // Toggle visibility of the withdraw form
    withdrawFormSection.style.display = withdrawFormSection.style.display === "none" ? "block" : "none";
});

// Submit withdraw request
document.getElementById("withdraw-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) {
        alert("You must be logged in to request a withdrawal.");
        return;
    }

    const withdrawAmount = parseFloat(document.getElementById("withdraw-amount").value);
    const withdrawMethod = document.getElementById("withdraw-method").value;
    const withdrawReference = document.getElementById("withdraw-reference").value;

    if (withdrawAmount <= 0) {
        alert("Please enter a valid withdrawal amount.");
        return;
    }

    try {
        // Query orders where paymentType is "COD" and paymentType is "completed"
        // Query orders where paymentType is "COD" and statusFilter is "completed"
        const ordersQuery = query(
            collection(firestore, "orders"),
            where("userId", "==", currentUser.uid),
            where("paymentType", "==", "COD"),
            where("statusFilter", "==", "completed")
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        // Calculate total COD amount
        let totalCODAmount = 0;
        ordersSnapshot.forEach(doc => {
            const orderData = doc.data();
            totalCODAmount += parseFloat(orderData.orderAmount || 0); // Add orderAmount to total
        });

        // Update the UI with the total COD amount
        codTotalSpan.innerText = `$${totalCODAmount.toFixed(2)}`;
        

        // Query approved withdrawals to calculate the total withdrawn amount
        const withdrawQuery = query(
            collection(firestore, "withdraw_request"),
            where("userId", "==", currentUser.uid),
            where("status", "==", "approved")  // Only approved withdrawals
        );
        const withdrawSnapshot = await getDocs(withdrawQuery);

        let totalWithdrawnAmount = 0;
        withdrawSnapshot.forEach(doc => {
            const withdrawData = doc.data();
            totalWithdrawnAmount += withdrawData.amount;  // Sum up the withdrawn amounts
        });

        const totalDueBalance = totalCODAmount - totalWithdrawnAmount;

        if (withdrawAmount > totalDueBalance) {
            alert("Insufficient funds for this withdrawal request.");
            return;
        }

        // Create withdraw request object
        const withdrawRequest = {
            userId: currentUser.uid,
            amount: withdrawAmount,
            method: withdrawMethod,
            reference: withdrawReference,
            status: "pending", // Pending until approved by admin
            requestDate: new Date().toISOString(),
        };

        // Add the withdraw request to Firestore
        await addDoc(collection(firestore, "withdraw_request"), withdrawRequest);

        alert("Withdrawal request submitted successfully.");
        withdrawFormSection.style.display = "none"; // Hide the withdraw form after submission
    } catch (error) {
        console.error("Error submitting withdraw request:", error);
        alert("Error submitting request. Please try again.");
    }
});


// Authenticate user
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadSubscriptionPackages();
        setupSubscriptionRealTimeUpdates(); // Add this line to set up real-time updates
        
    } else {
        alert("Please log in to access your account.");
        window.location.href = "login.html";
    }
});

// Get the dropdown
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

/* Hamburger menu */
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
});

document.querySelectorAll(".nav-links").forEach(n => n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
}));
