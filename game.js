// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Notification Popups
function showNotification(message, duration = 2000) {
    saveNotification.textContent = message;
    saveNotification.style.opacity = '1';
    setTimeout(() => {
        saveNotification.style.opacity = '0';
    }, duration);
}

// Undo history stack
const undoStack = [];
const redoStack = [];
const MAX_UNDO_HISTORY = 50; // Maximum number of actions to remember

// Function to add an action to the undo stack
function addToUndoStack(action) {
    undoStack.push(action);
    // Clear redo stack when new action is performed
    redoStack.length = 0;
    // Limit the size of the undo stack to prevent memory issues
    if (undoStack.length > MAX_UNDO_HISTORY) {
        undoStack.shift(); // Remove oldest item
    }
    console.log(`Added to undo stack. Stack size: ${undoStack.length}`);
    
    // Set flag to indicate changes have been made
    hasUnsavedChanges = true;
}

// Function to undo the last action
function undoLastAction() {
    if (undoStack.length === 0) {
        console.log('Nothing to undo');
        // Show notification
        showNotification('Nothing to undo');
        return;
    }
    
    const lastAction = undoStack.pop();
    // Add the action to redo stack
    redoStack.push(lastAction);
    console.log('Undoing action:', lastAction.type);
    
    switch (lastAction.type) {
        case 'place_building':
            // Remove the building that was placed
            bulldoze(lastAction.x, lastAction.z, true); // Pass true to not add this to the undo stack
            break;
            
        case 'place_road':
            // Remove the road that was placed
            bulldoze(lastAction.x, lastAction.z, true); // Pass true to not add this to the undo stack
            break;
            
        case 'bulldoze':
            // Restore what was bulldozed
            if (lastAction.objectType === 'building') {
                placeBuilding(lastAction.buildingType, lastAction.x, lastAction.z, lastAction.rotation, true);
            } else if (lastAction.objectType === 'road') {
                // Need to restore the road
                const roadKey = `${lastAction.x}_${lastAction.z}`;
                const roadType = lastAction.roadType;
                
                // Create the road group
                const roadGroup = createRoadGroup(roadType);
                roadGroup.position.set(lastAction.x + 0.5, 0.005, lastAction.z + 0.5);
                
                scene.add(roadGroup);
                roadGrid.set(roadKey, { mesh: roadGroup, roadType });
                
                // Update adjacent roads
                updateAdjacentRoads(lastAction.x, lastAction.z);
            }
            break;
    }
    
    // Show notification
    showNotification('Action Undone');
}

// Function to redo the last undone action
function redoLastAction() {
    if (redoStack.length === 0) {
        console.log('Nothing to redo');
        // Show notification
        showNotification('Nothing to redo');
        return;
    }
    
    const lastAction = redoStack.pop();
    // Add the action back to undo stack
    undoStack.push(lastAction);
    console.log('Redoing action:', lastAction.type);
    
    switch (lastAction.type) {
        case 'place_building':
            // Place the building back
            placeBuilding(lastAction.buildingType, lastAction.x, lastAction.z, lastAction.rotation, true);
            break;
            
        case 'place_road':
            // Place the road back
            placeRoad(lastAction.x, lastAction.z, true);
            break;
            
        case 'bulldoze':
            // Bulldoze again
            bulldoze(lastAction.x, lastAction.z, true);
            break;
    }
    
    // Show notification
    showNotification('Action Redone');
}

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x008200 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grid helper
const gridHelper = new THREE.GridHelper(100, 100);
scene.add(gridHelper);

// Orbit controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

// Game save/load functionality
// Get references to the DOM elements we added to HTML
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

// Variables to store pending save data
let pendingSaveData = null;
let pendingSaveId = null;

// Variables to track the currently loaded city
let currentCityId = null;
let currentCityName = null;
let currentCityDescription = null;

// Close the modal when close button is clicked
closeModalBtn.onclick = function() {
    loadModal.style.display = 'none';
};

// Close the modal when clicking outside the content
window.onclick = function(event) {
    if (event.target === loadModal) {
        loadModal.style.display = 'none';
    }
};

// Function to generate a unique save ID
function generateSaveId() {
    return `simcity_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// Function to get all saved cities
function getSavedCities() {
    const cities = [];
    
    // Loop through localStorage and find all simcity saves
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('simcity_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                cities.push({
                    id: key,
                    name: data.cityName || 'Unnamed City',
                    description: data.cityDescription || '',
                    timestamp: new Date(data.timestamp),
                    stats: data.stats,
                    buildings: data.buildings.length,
                    roads: data.roads.length
                });
            } catch (e) {
                console.error('Error parsing saved city:', e);
            }
        }
    }
    
    // Sort by most recent first
    cities.sort((a, b) => b.timestamp - a.timestamp);
    
    return cities;
}

// Function to populate the saved cities list
function populateSavedCitiesList() {
    savedCitiesList.innerHTML = '';
    
    const cities = getSavedCities();
    
    if (cities.length === 0) {
        const noSavesMsg = document.createElement('p');
        noSavesMsg.textContent = 'No saved cities found.';
        noSavesMsg.style.textAlign = 'center';
        noSavesMsg.style.color = '#666';
        savedCitiesList.appendChild(noSavesMsg);
        return;
    }
    
    cities.forEach(city => {
        // Create city item with CSS classes instead of inline styles
        const cityItem = document.createElement('div');
        cityItem.className = 'city-item';
        
        // City info
        const cityInfo = document.createElement('div');
        
        const cityNameElem = document.createElement('div');
        cityNameElem.className = 'city-name';
        cityNameElem.textContent = city.name;
        cityInfo.appendChild(cityNameElem);
        
        const cityDate = document.createElement('div');
        cityDate.className = 'city-date';
        cityDate.textContent = city.timestamp.toLocaleString();
        cityInfo.appendChild(cityDate);
        
        const cityStats = document.createElement('div');
        cityStats.className = 'city-stats';
        cityStats.textContent = `Population: ${Math.floor(city.stats.population)} | Buildings: ${city.buildings} | Roads: ${city.roads}`;
        cityInfo.appendChild(cityStats);
        
        if (city.description) {
            const cityDesc = document.createElement('div');
            cityDesc.className = 'city-description';
            cityDesc.textContent = city.description;
            cityInfo.appendChild(cityDesc);
        }
        
        cityItem.appendChild(cityInfo);
        
        // Action buttons
        const buttonsContainer = document.createElement('div');
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'load-btn';
        loadBtn.textContent = 'Load';
        loadBtn.onclick = function() {
            loadGameState(city.id);
            loadModal.style.display = 'none';
        };
        buttonsContainer.appendChild(loadBtn);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit Info';
        editBtn.onclick = function() {
            editCityInfo(city.id, city.name, city.description);
        };
        buttonsContainer.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = function() {
            if (confirm('Are you sure you want to delete this saved city?')) {
                localStorage.removeItem(city.id);
                populateSavedCitiesList();
                
                // Show notification
                showNotification('City deleted successfully');
            }
        };
        buttonsContainer.appendChild(deleteBtn);
        
        cityItem.appendChild(buttonsContainer);
        
        savedCitiesList.appendChild(cityItem);
    });
}

// Function to edit city info for an existing save
function editCityInfo(saveId, currentName, currentDescription) {
    // Store the save ID for later use
    pendingSaveId = saveId;
    
    // Load the existing save data
    const savedData = localStorage.getItem(saveId);
    if (!savedData) {
        console.error('Save data not found');
        return;
    }
    
    pendingSaveData = JSON.parse(savedData);
    
    // Set form values to current values
    cityNameInput.value = currentName || 'Unnamed City';
    cityDescriptionInput.value = currentDescription || '';
    
    // Show the form
    cityInfoForm.classList.remove('hidden');
    
    // Update the save button text to indicate we're editing
    saveCityInfoBtn.textContent = 'Update Info';
    
    // Hide the load modal while editing
    loadModal.style.display = 'none';
    
    // If this is the currently loaded city, update the current city info when done
    if (saveId === currentCityId) {
        saveCityInfoBtn.dataset.updateCurrent = 'true';
    } else {
        saveCityInfoBtn.dataset.updateCurrent = 'false';
    }
}

// Function to show the city info form for a new save
function showCityInfoForm() {
    // Set default values
    cityNameInput.value = 'My Awesome City';
    cityDescriptionInput.value = '';
    
    // Show the form
    cityInfoForm.classList.remove('hidden');
    
    // Make sure the save button has the correct text
    saveCityInfoBtn.textContent = 'Save';
}

// Function to hide the city info form
function hideCityInfoForm() {
    cityInfoForm.classList.add('hidden');
    
    // Reset pending save data if we're canceling a new save
    // (not when we're just finishing an edit)
    if (saveCityInfoBtn.textContent === 'Save') {
        pendingSaveData = null;
        pendingSaveId = null;
    }
}

// Function to complete the save process with city info
function completeSaveWithCityInfo() {
    if (!pendingSaveData || !pendingSaveId) {
        console.error('No pending save data');
        return;
    }
    
    // Add city name, description, and auto-save preference to the save data
    pendingSaveData.cityName = cityNameInput.value.trim() || 'Unnamed City';
    pendingSaveData.cityDescription = cityDescriptionInput.value.trim();
    pendingSaveData.autoSaveEnabled = autoSaveCheckbox.checked;
    
    // Save to localStorage
    localStorage.setItem(pendingSaveId, JSON.stringify(pendingSaveData));
    
    // Update auto-save ID if this is the most recent save
    if (localStorage.getItem('simcity_autosave_id') === pendingSaveId) {
        localStorage.setItem('simcity_autosave_id', pendingSaveId);
    }
    
    // Check if we need to update the current city information
    if (saveCityInfoBtn.dataset.updateCurrent === 'true' || pendingSaveId === currentCityId) {
        currentCityId = pendingSaveId;
        currentCityName = pendingSaveData.cityName;
        currentCityDescription = pendingSaveData.cityDescription;
    }
    
    // Hide the form
    hideCityInfoForm();
    
    // Show save notification
    showNotification(`City "${pendingSaveData.cityName}" saved!`);
    
    console.log('Game state saved with ID:', pendingSaveId);
    
    // Reset the save button text
    saveCityInfoBtn.textContent = 'Save';
    
    // Reset the dataset attribute
    saveCityInfoBtn.dataset.updateCurrent = 'false';
    
    // If we were editing from the load modal, show it again
    if (loadModal.style.display === 'none' && document.activeElement !== saveButton) {
        loadModal.style.display = 'block';
        populateSavedCitiesList(); // Refresh the list
    }
    
    // Reset the unsaved changes flag
    hasUnsavedChanges = false;
}

// Save game state to localStorage
function saveGameState() {
    // Show loading spinner
    loadingSpinner.classList.remove('hidden');
    
    setTimeout(() => {
        // Save buildings
        const buildingsData = [];
        cityGrid.forEach((building, key) => {
            const [x, z] = key.split('_').map(Number);
            buildingsData.push({
                x,
                z,
                type: building.type,
                rotation: building.rotation
            });
        });

        // Save roads
        const roadsData = [];
        roadGrid.forEach((roadInfo, key) => {
            const [x, z] = key.split('_').map(Number);
            roadsData.push({
                x,
                z,
                roadType: roadInfo.roadType
            });
        });

        // Save game stats
        const gameStats = {
            numResidential,
            numCommercial,
            numIndustrial,
            population
        };

        // Create save data object
        const saveData = {
            buildings: buildingsData,
            roads: roadsData,
            stats: gameStats,
            timestamp: new Date().toISOString()
        };

        // Check if we're saving a previously loaded city
        if (currentCityId && currentCityName) {
            // Reuse the existing city ID, name, and description
            saveData.cityName = currentCityName;
            saveData.cityDescription = currentCityDescription || '';
            
            // Save directly without showing the form
            localStorage.setItem(currentCityId, JSON.stringify(saveData));
            
            // Update auto-save ID to the most recent save
            localStorage.setItem('simcity_autosave_id', currentCityId);
            
            // Reset the unsaved changes flag
            hasUnsavedChanges = false;
            
            // Hide loading spinner
            loadingSpinner.classList.add('hidden');
            
            // Show save notification
            showNotification(`City "${currentCityName}" saved!`);
            
            console.log('Game state saved with ID:', currentCityId);
        } else {
            // Generate a new save ID for a new city
            const saveId = generateSaveId();
            
            // Store pending save data
            pendingSaveData = saveData;
            pendingSaveId = saveId;
            
            // Hide loading spinner
            loadingSpinner.classList.add('hidden');
            
            // Show city info form to get name and description
            showCityInfoForm();
        }
    }, 100); // Small delay to ensure UI updates
}

// Load game state from localStorage
function loadGameState(saveId) {
    // Show loading spinner
    loadingSpinner.classList.remove('hidden');
    
    setTimeout(() => {
        const savedData = saveId ? 
            localStorage.getItem(saveId) : 
            localStorage.getItem(localStorage.getItem('simcity_autosave_id') || '');
        
        if (!savedData) {
            console.log('No saved game found');
            showNotification('No saved game found');
            loadingSpinner.classList.add('hidden');
            return false;
        }
        
        try {
            // Parse the saved data
            const data = JSON.parse(savedData);
            
            // Clear current city
            cityGrid.forEach((building, key) => {
                scene.remove(building);
            });
            roadGrid.forEach((roadInfo, key) => {
                scene.remove(roadInfo.mesh);
            });
            
            cityGrid.clear();
            roadGrid.clear();
            
            // Reset counters
            numResidential = data.stats.numResidential || 0;
            numCommercial = data.stats.numCommercial || 0;
            numIndustrial = data.stats.numIndustrial || 0;
            population = data.stats.population || 0;
            
            // Rebuild roads first (so buildings detect them correctly)
            data.roads.forEach(roadData => {
                const roadType = roadData.roadType;
                const roadGroup = createRoadGroup(roadType);
                roadGroup.position.set(roadData.x + 0.5, 0.005, roadData.z + 0.5);
                scene.add(roadGroup);
                roadGrid.set(`${roadData.x}_${roadData.z}`, { mesh: roadGroup, roadType });
            });
            
            // Rebuild buildings
            if (data.buildings && Array.isArray(data.buildings)) {
                
                // Filter and sanitize building data
                const sanitizedBuildings = data.buildings
                    .map(buildingData => sanitizeBuildingData(buildingData))
                    .filter(building => building !== null);
                
                
                sanitizedBuildings.forEach((buildingData, index) => {
                    const building = placeBuilding(buildingData.type, buildingData.x, buildingData.z, buildingData.rotation, true);
                    if (building) {
                        if (building.type === 'residential' || building.type === 'commercial') {
                        }
                    } else {
                        console.error(`[DEBUG] Failed to place ${buildingData.type} building at ${buildingData.x},${buildingData.z}`);
                    }
                });
                
                
                // Ensure all buildings are visible with proper materials
                ensureBuildingVisibility();
            } else {
                console.error('[DEBUG] No buildings data or invalid format:', data.buildings);
            }
            
            // Update UI
            document.getElementById('population-display').textContent = `Population: ${Math.floor(population)}`;
            
            // Store current city information
            currentCityId = saveId;
            currentCityName = data.cityName || 'Unnamed City';
            currentCityDescription = data.cityDescription || '';
            
            // Restore auto-save preference if it exists in the save data
            if (data.autoSaveEnabled !== undefined) {
                autoSaveCheckbox.checked = data.autoSaveEnabled;
                if (data.autoSaveEnabled) {
                    startAutoSave();
                } else {
                    stopAutoSave();
                }
            }
            
            // Reset camera position to ensure buildings are visible
            // Find the center of the city based on buildings
            if (data.buildings && data.buildings.length > 0) {
                let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                
                data.buildings.forEach(building => {
                    minX = Math.min(minX, building.x);
                    maxX = Math.max(maxX, building.x);
                    minZ = Math.min(minZ, building.z);
                    maxZ = Math.max(maxZ, building.z);
                });
                
                // Calculate center and size of city
                const centerX = (minX + maxX) / 2;
                const centerZ = (minZ + maxZ) / 2;
                const sizeX = Math.max(10, maxX - minX + 10); // Add padding
                const sizeZ = Math.max(10, maxZ - minZ + 10); // Add padding
                
                // Position camera to view the entire city
                const distance = Math.max(sizeX, sizeZ) * 1.5;
                camera.position.set(centerX + distance, distance, centerZ + distance);
                camera.lookAt(centerX, 0, centerZ);
            }
            
            // Force a scene update
            renderer.render(scene, camera);
            
            // Hide loading spinner
            loadingSpinner.classList.add('hidden');
            
            console.log(`Game loaded successfully from ${data.timestamp}`);
            
            // Show load notification with city name if available
            showNotification(`City "${currentCityName}" loaded successfully`);
        
            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            
            // Hide loading spinner
            loadingSpinner.classList.add('hidden');
            
            // Show error notification
            showNotification('Error loading city');
            
            return false;
        }
    }, 100); // Small delay to ensure UI updates
}

// Create a new city (clear everything)
function createNewCity() {
    // Confirm before clearing
    if (!confirm('Are you sure you want to start a new city? All unsaved progress will be lost.')) {
        return;
    }
    
    // Clear current city
    cityGrid.forEach((building, key) => {
        scene.remove(building);
    });
    
    roadGrid.forEach((roadInfo, key) => {
        scene.remove(roadInfo.mesh);
    });
    
    cityGrid.clear();
    roadGrid.clear();
    
    // Reset counters
    numResidential = 0;
    numCommercial = 0;
    numIndustrial = 0;
    population = 0;
    
    // Reset current city information
    currentCityId = null;
    currentCityName = null;
    currentCityDescription = null;
    
    // Update UI
    document.getElementById('population-display').textContent = `Population: ${Math.floor(population)}`;
    
    // Show notification
    showNotification('Started a new city');    
    console.log('Created new city');
}

// Function to save the game with a new name and description
function saveAsGameState() {
    // Show loading spinner
    loadingSpinner.classList.remove('hidden');
    
    setTimeout(() => {
        // Save buildings
        const buildingsData = [];
        cityGrid.forEach((building, key) => {
            const [x, z] = key.split('_').map(Number);
            buildingsData.push({
                x,
                z,
                type: building.type,
                rotation: building.rotation
            });
        });

        // Save roads
        const roadsData = [];
        roadGrid.forEach((roadInfo, key) => {
            const [x, z] = key.split('_').map(Number);
            roadsData.push({
                x,
                z,
                roadType: roadInfo.roadType
            });
        });

        // Save game stats
        const gameStats = {
            numResidential,
            numCommercial,
            numIndustrial,
            population
        };

        // Create save data object
        const saveData = {
            buildings: buildingsData,
            roads: roadsData,
            stats: gameStats,
            timestamp: new Date().toISOString()
        };

        // Generate a new save ID for the "Save As" operation
        const saveId = generateSaveId();
        
        // Store pending save data
        pendingSaveData = saveData;
        pendingSaveId = saveId;
        
        // Hide loading spinner
        loadingSpinner.classList.add('hidden');
        
        // Pre-fill the form with current values if available
        if (currentCityName) {
            cityNameInput.value = currentCityName;
            cityDescriptionInput.value = currentCityDescription || '';
        } else {
            cityNameInput.value = 'My Awesome City';
            cityDescriptionInput.value = '';
        }
        
        // Show city info form to get name and description
        cityInfoForm.classList.remove('hidden');
        saveCityInfoBtn.textContent = 'Save';
    }, 100); // Small delay to ensure UI updates
}

// Event listeners for buttons
newCityButton.addEventListener('click', createNewCity);
saveButton.addEventListener('click', saveGameState);
saveAsButton.addEventListener('click', saveAsGameState);
loadButton.addEventListener('click', () => {
    // Populate the list of saved cities
    populateSavedCitiesList();
    // Show the modal
    loadModal.style.display = 'block';
});

// City info form event listeners
saveCityInfoBtn.addEventListener('click', () => {
    completeSaveWithCityInfo();
});

cancelCityInfoBtn.addEventListener('click', () => {
    if (confirm('Cancel saving? Your city will not be saved.')) {
        hideCityInfoForm();
    }
});

// Auto-save functionality (every 60 seconds)
const AUTO_SAVE_INTERVAL = 60000; // 1 minute
let autoSaveTimer;

// Default city name and description for auto-saves
let defaultCityName = 'Auto-saved City';
let defaultCityDescription = 'This city was automatically saved.';

// Flag to track if changes have been made since last save
let hasUnsavedChanges = false;

function startAutoSave() {
    autoSaveTimer = setInterval(() => {
        if (autoSaveCheckbox.checked && hasUnsavedChanges) {
            // Auto-save without showing the form
            autoSaveGameState();
            // Reset the flag after saving
            hasUnsavedChanges = false;
        }
    }, AUTO_SAVE_INTERVAL);
}

function stopAutoSave() {
    clearInterval(autoSaveTimer);
}

// Function for auto-saving without showing the form
function autoSaveGameState() {
    // Save buildings
    const buildingsData = [];
    cityGrid.forEach((building, key) => {
        const [x, z] = key.split('_').map(Number);
        buildingsData.push({
            x,
            z,
            type: building.type,
            rotation: building.rotation
        });
    });

    // Save roads
    const roadsData = [];
    roadGrid.forEach((roadInfo, key) => {
        const [x, z] = key.split('_').map(Number);
        roadsData.push({
            x,
            z,
            roadType: roadInfo.roadType
        });
    });

    // Save game stats
    const gameStats = {
        numResidential,
        numCommercial,
        numIndustrial,
        population
    };

    // Create save data object with city name and description
    const saveData = {
        buildings: buildingsData,
        roads: roadsData,
        stats: gameStats,
        timestamp: new Date().toISOString(),
        cityName: currentCityName || defaultCityName,
        cityDescription: currentCityDescription || defaultCityDescription
    };

    // Generate save ID
    const saveId = generateSaveId();
    
    // Save to localStorage
    localStorage.setItem(saveId, JSON.stringify(saveData));
    
    // Update auto-save ID to the most recent save
    localStorage.setItem('simcity_autosave_id', saveId);
    
    // Show save notification
    showNotification(`Auto-saved: ${new Date().toLocaleTimeString()}`);
    
    console.log('Game auto-saved with ID:', saveId);
}

autoSaveCheckbox.addEventListener('change', () => {
    if (autoSaveCheckbox.checked) {
        startAutoSave();
    } else {
        stopAutoSave();
    }
});

// Start auto-save on game load
startAutoSave();

// Try to load saved game on startup
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Try to load the most recent autosave
        const autosaveId = localStorage.getItem('simcity_autosave_id');
        if (autosaveId) {
            loadGameState(autosaveId);
        }
    }, 500); // Small delay to ensure all components are ready
});

// Function to update button styles based on selection
function updateButtonStyles() {
    // Reset all buttons to default style
    document.getElementById('residential-btn').classList.remove('selected');
    document.getElementById('commercial-btn').classList.remove('selected');
    document.getElementById('industrial-btn').classList.remove('selected');
    document.getElementById('road-btn').classList.remove('selected');
    document.getElementById('bulldozer-btn').classList.remove('selected');
    
    // Reset building preview scale (in case it was modified for bulldozer)
    buildingPreview.scale.set(1, 1, 1);
    
    // Highlight the selected button
    if (selectedBuildingType) {
        document.getElementById(`${selectedBuildingType}-btn`).classList.add('selected');
    }
}

// Building and road selection
let selectedBuildingType = null;
let currentRotation = 0; // 0 = 0 degrees, 1 = 90 degrees, 2 = 180 degrees, 3 = 270 degrees

document.getElementById('residential-btn').addEventListener('click', () => {
    selectedBuildingType = 'residential';
    currentRotation = 0;
    updateButtonStyles();
});
document.getElementById('commercial-btn').addEventListener('click', () => {
    selectedBuildingType = 'commercial';
    currentRotation = 0;
    updateButtonStyles();
});
document.getElementById('industrial-btn').addEventListener('click', () => {
    selectedBuildingType = 'industrial';
    currentRotation = 0;
    updateButtonStyles();
});
document.getElementById('road-btn').addEventListener('click', () => {
    selectedBuildingType = 'road';
    currentRotation = 0;
    updateButtonStyles();
});
document.getElementById('bulldozer-btn').addEventListener('click', () => {
    selectedBuildingType = 'bulldozer';
    currentRotation = 0; // Rotation doesn't matter for bulldozer
    updateButtonStyles();
});

// Enhanced keyboard event listener for selection and rotation
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    
    // Handle undo with Command+Z (Mac) or Ctrl+Z (Windows)
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && key === 'z') {
        event.preventDefault(); // Prevent browser's default undo
        undoLastAction();
        return;
    }
    
    // Handle redo with Command+Shift+Z (Mac) or Ctrl+Shift+Z (Windows)
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && key === 'z') {
        event.preventDefault(); // Prevent browser's default redo
        redoLastAction();
        return;
    }
    
    // Handle selection keys
    if (key === 'h') {
        // Residential buildings
        if (selectedBuildingType === 'residential') {
            // Already selected, so rotate
            currentRotation = (currentRotation + 1) % 4;
            console.log(`Rotated residential to ${currentRotation * 90} degrees`);
        } else {
            selectedBuildingType = 'residential';
            currentRotation = 0;
            console.log('Selected residential buildings');
        }
        updateButtonStyles();
    } else if (key === 'c') {
        // Commercial buildings
        if (selectedBuildingType === 'commercial') {
            // Already selected, so rotate
            currentRotation = (currentRotation + 1) % 4;
            console.log(`Rotated commercial to ${currentRotation * 90} degrees`);
        } else {
            selectedBuildingType = 'commercial';
            currentRotation = 0;
            console.log('Selected commercial buildings');
        }
        updateButtonStyles();
    } else if (key === 'i') {
        // Industrial buildings
        if (selectedBuildingType === 'industrial') {
            // Already selected, so rotate
            currentRotation = (currentRotation + 1) % 4;
            console.log(`Rotated industrial to ${currentRotation * 90} degrees`);
        } else {
            selectedBuildingType = 'industrial';
            currentRotation = 0;
            console.log('Selected industrial buildings');
        }
        updateButtonStyles();
    } else if (key === 'r') {
        // Roads
        if (selectedBuildingType === 'road') {
            // Already selected, so rotate
            currentRotation = (currentRotation + 1) % 4;
            console.log(`Rotated road to ${currentRotation * 90} degrees`);
        } else {
            selectedBuildingType = 'road';
            currentRotation = 0;
            console.log('Selected roads');
        }
        updateButtonStyles();
    } else if (key === 'b') {
        // Bulldozer
        selectedBuildingType = 'bulldozer';
        currentRotation = 0; // Rotation doesn't matter for bulldozer
        console.log('Selected bulldozer');
        updateButtonStyles();
    } else if (key === 'escape') {
        // Deselect the current building type
        selectedBuildingType = null;
        updateButtonStyles();
        console.log('Selection cleared');
    }
});

// City grid and road grid
const cityGrid = new Map();
const roadGrid = new Map();
const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });

// Building counters and population
let numResidential = 0;
let numCommercial = 0;
let numIndustrial = 0;
let population = 0;

// Road materials
const sidewalkMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc }); // Light gray for sidewalks
const laneLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

// Road type enum (for clarity)
const RoadType = {
    STRAIGHT_H: 0,  // Horizontal straight road
    STRAIGHT_V: 1,  // Vertical straight road
    CORNER_NE: 2,   // Northeast corner (connects North and East)
    CORNER_NW: 3,   // Northwest corner (connects North and West)
    CORNER_SE: 4,   // Southeast corner (connects South and East)
    CORNER_SW: 5,   // Southwest corner (connects South and West)
    T_N: 6,         // T-intersection with opening to North
    T_E: 7,         // T-intersection with opening to East
    T_S: 8,         // T-intersection with opening to South
    T_W: 9,         // T-intersection with opening to West
    CROSS: 10       // 4-way intersection
};

// Function to detect adjacent roads and determine appropriate road type
function detectRoadConnections(x, z) {
    const north = roadGrid.has(`${x}_${z-1}`);
    const east = roadGrid.has(`${x+1}_${z}`);
    const south = roadGrid.has(`${x}_${z+1}`);
    const west = roadGrid.has(`${x-1}_${z}`);
    
    const connections = [north, east, south, west];
    const connectionCount = connections.filter(Boolean).length;
    
    // No connections - use current rotation for straight road
    if (connectionCount === 0) {
        return currentRotation % 2 === 0 ? RoadType.STRAIGHT_H : RoadType.STRAIGHT_V;
    }
    
    // One connection - align to that connection
    if (connectionCount === 1) {
        if (north) return RoadType.STRAIGHT_V;
        if (east) return RoadType.STRAIGHT_H;
        if (south) return RoadType.STRAIGHT_V;
        if (west) return RoadType.STRAIGHT_H;
    }
    
    // Two connections
    if (connectionCount === 2) {
        // Straight road
        if (north && south) return RoadType.STRAIGHT_V;
        if (east && west) return RoadType.STRAIGHT_H;
        
        // Corner road
        if (north && east) return RoadType.CORNER_NE;
        if (north && west) return RoadType.CORNER_NW;
        if (south && east) return RoadType.CORNER_SE;
        if (south && west) return RoadType.CORNER_SW;
    }
    
    // Three connections - T intersection
    if (connectionCount === 3) {
        if (!north) return RoadType.T_N;
        if (!east) return RoadType.T_E;
        if (!south) return RoadType.T_S;
        if (!west) return RoadType.T_W;
    }
    
    // Four connections - crossroads
    return RoadType.CROSS;
}

// Function to remove buildings or roads at a location
function bulldoze(x, z, skipUndoStack = false) {
    const key = `${x}_${z}`;
    
    // Check for and remove buildings
    if (cityGrid.has(key)) {
        const building = cityGrid.get(key);
        scene.remove(building);
        
        // Add to undo stack before removing
        if (!skipUndoStack) {
            addToUndoStack({
                type: 'bulldoze',
                objectType: 'building',
                buildingType: building.type,
                x,
                z,
                rotation: building.rotation
            });
        }
        
        // Update counters
        if (building.type === 'residential') numResidential--;
        else if (building.type === 'commercial') numCommercial--;
        else if (building.type === 'industrial') numIndustrial--;
        
        cityGrid.delete(key);
        console.log(`Bulldozed building at ${x}, ${z}`);
        
        // After removing a building, update adjacent roads
        updateAdjacentRoads(x, z);
        return true;
    }
    
    // Check for and remove roads
    if (roadGrid.has(key)) {
        const roadInfo = roadGrid.get(key);
        
        // Add to undo stack before removing
        if (!skipUndoStack) {
            addToUndoStack({
                type: 'bulldoze',
                objectType: 'road',
                roadType: roadInfo.roadType,
                x,
                z
            });
        }
        
        scene.remove(roadInfo.mesh);
        roadGrid.delete(key);
        console.log(`Bulldozed road at ${x}, ${z}`);
        
        // After removing a road, update adjacent roads
        updateAdjacentRoads(x, z);
        return true;
    }
    
    console.log('Nothing to bulldoze here');
    return false;
}

// Create road group based on road type
function createRoadGroup(roadType) {
    const roadGroup = new THREE.Group();
    
    // Main road segment creation functions
    const createHorizontalRoad = () => {
        const roadGeometry = new THREE.BoxGeometry(1.0, 0.01, 0.8);
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        roadGroup.add(road);
        
        // Add lane divider
        for (let i = -0.4; i <= 0.4; i += 0.2) {
            const dotGeometry = new THREE.BoxGeometry(0.1, 0.015, 0.02);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            dot.position.set(i, 0.002, 0);
            roadGroup.add(dot);
        }
        
        // Add sidewalks
        const sidewalk1 = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.015, 0.1),
            sidewalkMaterial
        );
        const sidewalk2 = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.015, 0.1),
            sidewalkMaterial
        );
        
        sidewalk1.position.set(0, 0, -0.45);
        sidewalk2.position.set(0, 0, 0.45);
        
        roadGroup.add(sidewalk1);
        roadGroup.add(sidewalk2);
    };
    
    const createVerticalRoad = () => {
        const roadGeometry = new THREE.BoxGeometry(0.8, 0.01, 1.0);
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        roadGroup.add(road);
        
        // Add lane divider
        for (let i = -0.4; i <= 0.4; i += 0.2) {
            const dotGeometry = new THREE.BoxGeometry(0.02, 0.015, 0.1);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            dot.position.set(0, 0.002, i);
            roadGroup.add(dot);
        }
        
        // Add sidewalks
        const sidewalk1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.015, 1.0),
            sidewalkMaterial
        );
        const sidewalk2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.015, 1.0),
            sidewalkMaterial
        );
        
        sidewalk1.position.set(-0.45, 0, 0);
        sidewalk2.position.set(0.45, 0, 0);
        
        roadGroup.add(sidewalk1);
        roadGroup.add(sidewalk2);
    };
    
    const createCorner = (ne, nw, se, sw) => {
        // Create the corner road piece - we'll use a curved shape
        const roadWidth = 0.8;
        const sideLength = 1.0;
        
        // Create the basic road surface as a plane
        const roadGeometry = new THREE.PlaneGeometry(sideLength, sideLength);
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
        roadGroup.add(road);
        
        // Determine curve parameters based on which corner we're creating
        let startAngle, endAngle, clockwise;
        let curveOffsetX = 0, curveOffsetZ = 0;
        
        if (ne) {
            // Northeast corner - cars going from North to East or East to North
            startAngle = Math.PI;
            endAngle = Math.PI * 1.5;
            clockwise = false;
            curveOffsetX = 0.5;
            curveOffsetZ = -0.5;
        } else if (nw) {
            // Northwest corner - cars going from North to West or West to North
            startAngle = Math.PI * 1.5;
            endAngle = Math.PI * 2;
            clockwise = false;
            curveOffsetX = -0.5;
            curveOffsetZ = -0.5;
        } else if (se) {
            // Southeast corner - cars going from South to East or East to South
            startAngle = Math.PI * 0.5;
            endAngle = Math.PI;
            clockwise = false;
            curveOffsetX = 0.5;
            curveOffsetZ = 0.5;
        } else if (sw) {
            // Southwest corner - cars going from South to West or West to South
            startAngle = 0;
            endAngle = Math.PI * 0.5;
            clockwise = false;
            curveOffsetX = -0.5;
            curveOffsetZ = 0.5;
        }
        
        // Create curved lane divider following the proper direction
        const curve = new THREE.EllipseCurve(
            curveOffsetX, curveOffsetZ,  // Center x, y
            0.4, 0.4,                    // x radius, y radius - smaller to keep points within grid square
            startAngle, endAngle,        // Start angle, end angle
            clockwise,                   // Clockwise
            0                            // Rotation
        );
        
        const points = curve.getPoints(12);
        
        // Create a series of small boxes along the curve to represent the dotted line
        for (let i = 1; i < points.length - 1; i += 2) {
            const dotGeometry = new THREE.BoxGeometry(0.05, 0.015, 0.05);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            
            // Position the dot at the curve point - clamp coordinates to stay within the grid square
            let x = Math.max(-0.5, Math.min(0.5, points[i].x));
            let z = Math.max(-0.5, Math.min(0.5, points[i].y));
            dot.position.set(x, 0.002, z);
            
            roadGroup.add(dot);
        }
        
        // Add appropriate corner sidewalks - we need two L-shaped sidewalks
        // For simplicity, we'll use multiple box geometries
        
        // First sidewalk (outer corner)
        const outerSidewalk1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.015, 1.0),
            sidewalkMaterial
        );
        const outerSidewalk2 = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.015, 0.1),
            sidewalkMaterial
        );
        
        // Second sidewalk (inner corner)
        const innerSidewalk1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.015, 0.9),
            sidewalkMaterial
        );
        const innerSidewalk2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.015, 0.1),
            sidewalkMaterial
        );
        
        if (ne) {
            // Northeast corner
            outerSidewalk1.position.set(0.45, 0, 0);
            outerSidewalk2.position.set(0, 0, -0.45);
            innerSidewalk1.position.set(-0.45, 0, -0.05);
            innerSidewalk2.position.set(-0.05, 0, 0.45);
        } else if (nw) {
            // Northwest corner
            outerSidewalk1.position.set(-0.45, 0, 0);
            outerSidewalk2.position.set(0, 0, -0.45);
            innerSidewalk1.position.set(0.45, 0, -0.05);
            innerSidewalk2.position.set(0.05, 0, 0.45);
        } else if (se) {
            // Southeast corner
            outerSidewalk1.position.set(0.45, 0, 0);
            outerSidewalk2.position.set(0, 0, 0.45);
            innerSidewalk1.position.set(-0.45, 0, 0.05);
            innerSidewalk2.position.set(-0.05, 0, -0.45);
        } else if (sw) {
            // Southwest corner
            outerSidewalk1.position.set(-0.45, 0, 0);
            outerSidewalk2.position.set(0, 0, 0.45);
            innerSidewalk1.position.set(0.45, 0, 0.05);
            innerSidewalk2.position.set(0.05, 0, -0.45);
        }
        
        // something is wrong with the sidewalks here
        // roadGroup.add(outerSidewalk1);
        // roadGroup.add(outerSidewalk2);
        // roadGroup.add(innerSidewalk1);
        roadGroup.add(innerSidewalk2);
    };
    
    const createTIntersection = (openNorth, openEast, openSouth, openWest) => {
        // Create the basic road surface
        const roadGeometry = new THREE.PlaneGeometry(1.0, 1.0);
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
        roadGroup.add(road);
        
        // Add lane markers - we'll do a + shape
        // Horizontal line
        for (let i = -0.4; i <= 0.4; i += 0.2) {
            const dotGeometry = new THREE.BoxGeometry(0.1, 0.015, 0.02);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            dot.position.set(i, 0.002, 0);
            roadGroup.add(dot);
        }
        
        // Vertical line
        for (let i = -0.4; i <= 0.4; i += 0.2) {
            const dotGeometry = new THREE.BoxGeometry(0.02, 0.015, 0.1);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            dot.position.set(0, 0.002, i);
            roadGroup.add(dot);
        }
        
        // Determine which side is closed (no road connecting)
        let closedSide;
        if (!openNorth) closedSide = 'north';
        else if (!openEast) closedSide = 'east';
        else if (!openSouth) closedSide = 'south';
        else if (!openWest) closedSide = 'west';
        
        // Add corner sidewalks on the closed side
        // Add crosswalks on the open sides
        const crosswalkMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: false,
            opacity: 1.0
        });
        
        if (closedSide === 'north') {
            // North side is closed - add sidewalk on north side
            const northSidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.015, 0.1),
                sidewalkMaterial
            );
            northSidewalk.position.set(0, 0, -0.45);
            roadGroup.add(northSidewalk);
            
            // Add corner sidewalks
            const nwCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            nwCorner.position.set(-0.45, 0, -0.45);
            
            const neCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            neCorner.position.set(0.45, 0, -0.45);
            
            roadGroup.add(nwCorner);
            roadGroup.add(neCorner);
            
            // Add east-west crosswalks
            const eastCrosswalk = createCrosswalk(false);
            eastCrosswalk.position.set(0.45, 0.001, 0);
            eastCrosswalk.rotation.y = Math.PI / 2;  // Add rotation
            
            const westCrosswalk = createCrosswalk(false);
            westCrosswalk.position.set(-0.45, 0.001, 0);
            westCrosswalk.rotation.y = Math.PI / 2;  // Add rotation
            
            roadGroup.add(eastCrosswalk);
            roadGroup.add(westCrosswalk);
            
            // Add south crosswalk
            const southCrosswalk = createCrosswalk(true);
            southCrosswalk.position.set(0, 0.001, 0.45);
            southCrosswalk.rotation.y = Math.PI / 2;  // Add rotation
            roadGroup.add(southCrosswalk);
            
        } else if (closedSide === 'east') {
            // East side is closed - add sidewalk on east side
            const eastSidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.8),
                sidewalkMaterial
            );
            eastSidewalk.position.set(0.45, 0, 0);
            roadGroup.add(eastSidewalk);
            
            // Add corner sidewalks
            const neCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            neCorner.position.set(0.45, 0, -0.45);
            
            const seCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            seCorner.position.set(0.45, 0, 0.45);
            
            roadGroup.add(neCorner);
            roadGroup.add(seCorner);
            
            // Add north-south crosswalks
            const northCrosswalk = createCrosswalk(true);
            northCrosswalk.position.set(0, 0.001, -0.45);
            northCrosswalk.rotation.y = Math.PI / 2;
            
            const southCrosswalk = createCrosswalk(true);
            southCrosswalk.position.set(0, 0.001, 0.45);
            southCrosswalk.rotation.y = Math.PI / 2;

            roadGroup.add(northCrosswalk);
            roadGroup.add(southCrosswalk);
            
            // Add west crosswalk
            const westCrosswalk = createCrosswalk(false);
            westCrosswalk.position.set(-0.45, 0.001, 0);
            westCrosswalk.rotation.y = Math.PI / 2;
            
            roadGroup.add(westCrosswalk);
            
        } else if (closedSide === 'south') {
            // South side is closed - add sidewalk on south side
            const southSidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.015, 0.1),
                sidewalkMaterial
            );
            southSidewalk.position.set(0, 0, 0.45);
            roadGroup.add(southSidewalk);
            
            // Add corner sidewalks
            const swCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            swCorner.position.set(-0.45, 0, 0.45);
            
            const seCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            seCorner.position.set(0.45, 0, 0.45);
            
            roadGroup.add(swCorner);
            roadGroup.add(seCorner);
            
            // Add east-west crosswalks
            const eastCrosswalk = createCrosswalk(false);
            eastCrosswalk.position.set(0.45, 0.001, 0);
            
            const westCrosswalk = createCrosswalk(false);
            westCrosswalk.position.set(-0.45, 0.001, 0);
            
            roadGroup.add(eastCrosswalk);
            roadGroup.add(westCrosswalk);
            
            // Add north crosswalk
            const northCrosswalk = createCrosswalk(true);
            northCrosswalk.position.set(0, 0.001, -0.45);
            roadGroup.add(northCrosswalk);
            
        } else if (closedSide === 'west') {
            // West side is closed - add sidewalk on west side
            const westSidewalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.8),
                sidewalkMaterial
            );
            westSidewalk.position.set(-0.45, 0, 0);
            roadGroup.add(westSidewalk);
            
            // Add corner sidewalks
            const nwCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            nwCorner.position.set(-0.45, 0, -0.45);
            
            const swCorner = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                sidewalkMaterial
            );
            swCorner.position.set(-0.45, 0, 0.45);
            
            roadGroup.add(nwCorner);
            roadGroup.add(swCorner);
            
            // Add north-south crosswalks
            const northCrosswalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.02),
                laneLineMaterial
            );
            northCrosswalk.position.set(0, 0.002, -0.45);
            roadGroup.add(northCrosswalk);
            
            const southCrosswalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.02),
                laneLineMaterial
            );
            southCrosswalk.position.set(0, 0.002, 0.45);
            roadGroup.add(southCrosswalk);
            
            // Add east crosswalk
            const eastCrosswalk = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.015, 0.1),
                laneLineMaterial
            );
            eastCrosswalk.position.set(0.45, 0.002, 0);
            roadGroup.add(eastCrosswalk);
        }
    };
    
    const createCrosswalk = (isVertical) => {
        // Create a crosswalk with zebra stripes
        const crosswalkGroup = new THREE.Group();
        const crosswalkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Create zebra stripes
        const stripeCount = 5;
        const stripeWidth = 0.06;
        const stripeGap = 0.06;
        const stripeLength = 0.3;
        
        if (isVertical) {
            // Vertical crosswalk (pedestrians moving north-south across east-west street)
            for (let i = 0; i < stripeCount; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.004, stripeWidth),
                    crosswalkMaterial
                );
                
                // Position stripes evenly centered on the crosswalk
                const offset = (i - (stripeCount-1)/2) * (stripeWidth + stripeGap);
                stripe.position.set(0, 0, offset);
                
                crosswalkGroup.add(stripe);
            }
        } else {
            // Horizontal crosswalk (pedestrians moving east-west across north-south street)
            for (let i = 0; i < stripeCount; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(stripeWidth, 0.004, 0.3),
                    crosswalkMaterial
                );
                
                // Position stripes evenly centered on the crosswalk
                const offset = (i - (stripeCount-1)/2) * (stripeWidth + stripeGap);
                stripe.position.set(offset, 0, 0);
                
                crosswalkGroup.add(stripe);
            }
        }
        
        return crosswalkGroup;
    };
    
    const create4WayIntersection = () => {
        // Create the basic road surface
        const roadGeometry = new THREE.PlaneGeometry(1.0, 1.0);
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
        roadGroup.add(road);
        
        // Add lane markers - we'll do a + shape
        // Horizontal line
        for (let i = -0.4; i <= 0.4; i += 0.2) {
            const dotGeometry = new THREE.BoxGeometry(0.1, 0.015, 0.02);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            dot.position.set(i, 0.002, 0);
            roadGroup.add(dot);
        }
        
        // Vertical line
        for (let i = -0.4; i <= 0.4; i += 0.2) {
            const dotGeometry = new THREE.BoxGeometry(0.02, 0.015, 0.1);
            const dot = new THREE.Mesh(dotGeometry, laneLineMaterial);
            dot.position.set(0, 0.002, i);
            roadGroup.add(dot);
        }
        
        // Add corner sidewalks at the four corners
        const cornerSize = 0.1;
        
        // Northeast corner
        const neSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(cornerSize, 0.015, cornerSize),
            sidewalkMaterial
        );
        neSidewalk.position.set(0.45, 0, -0.45);
        
        // Northwest corner
        const nwSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(cornerSize, 0.015, cornerSize),
            sidewalkMaterial
        );
        nwSidewalk.position.set(-0.45, 0, -0.45);
        
        // Southeast corner
        const seSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(cornerSize, 0.015, cornerSize),
            sidewalkMaterial
        );
        seSidewalk.position.set(0.45, 0, 0.45);
        
        // Southwest corner
        const swSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(cornerSize, 0.015, cornerSize),
            sidewalkMaterial
        );
        swSidewalk.position.set(-0.45, 0, 0.45);
        
        roadGroup.add(neSidewalk);
        roadGroup.add(nwSidewalk);
        roadGroup.add(seSidewalk);
        roadGroup.add(swSidewalk);
        
        // Add crosswalks in all four directions
        const northCrosswalk = createCrosswalk(true);
        northCrosswalk.position.set(0, 0.001, -0.45);
        northCrosswalk.rotation.y = Math.PI / 2;
        
        const eastCrosswalk = createCrosswalk(false);
        eastCrosswalk.position.set(0.45, 0.001, 0);
        eastCrosswalk.rotation.y = Math.PI / 2;
        
        const southCrosswalk = createCrosswalk(true);
        southCrosswalk.position.set(0, 0.001, 0.45);
        southCrosswalk.rotation.y = Math.PI / 2;
        
        const westCrosswalk = createCrosswalk(false);
        westCrosswalk.position.set(-0.45, 0.001, 0);
        westCrosswalk.rotation.y = Math.PI / 2;
        
        roadGroup.add(northCrosswalk);
        roadGroup.add(eastCrosswalk);
        roadGroup.add(southCrosswalk);
        roadGroup.add(westCrosswalk);
    };
    
    // Create the appropriate road based on type
    switch (roadType) {
        case RoadType.STRAIGHT_H:
            createHorizontalRoad();
            break;
        case RoadType.STRAIGHT_V:
            createVerticalRoad();
            break;
        case RoadType.CORNER_NE:
            createCorner(true, false, false, false);
            break;
        case RoadType.CORNER_NW:
            createCorner(false, true, false, false);
            break;
        case RoadType.CORNER_SE:
            createCorner(false, false, true, false);
            break;
        case RoadType.CORNER_SW:
            createCorner(false, false, false, true);
            break;
        case RoadType.T_N:
            createTIntersection(true, false, false, false);
            break;
        case RoadType.T_E:
            createTIntersection(false, true, false, false);
            break;
        case RoadType.T_S:
            createTIntersection(false, false, true, false);
            break;
        case RoadType.T_W:
            createTIntersection(false, false, false, true);
            break;
        case RoadType.CROSS:
            create4WayIntersection();
            break;
    }
    
    return roadGroup;
}

// Place a road
function placeRoad(x, z, skipUndoStack = false) {
    if (x < -49 || x >= 49 || z < -49 || z >= 49) {
        console.log('Out of bounds');
        return;
    }
    
    const key = `${x}_${z}`;
    if (roadGrid.has(key)) {
        console.log('Road already exists');
        return;
    }
    
    // Detect the appropriate road type based on adjacent roads
    const roadType = detectRoadConnections(x, z);
    
    // Add to undo stack before placing
    if (!skipUndoStack) {
        addToUndoStack({
            type: 'place_road',
            x,
            z
        });
    }
    
    // Create the road group
    const roadGroup = createRoadGroup(roadType);
    roadGroup.position.set(x + 0.5, 0.005, z + 0.5);
    
    scene.add(roadGroup);
    roadGrid.set(key, { mesh: roadGroup, roadType: roadType });
    
    // After placing a road, we need to check and update adjacent roads
    // since their connections may have changed
    updateAdjacentRoads(x, z);
}

// Function to update adjacent roads when a new road is placed
function updateAdjacentRoads(x, z) {
    // Check all four adjacent cells
    const adjacentCells = [
        { x: x, z: z-1 },  // North
        { x: x+1, z: z },  // East
        { x: x, z: z+1 },  // South
        { x: x-1, z: z }   // West
    ];
    
    adjacentCells.forEach(cell => {
        const key = `${cell.x}_${cell.z}`;
        if (roadGrid.has(key)) {
            // Get the current road info
            const roadInfo = roadGrid.get(key);
            
            // Detect the new appropriate road type based on connections
            const newRoadType = detectRoadConnections(cell.x, cell.z);
            
            // If road type has changed, update it
            if (newRoadType !== roadInfo.roadType) {
                // Remove old road mesh
                scene.remove(roadInfo.mesh);
                
                // Create new road with updated type
                const newRoadGroup = createRoadGroup(newRoadType);
                newRoadGroup.position.set(cell.x + 0.5, 0.005, cell.z + 0.5);
                
                // Update scene and road grid
                scene.add(newRoadGroup);
                roadGrid.set(key, { mesh: newRoadGroup, roadType: newRoadType });
            }
        }
    });
}

// Click event handler
renderer.domElement.addEventListener('click', onClick, false);
function onClick(event) {
    if (selectedBuildingType) {
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Floor the coordinates to get the grid cell
            const gridX = Math.floor(point.x);
            const gridZ = Math.floor(point.z);
            
            if (selectedBuildingType === 'bulldozer') {
                bulldoze(gridX, gridZ);
            } else if (selectedBuildingType === 'road') {
                placeRoad(gridX, gridZ);
            } else {
                placeBuilding(selectedBuildingType, gridX, gridZ);
            }
        }
    }
}

// Animation loop with simulation
let lastTime = Date.now();
function animate() {
    requestAnimationFrame(animate);
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000; // in seconds
    lastTime = currentTime;

    // Simulation: Population growth
    const housingCapacity = numResidential * 10;
    const jobs = numCommercial * 5;
    if (population < housingCapacity && population < jobs) {
        const growthRate = 0.01 * Math.min(housingCapacity - population, jobs - population);
        population += growthRate * deltaTime;
    }

    // Update UI
    document.getElementById('population-display').textContent = `Population: ${Math.floor(population)}`;

    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// Define materials for previews
const previewMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
const roadPreviewMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });

// Building preview (a transparent cube)
const buildingPreviewGeometry = new THREE.BoxGeometry(0.8, 1, 0.8);
const buildingPreview = new THREE.Mesh(buildingPreviewGeometry, previewMaterial);
buildingPreview.visible = false;
scene.add(buildingPreview);

// Road preview - we'll create both horizontal and vertical geometries upfront
const horizontalRoadGeometry = new THREE.BoxGeometry(1.0, 0.01, 0.8);
const verticalRoadGeometry = new THREE.BoxGeometry(0.8, 0.01, 1.0);
const roadPreview = new THREE.Mesh(horizontalRoadGeometry, roadPreviewMaterial);
roadPreview.visible = false;
scene.add(roadPreview);

// Sidewalk preview geometries
const horizontalSidewalk1Geometry = new THREE.BoxGeometry(1.0, 0.015, 0.1);
const horizontalSidewalk2Geometry = new THREE.BoxGeometry(1.0, 0.015, 0.1);
const verticalSidewalk1Geometry = new THREE.BoxGeometry(0.1, 0.015, 1.0);
const verticalSidewalk2Geometry = new THREE.BoxGeometry(0.1, 0.015, 1.0);

// Sidewalk material for preview
const sidewalkPreviewMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 });

// Create sidewalk preview meshes
const sidewalkPreview1 = new THREE.Mesh(horizontalSidewalk1Geometry, sidewalkPreviewMaterial);
const sidewalkPreview2 = new THREE.Mesh(horizontalSidewalk2Geometry, sidewalkPreviewMaterial);
sidewalkPreview1.visible = false;
sidewalkPreview2.visible = false;
scene.add(sidewalkPreview1);
scene.add(sidewalkPreview2);

// Lane divider preview - create this as a group
const lanePreviewGroup = new THREE.Group();
const lanePreviewMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });

// Add dots to the preview group for horizontal road
for (let i = -0.4; i <= 0.4; i += 0.2) {
    const dotGeometry = new THREE.BoxGeometry(0.1, 0.015, 0.02);
    const dot = new THREE.Mesh(dotGeometry, lanePreviewMaterial);
    dot.position.set(i, 0.002, 0);
    lanePreviewGroup.add(dot);
}

// Create a separate group for vertical road dots
const verticalLanePreviewGroup = new THREE.Group();
for (let i = -0.4; i <= 0.4; i += 0.2) {
    const dotGeometry = new THREE.BoxGeometry(0.02, 0.015, 0.1);
    const dot = new THREE.Mesh(dotGeometry, lanePreviewMaterial);
    dot.position.set(0, 0.002, i);
    verticalLanePreviewGroup.add(dot);
}

lanePreviewGroup.visible = false;
verticalLanePreviewGroup.visible = false;
scene.add(lanePreviewGroup);
scene.add(verticalLanePreviewGroup);

renderer.domElement.addEventListener('mousemove', onMouseMove, false);

function onMouseMove(event) {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Set up raycaster from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Check intersection with the ground plane
    const intersects = raycaster.intersectObject(ground);
    
    // Clean up any temporary preview from previous frame
    if (window.tempRoadPreview) {
        scene.remove(window.tempRoadPreview);
        window.tempRoadPreview = null;
    }
    
    // Hide all previews initially
    buildingPreview.visible = false;
    roadPreview.visible = false;
    sidewalkPreview1.visible = false;
    sidewalkPreview2.visible = false;
    lanePreviewGroup.visible = false;
    verticalLanePreviewGroup.visible = false;
    
    if (intersects.length > 0 && selectedBuildingType) {
        const point = intersects[0].point;
        // Floor the coordinates to get the grid cell
        const gridX = Math.floor(point.x);
        const gridZ = Math.floor(point.z);

        // Show preview based on selected building type
        if (['residential', 'commercial', 'industrial'].includes(selectedBuildingType)) {
            // Set building preview color
            let color;
            switch (selectedBuildingType) {
                case 'residential':
                    color = 0xff0000; // Red
                    break;
                case 'commercial':
                    color = 0x0000ff; // Blue
                    break;
                case 'industrial':
                    color = 0xffff00; // Yellow
                    break;
            }
            previewMaterial.color.setHex(color);
            // Position at the center of the grid cell
            buildingPreview.position.set(gridX + 0.5, 0.5, gridZ + 0.5);
            buildingPreview.rotation.y = (Math.PI / 2) * currentRotation;
            buildingPreview.visible = true;
        } else if (selectedBuildingType === 'road') {
            // Check for existing road at this position
            const key = `${gridX}_${gridZ}`;
            if (roadGrid.has(key)) {
                // Don't show preview if road already exists
                return;
            }
            
            // Detect adjacent roads to determine appropriate road type
            const roadType = detectRoadConnections(gridX, gridZ);
            
            // Set up road preview based on the detected type
            switch (roadType) {
                case RoadType.STRAIGHT_H:
                    // Horizontal road
                    roadPreview.geometry = horizontalRoadGeometry;
                    sidewalkPreview1.geometry = horizontalSidewalk1Geometry;
                    sidewalkPreview2.geometry = horizontalSidewalk2Geometry;
                    
                    // Position sidewalks
                    sidewalkPreview1.position.set(gridX + 0.5, 0.012, gridZ + 0.5 - 0.45);
                    sidewalkPreview2.position.set(gridX + 0.5, 0.012, gridZ + 0.5 + 0.45);
                    
                    // Show lane markers
                    lanePreviewGroup.position.set(gridX + 0.5, 0.012, gridZ + 0.5);
                    lanePreviewGroup.visible = true;
                    verticalLanePreviewGroup.visible = false;
                    
                    // Position and show the road preview
                    roadPreview.position.set(gridX + 0.5, 0.005, gridZ + 0.5);
                    roadPreview.rotation.y = 0;
                    roadPreview.visible = true;
                    sidewalkPreview1.visible = true;
                    sidewalkPreview2.visible = true;
                    break;
                    
                case RoadType.STRAIGHT_V:
                    // Vertical road
                    roadPreview.geometry = verticalRoadGeometry;
                    sidewalkPreview1.geometry = verticalSidewalk1Geometry;
                    sidewalkPreview2.geometry = verticalSidewalk2Geometry;
                    
                    // Position sidewalks
                    sidewalkPreview1.position.set(gridX + 0.5 - 0.45, 0.012, gridZ + 0.5);
                    sidewalkPreview2.position.set(gridX + 0.5 + 0.45, 0.012, gridZ + 0.5);
                    
                    // Show lane markers
                    verticalLanePreviewGroup.position.set(gridX + 0.5, 0.012, gridZ + 0.5);
                    verticalLanePreviewGroup.visible = true;
                    lanePreviewGroup.visible = false;
                    
                    // Position and show the road preview
                    roadPreview.position.set(gridX + 0.5, 0.005, gridZ + 0.5);
                    roadPreview.rotation.y = 0;
                    roadPreview.visible = true;
                    sidewalkPreview1.visible = true;
                    sidewalkPreview2.visible = true;
                    break;
                    
                default:
                    // For corner, T-intersection, and crossroad previews
                    // Create a temporary preview group
                    const tempRoadGroup = createRoadGroup(roadType);
                    tempRoadGroup.position.set(gridX + 0.5, 0.005, gridZ + 0.5);
                    
                    // Apply transparent materials to all meshes in the group
                    tempRoadGroup.traverse(child => {
                        if (child.isMesh) {
                            // Clone the material to avoid affecting other objects
                            const material = child.material.clone();
                            material.transparent = true;
                            material.opacity = 0.5;
                            child.material = material;
                        }
                    });
                    
                    // Add to scene temporarily for preview
                    scene.add(tempRoadGroup);
                    
                    // Store the temp group in a variable for removal on next frame
                    window.tempRoadPreview = tempRoadGroup;
                    break;
            }
        } else if (selectedBuildingType === 'bulldozer') {
            // Check if there's something to bulldoze at this position
            const key = `${gridX}_${gridZ}`;
            if (cityGrid.has(key) || roadGrid.has(key)) {
                // Show bulldozer preview - we'll reuse the building preview with a different color
                previewMaterial.color.setHex(0xff6347); // Tomato red for bulldozer
                buildingPreview.position.set(gridX + 0.5, 0.5, gridZ + 0.5);
                buildingPreview.scale.set(1, 0.2, 1); // Flatten it to indicate deletion
                buildingPreview.rotation.y = 0;
                buildingPreview.visible = true;
            }
        }
    }
}

// Preview road group for different road types
const previewRoadGroups = {};
// Create preview models for all road types
for (const type in RoadType) {
    if (RoadType.hasOwnProperty(type)) {
        const roadType = RoadType[type];
        const previewGroup = createRoadGroup(roadType);
        
        // Apply preview materials (transparent)
        previewGroup.traverse(child => {
            if (child.isMesh) {
                const material = child.material.clone();
                material.transparent = true;
                material.opacity = 0.5;
                child.material = material;
            }
        });
        
        previewGroup.visible = false;
        scene.add(previewGroup);
        previewRoadGroups[roadType] = previewGroup;
    }
}

// Function to place buildings
function placeBuilding(type, x, z, forcedRotation, skipUndoStack = false) {
    if (x < -49 || x >= 49 || z < -49 || z >= 49) {
        return;
    }
    
    const key = `${x}_${z}`;
    if (cityGrid.has(key)) {
        return;
    }
    
    // Use forced rotation if provided (for loading saved games)
    // Handle both number and object formats for rotation
    let rotation = currentRotation;
    if (forcedRotation !== undefined) {
        if (typeof forcedRotation === 'number') {
            rotation = forcedRotation;
        } else if (typeof forcedRotation === 'object' && forcedRotation !== null) {
            // If it's an object (from older save format), convert to number
            rotation = 0; // Default to 0 if can't determine
        }
    }
    
    // Add to undo stack before placing
    if (!skipUndoStack) {
        addToUndoStack({
            type: 'place_building',
            buildingType: type,
            x,
            z,
            rotation
        });
    }
    
    let building;
    
    switch (type) {
        case 'residential':
            // Create residential building (house-like structure)
            building = createHouseBuilding();
            numResidential++;
            break;
        case 'commercial':
            // Create commercial building (office-like with windows)
            building = createCommercialBuilding();
            numCommercial++;
            break;
        case 'industrial':
            // Create industrial building (yellow)
            const industrialGeometry = new THREE.BoxGeometry(0.8, 0.8 + Math.random() * 0.4, 0.8);
            const industrialMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            building = new THREE.Mesh(industrialGeometry, industrialMaterial);
            building.position.y = building.geometry.parameters.height / 2;
            numIndustrial++;
            break;
    }
    
    // Set position
    building.position.x = x + 0.5;
    building.position.z = z + 0.5;
    
    // Apply rotation
    building.rotation.y = (Math.PI / 2) * rotation;
    
    // Store building type and rotation for save functionality
    building.type = type;
    building.rotation = rotation;
    
    // Ensure the building is added to the scene
    scene.add(building);
    
    cityGrid.set(key, building);
    
    return building;
}

// Function to create a house-shaped residential building
function createHouseBuilding() {
    // Create a group to hold all parts of the house
    const houseGroup = new THREE.Group();
    
    // House colors
    const wallColor = 0xF5F5DC; // Beige
    const roofColor = 0x8B4513; // Brown
    const doorColor = 0x8B4513; // Brown
    const windowColor = 0xADD8E6; // Light blue
    
    // Main house body
    const bodyWidth = 0.7;
    const bodyHeight = 0.5;
    const bodyDepth = 0.6;
    const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: wallColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = bodyHeight / 2;
    houseGroup.add(body);
    
    // Roof (triangular prism)
    const roofHeight = 0.4;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-bodyWidth/2, 0);
    roofShape.lineTo(0, roofHeight);
    roofShape.lineTo(bodyWidth/2, 0);
    roofShape.lineTo(-bodyWidth/2, 0);
    
    const extrudeSettings = {
        steps: 1,
        depth: bodyDepth,
        bevelEnabled: false
    };
    
    const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    const roofMaterial = new THREE.MeshBasicMaterial({ color: roofColor });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = bodyHeight;
    roof.position.z = -bodyDepth/2;
    // roof.rotation.x = Math.PI / 4;
    houseGroup.add(roof);
    
    // Door
    const doorWidth = 0.15;
    const doorHeight = 0.3;
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const doorMaterial = new THREE.MeshBasicMaterial({ color: doorColor, side: THREE.DoubleSide });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, doorHeight/2, bodyDepth/2 + 0.001);
    houseGroup.add(door);
    
    // Windows
    const windowSize = 0.12;
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: windowColor, side: THREE.DoubleSide });
    
    // Front windows
    const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow1.position.set(-bodyWidth/4, bodyHeight/2, bodyDepth/2 + 0.001);
    houseGroup.add(frontWindow1);
    
    const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    frontWindow2.position.set(bodyWidth/4, bodyHeight/2, bodyDepth/2 + 0.001);
    houseGroup.add(frontWindow2);
    
    // Back windows
    const backWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow1.position.set(-bodyWidth/4, bodyHeight/2, -bodyDepth/2 - 0.001);
    houseGroup.add(backWindow1);
    
    const backWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    backWindow2.position.set(bodyWidth/4, bodyHeight/2, -bodyDepth/2 - 0.001);
    houseGroup.add(backWindow2);
    
    // Side windows
    const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow1.position.set(bodyWidth/2 + 0.001, bodyHeight/2, 0);
    sideWindow1.rotation.y = Math.PI / 2;
    houseGroup.add(sideWindow1);
    
    const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
    sideWindow2.position.set(-bodyWidth/2 - 0.001, bodyHeight/2, 0);
    sideWindow2.rotation.y = Math.PI / 2;
    houseGroup.add(sideWindow2);
    
    // Add a small yard/garden
    const yardSize = 0.8;
    const yardGeometry = new THREE.PlaneGeometry(yardSize, yardSize);
    const yardMaterial = new THREE.MeshBasicMaterial({ color: 0x7CFC00, side: THREE.DoubleSide }); // Light green
    const yard = new THREE.Mesh(yardGeometry, yardMaterial);
    yard.position.set(0, 0.001, 0); // Just above ground
    yard.rotation.x = -Math.PI / 2; // Flat on ground
    houseGroup.add(yard);
    
    return houseGroup;
}

// Function to create a commercial building with windows
function createCommercialBuilding() {
    // Create a group to hold all parts of the building
    const buildingGroup = new THREE.Group();
    
    // Random building height (taller than residential)
    const buildingHeight = 1.5 + Math.random() * 1.5;
    
    // Random shade of gray for the building
    const grayValue = Math.floor(100 + Math.random() * 100); // Values between 100-200 (medium to light gray)
    const buildingColor = new THREE.Color(`rgb(${grayValue},${grayValue},${grayValue})`);
    
    // Building dimensions
    const buildingWidth = 0.7;
    const buildingDepth = 0.7;
    
    // Main building body
    const bodyGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: buildingColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = buildingHeight / 2;
    buildingGroup.add(body);
    
    // Window properties
    const windowColor = 0xADD8E6; // Light blue
    const windowRows = Math.max(2, Math.floor(buildingHeight * 2)); // At least 2 rows, more for taller buildings
    const windowCols = 3; // 3 windows per row
    const windowWidth = 0.1;
    const windowHeight = 0.12;
    const windowDepth = 0.01;
    const windowSpacingX = buildingWidth / (windowCols + 1);
    const windowSpacingY = buildingHeight / (windowRows + 1);
    
    // Create windows for all four sides
    const sides = [
        { name: 'front', rotY: 0, offsetZ: buildingDepth/2 + 0.001 },
        { name: 'right', rotY: Math.PI/2, offsetX: buildingWidth/2 + 0.001 },
        { name: 'back', rotY: Math.PI, offsetZ: -buildingDepth/2 - 0.001 },
        { name: 'left', rotY: -Math.PI/2, offsetX: -buildingWidth/2 - 0.001 }
    ];
    
    sides.forEach(side => {
        for (let row = 1; row <= windowRows; row++) {
            for (let col = 1; col <= windowCols; col++) {
                // Randomly skip some windows (20% chance)
                if (Math.random() < 0.2) continue;
                
                const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
                const windowMaterial = new THREE.MeshBasicMaterial({ color: windowColor, side: THREE.DoubleSide });
                const window = new THREE.Mesh(windowGeometry, windowMaterial);
                
                // Position window
                const x = side.offsetX !== undefined ? side.offsetX : (-buildingWidth/2 + col * windowSpacingX);
                const y = row * windowSpacingY;
                const z = side.offsetZ !== undefined ? side.offsetZ : (-buildingDepth/2 + col * windowSpacingX);
                
                window.position.set(x, y, z);
                window.rotation.y = side.rotY;
                
                buildingGroup.add(window);
            }
        }
    });
    
    return buildingGroup;
}

// Function to ensure all building materials are properly set up
function ensureBuildingVisibility() {
    cityGrid.forEach((building, key) => {
        // Make sure the building is visible
        building.visible = true;
        
        // If it's a group (residential or commercial), ensure all children are visible
        if (building.type === 'Group') {
            building.traverse(child => {
                if (child.isMesh) {
                    child.visible = true;
                    
                    // Ensure material is properly set
                    if (child.material) {
                        // If material is an array, process each material
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                mat.needsUpdate = true;
                                mat.transparent = false;
                                mat.opacity = 1.0;
                            });
                        } else {
                            // Single material
                            child.material.needsUpdate = true;
                            child.material.transparent = false;
                            child.material.opacity = 1.0;
                        }
                    }
                }
            });
        } else if (building.isMesh) {
            // For simple meshes (industrial buildings)
            if (building.material) {
                building.material.needsUpdate = true;
                building.material.transparent = false;
                building.material.opacity = 1.0;
            }
        }
    });
}

// Function to sanitize building data before loading
function sanitizeBuildingData(buildingData) {
    if (!buildingData) return null;
    
    // Ensure required properties exist
    if (buildingData.x === undefined || buildingData.z === undefined || !buildingData.type) {
        console.error('[DEBUG] Invalid building data missing required properties:', buildingData);
        return null;
    }
    
    // Ensure type is valid
    if (!['residential', 'commercial', 'industrial'].includes(buildingData.type)) {
        console.error('[DEBUG] Invalid building type:', buildingData.type);
        return null;
    }
    
    // Normalize rotation to a number
    let rotation = 0;
    if (buildingData.rotation !== undefined) {
        if (typeof buildingData.rotation === 'number') {
            rotation = buildingData.rotation;
        } else if (typeof buildingData.rotation === 'object' && buildingData.rotation !== null) {
            // Try to extract rotation from object if possible
            rotation = 0; // Default
        }
    }
    
    // Return sanitized building data
    return {
        x: Number(buildingData.x),
        z: Number(buildingData.z),
        type: buildingData.type,
        rotation: rotation
    };
}
