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

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user);
        fetchOrderHistory(); // Fetch the orders once the user is authenticated
    } else {
        console.log("User not logged in.");
        window.location.href = 'login.html'; // Redirect to login page if not authenticated
    }
});

// Now, you can use Firestore and Authentication as intended
async function loadSubscriptionPackages() {
    const packagesRef = collection(firestore, "subscriptionPackages");
    const packagesSnapshot = await getDocs(packagesRef);
    const packageOptionsContainer = document.getElementById("package-options");

    packageOptionsContainer.innerHTML = '';  // Clear existing options if any
    packagesSnapshot.forEach((doc) => {
        const packageData = doc.data();
        const packageDiv = document.createElement("div");
        packageDiv.className = "package";

        packageDiv.innerHTML = `
            <h3>${packageData.Name}</h3>
            <p><strong>Price:</strong> ${packageData.price}</p>
            <p><strong>Duration:</strong> ${packageData.Duration}</p>
            <p><strong>Deliveries:</strong> ${packageData.dueDeliveries}</p>
            <button onclick="purchaseSubscription('${doc.id}')">Purchase</button>
        `;
        packageOptionsContainer.appendChild(packageDiv);
    });
}

// Handle subscription purchase
async function purchaseSubscription(packageId) {
    const user = auth.currentUser;
    if (user) {
        try {
            await addDoc(collection(firestore, "subscriptionRequests"), {
                userID: user.uid,
                packageID: packageId,
                status: "pending",
                uid: user.uid
            });
            alert("Subscription purchase request submitted. Awaiting approval.");
        } catch (error) {
            console.error("Error submitting purchase request:", error);
        }
    }
}

// Load approved subscription details
async function loadSubscriptionDetails() {
    const user = auth.currentUser;
    if (user) {
        const subscriptionRef = doc(firestore, "subscriptions", user.uid);
        const subscriptionData = await getDoc(subscriptionRef);
        if (subscriptionData.exists()) {
            document.getElementById("package-name").textContent = subscriptionData.data().packageName;
            document.getElementById("start-date").textContent = subscriptionData.data().startDate.toDate().toLocaleDateString();
            document.getElementById("end-date").textContent = subscriptionData.data().endDate.toDate().toLocaleDateString();
            document.getElementById("due-deliveries").textContent = subscriptionData.data().dueDeliveries;
        } else {
            console.log("No active subscription found.");
        }
    }
}

// Load total COD balance
async function loadCODBalance() {
    const user = auth.currentUser;
    if (user) {
        const codRef = collection(firestore, "codTransactions");
        const codQuery = query(codRef, where("uid", "==", user.uid));
        const codSnapshot = await getDocs(codQuery);
        let totalCOD = 0;
        const codHistoryBody = document.getElementById("cod-history-body");
        codHistoryBody.innerHTML = "";  // Clear existing history

        codSnapshot.forEach(doc => {
            const transactionData = doc.data();
            totalCOD += transactionData.amount;

            // Add a row for each COD transaction
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${transactionData.orderId}</td>
                <td>${transactionData.date.toDate().toLocaleDateString()}</td>
                <td>$${transactionData.amount.toFixed(2)}</td>
                <td>${transactionData.status}</td>
            `;
            codHistoryBody.appendChild(row);
        });

        document.getElementById("total-cod").textContent = totalCOD.toFixed(2);
    }
}

// Handle COD withdrawal request
async function handleWithdrawal() {
    const user = auth.currentUser;
    if (user) {
        // Handle the withdrawal request (implement the logic as per your requirements)
        alert("Your COD withdrawal request has been submitted!");
    }
}

// Initial setup when the user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadSubscriptionPackages();
        loadSubscriptionDetails();
        loadCODBalance();
        
        document.getElementById("withdraw-btn").addEventListener("click", handleWithdrawal);
    } else {
        window.location.replace("login.html"); // Redirect if the user is not logged in
    }
});
