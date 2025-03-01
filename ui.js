// ui.js - Contains UI-related code

// UI Elements
const gameContainer = document.getElementById('game-container');
const saveLoadContainer = document.getElementById('save-load-container');
const newCityButton = document.getElementById('new-city-btn');
const saveButton = document.getElementById('save-city-btn');
const saveAsButton = document.getElementById('save-as-btn');
const loadButton = document.getElementById('load-city-btn');
const autoSaveCheckbox = document.getElementById('auto-save');
const saveNotification = document.getElementById('save-notification');
const loadModal = document.getElementById('load-modal');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal-btn');
const savedCitiesList = document.getElementById('saved-cities-list');

// City info form elements
const cityInfoForm = document.getElementById('city-info-form');
const cityNameInput = document.getElementById('city-name');
const cityDescriptionInput = document.getElementById('city-description');
const saveCityInfoBtn = document.getElementById('save-city-info');
const cancelCityInfoBtn = document.getElementById('cancel-city-info');
const loadingSpinner = document.getElementById('loading-spinner');

// Building buttons
const residentialBtn = document.getElementById('residential-btn');
const commercialBtn = document.getElementById('commercial-btn');
const industrialBtn = document.getElementById('industrial-btn');
const roadBtn = document.getElementById('road-btn');
const bulldozerBtn = document.getElementById('bulldozer-btn');

// Variables to store pending save data
let pendingSaveData = null;
let pendingSaveId = null;

// Notification System
function showNotification(message, duration = 2000) {
    saveNotification.textContent = message;
    saveNotification.style.opacity = '1';
    setTimeout(() => {
        saveNotification.style.opacity = '0';
    }, duration);
}

// Update button styles (selected/deselected)
function updateButtonStyles() {
    // Reset all buttons
    residentialBtn.classList.remove('selected');
    commercialBtn.classList.remove('selected');
    industrialBtn.classList.remove('selected');
    roadBtn.classList.remove('selected');
    bulldozerBtn.classList.remove('selected');
    
    // Set the selected button
    switch (selectedBuildingType) {
        case 'residential':
            residentialBtn.classList.add('selected');
            break;
        case 'commercial':
            commercialBtn.classList.add('selected');
            break;
        case 'industrial':
            industrialBtn.classList.add('selected');
            break;
        case 'road':
            roadBtn.classList.add('selected');
            break;
        case 'bulldozer':
            bulldozerBtn.classList.add('selected');
            break;
    }
}

// Initialize UI Event Listeners
function initializeUI() {
    // Building type selection
    residentialBtn.addEventListener('click', () => {
        selectedBuildingType = 'residential';
        updateButtonStyles();
    });
    
    commercialBtn.addEventListener('click', () => {
        selectedBuildingType = 'commercial';
        updateButtonStyles();
    });
    
    industrialBtn.addEventListener('click', () => {
        selectedBuildingType = 'industrial';
        updateButtonStyles();
    });
    
    roadBtn.addEventListener('click', () => {
        selectedBuildingType = 'road';
        updateButtonStyles();
    });
    
    bulldozerBtn.addEventListener('click', () => {
        selectedBuildingType = 'bulldozer';
        updateButtonStyles();
    });
    
    // City management buttons
    newCityButton.addEventListener('click', () => {
        Storage.createNewCity();
    });
    
    saveButton.addEventListener('click', () => {
        Storage.saveGameState();
    });
    
    saveAsButton.addEventListener('click', () => {
        Storage.saveAsGameState();
    });
    
    loadButton.addEventListener('click', () => {
        // Show loading modal
        loadModal.style.display = 'block';
        Storage.populateSavedCitiesList();
    });
    
    // City info form
    saveCityInfoBtn.addEventListener('click', () => {
        Storage.completeSaveWithCityInfo();
    });
    
    cancelCityInfoBtn.addEventListener('click', () => {
        Storage.hideCityInfoForm();
    });
    
    // Auto-save
    autoSaveCheckbox.addEventListener('change', () => {
        if (autoSaveCheckbox.checked) {
            Storage.startAutoSave();
        } else {
            Storage.stopAutoSave();
        }
    });
    
    // Close load modal when clicking X
    closeModalBtn.addEventListener('click', () => {
        loadModal.style.display = 'none';
    });
    
    // Close load modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === loadModal) {
            loadModal.style.display = 'none';
        }
    });
    
    // Keyboard controls
    window.addEventListener('keydown', (event) => {
        // Rotation with R key
        if (event.key === 'r' || event.key === 'R') {
            buildingRotation = (buildingRotation + 1) % 4;
        }
        
        // Escape key to cancel selection
        if (event.key === 'Escape') {
            selectedBuildingType = null;
            updateButtonStyles();
        }
        
        // Undo with Ctrl+Z or Command+Z
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            undoLastAction();
        }
    });
    
    // Start auto-save if checked
    if (autoSaveCheckbox.checked) {
        Storage.startAutoSave();
    }
}

// Expose functions and variables to be used in other files
window.UI = {
    showNotification,
    updateButtonStyles,
    initializeUI,
    
    // Export UI elements for use in other files
    elements: {
        gameContainer,
        saveNotification,
        loadModal,
        modalContent,
        savedCitiesList,
        cityInfoForm,
        cityNameInput,
        cityDescriptionInput,
        loadingSpinner
    },
    
    // Export variables
    pendingSaveData,
    pendingSaveId
}; 