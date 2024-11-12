// Import necessary Firebase SDK modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// DOMContentLoaded event to ensure all elements are accessible
document.addEventListener("DOMContentLoaded", () => {
    setupMenuToggle();
    setupFormToggle();
    setupEventListeners();
    handleAuthError();
    showNotification();
    showForm();
    togglePasswordVisibility();
    signup();
    login();

});

// Toggle hamburger menu visibility
function setupMenuToggle() {
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-menu");

    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navMenu.classList.toggle("active");
    });

    document.querySelectorAll(".nav-link").forEach(n => 
        n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
        })
    );
}

// Show notifications to the user
function showNotification(message) {
    const notification = document.getElementById("notification");
    const notificationMessage = document.getElementById("notification-message");
    notificationMessage.textContent = message;
    notification.style.display = "block";
    setTimeout(() => notification.style.display = "none", 3000);
}

// Toggle form visibility between login and signup
function setupFormToggle() {
    document.getElementById("signup-tab").addEventListener("click", () => showForm("signup"));
    document.getElementById("login-tab").addEventListener("click", () => showForm("login"));
}

function showForm(formType) {
    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    const signupTab = document.getElementById("signup-tab");
    const loginTab = document.getElementById("login-tab");

    const isSignup = formType === "signup";
    signupForm.classList.toggle("active", isSignup);
    loginForm.classList.toggle("active", !isSignup);
    signupTab.classList.toggle("active", isSignup);
    loginTab.classList.toggle("active", !isSignup);
}

// Toggle password visibility
function togglePasswordVisibility(passwordFieldId, checkbox) {
    const passwordField = document.getElementById(passwordFieldId);
    passwordField.type = checkbox.checked ? "text" : "password";
}

// Set up event listeners for signup, login, and password visibility
function setupEventListeners() {
    document.getElementById("signup-button").addEventListener("click", signup);
    document.getElementById("login-button").addEventListener("click", login);
    document.getElementById("show-signup-password").addEventListener("change", (event) => {
        togglePasswordVisibility("signup-password", event.target);
    });
    document.getElementById("show-login-password").addEventListener("change", (event) => {
        togglePasswordVisibility("login-password", event.target);
    });
}

// Handle user signup
function signup() {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            showNotification("Signup successful!");
            showForm("login");
        })
        .catch((error) => {
            const errorMessage = handleAuthError(error);
            showNotification(errorMessage);
        });
}

// Handle user login
function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => window.location.href = "user_dashboard.html")
        .catch((error) => {
            const errorMessage = handleAuthError(error);
            showNotification(errorMessage);
        });
}

// Authentication error handling
function handleAuthError(error) {
    switch (error.code) {
        case "auth/weak-password":
            return "Password is too weak.";
        case "auth/email-already-in-use":
            return "Email address is already in use.";
        case "auth/invalid-email":
            return "Invalid email address.";
        default:
            return "An error occurred. Please try again.";
    }
}
