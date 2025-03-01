// storage.js - Contains save/load functionality

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
    UI.elements.savedCitiesList.innerHTML = '';
    
    const cities = getSavedCities();
    
    if (cities.length === 0) {
        const noSavesMsg = document.createElement('p');
        noSavesMsg.textContent = 'No saved cities found.';
        noSavesMsg.style.textAlign = 'center';
        noSavesMsg.style.color = '#666';
        UI.elements.savedCitiesList.appendChild(noSavesMsg);
        return;
    }
    
    cities.forEach(city => {
        const cityElement = document.createElement('div');
        cityElement.className = 'city-item';
        
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDate = city.timestamp.toLocaleDateString(undefined, dateOptions);
        
        const cityInfo = document.createElement('div');
        cityInfo.className = 'city-info';
        
        const cityName = document.createElement('div');
        cityName.className = 'city-name';
        cityName.textContent = city.name;
        
        const cityDate = document.createElement('div');
        cityDate.className = 'city-date';
        cityDate.textContent = formattedDate;
        
        const cityStats = document.createElement('div');
        cityStats.className = 'city-stats';
        cityStats.textContent = `Buildings: ${city.buildings} | Roads: ${city.roads}`;
        
        if (city.description) {
            const cityDesc = document.createElement('div');
            cityDesc.className = 'city-description';
            cityDesc.textContent = city.description;
            cityInfo.appendChild(cityDesc);
        }
        
        cityInfo.appendChild(cityName);
        cityInfo.appendChild(cityDate);
        cityInfo.appendChild(cityStats);
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'city-buttons';
        
        const loadButton = document.createElement('button');
        loadButton.className = 'load-btn';
        loadButton.textContent = 'Load';
        loadButton.onclick = () => loadGameState(city.id);
        
        const editButton = document.createElement('button');
        editButton.className = 'edit-btn';
        editButton.textContent = 'Edit';
        editButton.onclick = () => editCityInfo(city.id, city.name, city.description);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => {
            if (confirm(`Are you sure you want to delete "${city.name}"?`)) {
                localStorage.removeItem(city.id);
                populateSavedCitiesList();
                UI.showNotification('City deleted');
            }
        };
        
        buttonsContainer.appendChild(loadButton);
        buttonsContainer.appendChild(editButton);
        buttonsContainer.appendChild(deleteButton);
        
        cityElement.appendChild(cityInfo);
        cityElement.appendChild(buttonsContainer);
        
        UI.elements.savedCitiesList.appendChild(cityElement);
    });
}

// Function to edit city information
function editCityInfo(saveId, currentName, currentDescription) {
    UI.pendingSaveId = saveId;
    
    // Load existing data
    UI.elements.cityNameInput.value = currentName;
    UI.elements.cityDescriptionInput.value = currentDescription || '';
    
    // Hide modal and show form
    UI.elements.loadModal.style.display = 'none';
    UI.elements.cityInfoForm.classList.remove('hidden');
    
    // Focus on name field
    UI.elements.cityNameInput.focus();
}

function showCityInfoForm() {
    // Clear existing values
    UI.elements.cityNameInput.value = '';
    UI.elements.cityDescriptionInput.value = '';
    
    // Show form
    UI.elements.cityInfoForm.classList.remove('hidden');
    
    // Focus on name field
    UI.elements.cityNameInput.focus();
}

function hideCityInfoForm() {
    UI.elements.cityInfoForm.classList.add('hidden');
    UI.pendingSaveData = null;
    UI.pendingSaveId = null;
}

// Function to complete save with city info
function completeSaveWithCityInfo() {
    const name = UI.elements.cityNameInput.value.trim() || 'Unnamed City';
    const description = UI.elements.cityDescriptionInput.value.trim();
    
    if (UI.pendingSaveId) {
        // Update existing save
        try {
            const saveData = JSON.parse(localStorage.getItem(UI.pendingSaveId));
            saveData.cityName = name;
            saveData.cityDescription = description;
            localStorage.setItem(UI.pendingSaveId, JSON.stringify(saveData));
            
            UI.showNotification('City information updated');
            hideCityInfoForm();
            populateSavedCitiesList();
        } catch (e) {
            console.error('Error updating city info:', e);
            UI.showNotification('Error updating city information');
        }
    } else if (UI.pendingSaveData) {
        // New save
        UI.pendingSaveData.cityName = name;
        UI.pendingSaveData.cityDescription = description;
        
        // Generate a new save ID if needed
        const saveId = UI.pendingSaveData.id || generateSaveId();
        UI.pendingSaveData.id = saveId;
        
        // Save to localStorage
        localStorage.setItem(saveId, JSON.stringify(UI.pendingSaveData));
        
        UI.showNotification('City saved successfully');
        hideCityInfoForm();
    }
}

// Function to save the current game state
function saveGameState() {
    const gameState = Game.getState();
    
    // Save buildings
    const buildingsData = [];
    gameState.cityGrid.forEach((building, key) => {
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
    gameState.roadGrid.forEach((roadInfo, key) => {
        const [x, z] = key.split('_').map(Number);
        roadsData.push({
            x,
            z,
            roadType: roadInfo.roadType
        });
    });

    // Create save data object
    const saveData = {
        timestamp: Date.now(),
        stats: {
            population: Math.floor(gameState.population),
            residentialBuildings: gameState.numResidential,
            commercialBuildings: gameState.numCommercial,
            industrialBuildings: gameState.numIndustrial,
            roads: roadsData.length
        },
        buildings: buildingsData,
        roads: roadsData
    };

    // If this is a quick save, use existing city info
    const existingSaveId = localStorage.getItem('currentCityId');
    if (existingSaveId) {
        try {
            const existingSave = JSON.parse(localStorage.getItem(existingSaveId));
            saveData.cityName = existingSave.cityName || 'Unnamed City';
            saveData.cityDescription = existingSave.cityDescription || '';
            
            // Save with the same ID
            localStorage.setItem(existingSaveId, JSON.stringify(saveData));
            UI.showNotification('City saved');
        } catch (e) {
            console.error('Error saving city:', e);
            // Fall back to save as...
            UI.pendingSaveData = saveData;
            showCityInfoForm();
        }
    } else {
        // First time save, show form
        UI.pendingSaveData = saveData;
        showCityInfoForm();
    }
}

// Function to load a saved game state
function loadGameState(saveId) {
    UI.elements.loadingSpinner.classList.remove('hidden');
    
    setTimeout(() => {
        try {
            const saveData = JSON.parse(localStorage.getItem(saveId));
            if (!saveData) {
                UI.showNotification('Save file not found');
                UI.elements.loadingSpinner.classList.add('hidden');
                return;
            }
            
            // Clear existing city
            clearCity();
            
            // Store this as the current city ID
            localStorage.setItem('currentCityId', saveId);
            
            // Load buildings
            if (saveData.buildings && Array.isArray(saveData.buildings)) {
                saveData.buildings.forEach(buildingData => {
                    Game.placeBuilding(
                        buildingData.type,
                        buildingData.x,
                        buildingData.z,
                        buildingData.rotation || 0,
                        true // Skip undo stack
                    );
                });
            }
            
            // Load roads
            if (saveData.roads && Array.isArray(saveData.roads)) {
                saveData.roads.forEach(roadData => {
                    const key = `${roadData.x}_${roadData.z}`;
                    const gameState = Game.getState();
                    gameState.roadGrid.set(key, { 
                        roadType: roadData.roadType,
                        mesh: null
                    });
                    
                    Game.placeRoad(roadData.x, roadData.z, true); // Skip undo stack
                });
            }
            
            // Hide modal
            UI.elements.loadModal.style.display = 'none';
            
            UI.showNotification(`Loaded city: ${saveData.cityName || 'Unnamed City'}`);
        } catch (e) {
            console.error('Error loading save:', e);
            UI.showNotification('Error loading save file');
        } finally {
            UI.elements.loadingSpinner.classList.add('hidden');
        }
    }, 500); // Short delay for UX
}

// Function to create a new city
function createNewCity() {
    const gameState = Game.getState();
    if (gameState.cityGrid.size > 0 || gameState.roadGrid.size > 0) {
        if (!confirm('Are you sure you want to start a new city? All unsaved progress will be lost.')) {
            return;
        }
    }
    
    // Clear existing city
    clearCity();
    
    // Clear current city ID
    localStorage.removeItem('currentCityId');
    
    UI.showNotification('Started new city');
}

// Function to clear the city
function clearCity() {
    const gameState = Game.getState();
    
    // Clear buildings
    gameState.cityGrid.forEach((building) => {
        Game.scene.remove(building);
    });
    gameState.cityGrid.clear();
    
    // Clear roads
    gameState.roadGrid.forEach((roadInfo) => {
        if (roadInfo.mesh) {
            Game.scene.remove(roadInfo.mesh);
        }
    });
    gameState.roadGrid.clear();
    
    // Reset counters - this will need to be handled differently
    // as we can't directly modify these values from outside game.js
    
    // Clear undo stack - this will need to be handled differently
}

// 'Save As' functionality
function saveAsGameState() {
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

    // Create save data object
    const saveData = {
        timestamp: Date.now(),
        stats: {
            population: Math.floor(population),
            residentialBuildings: numResidential,
            commercialBuildings: numCommercial,
            industrialBuildings: numIndustrial,
            roads: roadsData.length
        },
        buildings: buildingsData,
        roads: roadsData
    };

    // Always ask for new info for 'Save As'
    pendingSaveData = saveData;
    showCityInfoForm();
}

// Auto-save functionality
let autoSaveTimer = null;

function startAutoSave() {
    // Auto-save every 5 minutes
    autoSaveTimer = setInterval(autoSaveGameState, 5 * 60 * 1000);
}

function stopAutoSave() {
    clearInterval(autoSaveTimer);
}

// Function for auto-saving without showing the form
function autoSaveGameState() {
    // Only auto-save if we have an existing city ID
    const existingSaveId = localStorage.getItem('currentCityId');
    if (!existingSaveId || cityGrid.size === 0) {
        return; // Don't auto-save if no existing save or empty city
    }
    
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

    try {
        // Get existing save data
        const existingSave = JSON.parse(localStorage.getItem(existingSaveId));
        
        // Create save data object
        const saveData = {
            timestamp: Date.now(),
            cityName: existingSave.cityName || 'Unnamed City',
            cityDescription: existingSave.cityDescription || '',
            stats: {
                population: Math.floor(population),
                residentialBuildings: numResidential,
                commercialBuildings: numCommercial,
                industrialBuildings: numIndustrial,
                roads: roadsData.length
            },
            buildings: buildingsData,
            roads: roadsData
        };
        
        // Save with the same ID
        localStorage.setItem(existingSaveId, JSON.stringify(saveData));
        console.log('Auto-saved city');
        showNotification('City auto-saved', 1000); // Shorter duration for auto-save
    } catch (e) {
        console.error('Error auto-saving city:', e);
    }
}

// Expose functions to be used in other files
window.Storage = {
    generateSaveId,
    getSavedCities,
    populateSavedCitiesList,
    editCityInfo,
    showCityInfoForm,
    hideCityInfoForm,
    completeSaveWithCityInfo,
    saveGameState,
    loadGameState,
    createNewCity,
    clearCity,
    saveAsGameState,
    startAutoSave,
    stopAutoSave,
    autoSaveGameState
}; 