// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
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
// Add save/load button to UI
const saveLoadContainer = document.createElement('div');
saveLoadContainer.style.position = 'absolute';
saveLoadContainer.style.top = '10px';
saveLoadContainer.style.right = '10px';
saveLoadContainer.style.zIndex = '1000';
document.body.appendChild(saveLoadContainer);

const newCityButton = document.createElement('button');
newCityButton.textContent = 'New City';
newCityButton.style.padding = '8px 16px';
newCityButton.style.marginRight = '10px';
newCityButton.style.backgroundColor = '#FF9800'; // Orange
newCityButton.style.color = 'white';
newCityButton.style.border = 'none';
newCityButton.style.borderRadius = '4px';
newCityButton.style.cursor = 'pointer';
saveLoadContainer.appendChild(newCityButton);

const saveButton = document.createElement('button');
saveButton.textContent = 'Save City';
saveButton.style.padding = '8px 16px';
saveButton.style.marginRight = '10px';
saveButton.style.backgroundColor = '#4CAF50';
saveButton.style.color = 'white';
saveButton.style.border = 'none';
saveButton.style.borderRadius = '4px';
saveButton.style.cursor = 'pointer';
saveLoadContainer.appendChild(saveButton);

const loadButton = document.createElement('button');
loadButton.textContent = 'Load City';
loadButton.style.padding = '8px 16px';
loadButton.style.backgroundColor = '#2196F3';
loadButton.style.color = 'white';
loadButton.style.border = 'none';
loadButton.style.borderRadius = '4px';
loadButton.style.cursor = 'pointer';
saveLoadContainer.appendChild(loadButton);

// Auto-save toggle
const autoSaveContainer = document.createElement('div');
autoSaveContainer.style.marginTop = '10px';
saveLoadContainer.appendChild(autoSaveContainer);

const autoSaveCheckbox = document.createElement('input');
autoSaveCheckbox.type = 'checkbox';
autoSaveCheckbox.id = 'auto-save';
autoSaveCheckbox.checked = true;
autoSaveContainer.appendChild(autoSaveCheckbox);

const autoSaveLabel = document.createElement('label');
autoSaveLabel.htmlFor = 'auto-save';
autoSaveLabel.textContent = 'Auto-save';
autoSaveLabel.style.color = 'white';
autoSaveLabel.style.marginLeft = '5px';
autoSaveContainer.appendChild(autoSaveLabel);

// Save notification element
const saveNotification = document.createElement('div');
saveNotification.style.position = 'absolute';
saveNotification.style.bottom = '20px';
saveNotification.style.right = '20px';
saveNotification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
saveNotification.style.color = 'white';
saveNotification.style.padding = '10px 20px';
saveNotification.style.borderRadius = '5px';
saveNotification.style.opacity = '0';
saveNotification.style.transition = 'opacity 0.3s ease-in-out';
saveNotification.style.zIndex = '1000';
document.body.appendChild(saveNotification);

// Load dialog modal
const loadModal = document.createElement('div');
loadModal.style.display = 'none';
loadModal.style.position = 'fixed';
loadModal.style.zIndex = '2000';
loadModal.style.left = '0';
loadModal.style.top = '0';
loadModal.style.width = '100%';
loadModal.style.height = '100%';
loadModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
loadModal.style.overflow = 'auto';
document.body.appendChild(loadModal);

// Modal content
const modalContent = document.createElement('div');
modalContent.style.backgroundColor = '#f4f4f4';
modalContent.style.margin = '10% auto';
modalContent.style.padding = '20px';
modalContent.style.width = '60%';
modalContent.style.maxWidth = '600px';
modalContent.style.borderRadius = '8px';
modalContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
loadModal.appendChild(modalContent);

// Close button
const closeModalBtn = document.createElement('span');
closeModalBtn.innerHTML = '&times;';
closeModalBtn.style.color = '#aaa';
closeModalBtn.style.float = 'right';
closeModalBtn.style.fontSize = '28px';
closeModalBtn.style.fontWeight = 'bold';
closeModalBtn.style.cursor = 'pointer';
modalContent.appendChild(closeModalBtn);

// Modal header
const modalHeader = document.createElement('h2');
modalHeader.textContent = 'Load Saved City';
modalHeader.style.marginTop = '0';
modalContent.appendChild(modalHeader);

// Saved cities list container
const savedCitiesList = document.createElement('div');
savedCitiesList.style.marginTop = '20px';
savedCitiesList.style.maxHeight = '400px';
savedCitiesList.style.overflowY = 'auto';
modalContent.appendChild(savedCitiesList);

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
        const cityItem = document.createElement('div');
        cityItem.style.padding = '12px';
        cityItem.style.marginBottom = '8px';
        cityItem.style.backgroundColor = '#fff';
        cityItem.style.borderRadius = '4px';
        cityItem.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        cityItem.style.display = 'flex';
        cityItem.style.justifyContent = 'space-between';
        cityItem.style.alignItems = 'center';
        
        // City info
        const cityInfo = document.createElement('div');
        
        const cityDate = document.createElement('div');
        cityDate.textContent = city.timestamp.toLocaleString();
        cityDate.style.fontWeight = 'bold';
        cityDate.style.marginBottom = '4px';
        cityInfo.appendChild(cityDate);
        
        const cityStats = document.createElement('div');
        cityStats.style.fontSize = '0.9em';
        cityStats.style.color = '#666';
        cityStats.textContent = `Population: ${Math.floor(city.stats.population)} | Buildings: ${city.buildings} | Roads: ${city.roads}`;
        cityInfo.appendChild(cityStats);
        
        cityItem.appendChild(cityInfo);
        
        // Action buttons
        const buttonsContainer = document.createElement('div');
        
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.style.padding = '6px 12px';
        loadBtn.style.backgroundColor = '#2196F3';
        loadBtn.style.color = 'white';
        loadBtn.style.border = 'none';
        loadBtn.style.borderRadius = '4px';
        loadBtn.style.marginRight = '8px';
        loadBtn.style.cursor = 'pointer';
        loadBtn.onclick = function() {
            loadGameState(city.id);
            loadModal.style.display = 'none';
        };
        buttonsContainer.appendChild(loadBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.style.backgroundColor = '#F44336';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.onclick = function() {
            if (confirm('Are you sure you want to delete this saved city?')) {
                localStorage.removeItem(city.id);
                populateSavedCitiesList();
                
                // Show notification
                saveNotification.textContent = 'City deleted successfully';
                saveNotification.style.opacity = '1';
                setTimeout(() => {
                    saveNotification.style.opacity = '0';
                }, 2000);
            }
        };
        buttonsContainer.appendChild(deleteBtn);
        
        cityItem.appendChild(buttonsContainer);
        
        savedCitiesList.appendChild(cityItem);
    });
}

// Save game state to localStorage
function saveGameState() {
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

    // Save to localStorage with a unique ID
    const saveData = {
        buildings: buildingsData,
        roads: roadsData,
        stats: gameStats,
        timestamp: new Date().toISOString()
    };

    // Generate save ID
    const saveId = generateSaveId();
    
    // Save to localStorage
    localStorage.setItem(saveId, JSON.stringify(saveData));
    
    // Update auto-save ID to the most recent save
    localStorage.setItem('simcity_autosave_id', saveId);
    
    // Show save notification
    saveNotification.textContent = `City saved: ${new Date().toLocaleTimeString()}`;
    saveNotification.style.opacity = '1';
    
    // Hide notification after 2 seconds
    setTimeout(() => {
        saveNotification.style.opacity = '0';
    }, 2000);
    
    console.log('Game state saved with ID:', saveId);
}

// Load game state from localStorage
function loadGameState(saveId) {
    const savedData = saveId ? 
        localStorage.getItem(saveId) : 
        localStorage.getItem(localStorage.getItem('simcity_autosave_id') || '');
    
    if (!savedData) {
        console.log('No saved game found');
        saveNotification.textContent = 'No saved game found';
        saveNotification.style.opacity = '1';
        setTimeout(() => {
            saveNotification.style.opacity = '0';
        }, 2000);
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
        numResidential = data.stats.numResidential;
        numCommercial = data.stats.numCommercial;
        numIndustrial = data.stats.numIndustrial;
        population = data.stats.population;
        
        // Rebuild roads first (so buildings detect them correctly)
        data.roads.forEach(roadData => {
            const roadType = roadData.roadType;
            const roadGroup = createRoadGroup(roadType);
            roadGroup.position.set(roadData.x + 0.5, 0.005, roadData.z + 0.5);
            scene.add(roadGroup);
            roadGrid.set(`${roadData.x}_${roadData.z}`, { mesh: roadGroup, roadType });
        });
        
        // Rebuild buildings
        data.buildings.forEach(buildingData => {
            placeBuilding(buildingData.type, buildingData.x, buildingData.z, buildingData.rotation);
        });
        
        // Update UI
        document.getElementById('population-display').textContent = `Population: ${Math.floor(population)}`;
        
        console.log(`Game loaded successfully from ${data.timestamp}`);
        
        // Show load notification
        saveNotification.textContent = 'City loaded successfully';
        saveNotification.style.opacity = '1';
        setTimeout(() => {
            saveNotification.style.opacity = '0';
        }, 2000);
        
        return true;
    } catch (error) {
        console.error('Error loading game state:', error);
        
        // Show error notification
        saveNotification.textContent = 'Error loading city: ' + error.message;
        saveNotification.style.opacity = '1';
        setTimeout(() => {
            saveNotification.style.opacity = '0';
        }, 3000);
        
        return false;
    }
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
    
    // Update UI
    document.getElementById('population-display').textContent = `Population: ${Math.floor(population)}`;
    
    // Show notification
    saveNotification.textContent = 'Started a new city';
    saveNotification.style.opacity = '1';
    setTimeout(() => {
        saveNotification.style.opacity = '0';
    }, 2000);
    
    console.log('Created new city');
}

// Event listeners for buttons
newCityButton.addEventListener('click', createNewCity);
saveButton.addEventListener('click', saveGameState);
loadButton.addEventListener('click', () => {
    // Populate the list of saved cities
    populateSavedCitiesList();
    // Show the modal
    loadModal.style.display = 'block';
});

// Auto-save functionality (every 60 seconds)
const AUTO_SAVE_INTERVAL = 60000; // 1 minute
let autoSaveTimer;

function startAutoSave() {
    autoSaveTimer = setInterval(() => {
        if (autoSaveCheckbox.checked) {
            saveGameState();
        }
    }, AUTO_SAVE_INTERVAL);
}

function stopAutoSave() {
    clearInterval(autoSaveTimer);
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
function bulldoze(x, z) {
    const key = `${x}_${z}`;
    
    // Check for and remove buildings
    if (cityGrid.has(key)) {
        const building = cityGrid.get(key);
        scene.remove(building);
        
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
        
        roadGroup.add(outerSidewalk1);
        roadGroup.add(outerSidewalk2);
        roadGroup.add(innerSidewalk1);
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
            
            const westCrosswalk = createCrosswalk(false);
            westCrosswalk.position.set(-0.45, 0.001, 0);
            
            roadGroup.add(eastCrosswalk);
            roadGroup.add(westCrosswalk);
            
            // Add south crosswalk
            const southCrosswalk = createCrosswalk(true);
            southCrosswalk.position.set(0, 0.001, 0.45);
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
            
            const southCrosswalk = createCrosswalk(true);
            southCrosswalk.position.set(0, 0.001, 0.45);
            
            roadGroup.add(northCrosswalk);
            roadGroup.add(southCrosswalk);
            
            // Add west crosswalk
            const westCrosswalk = createCrosswalk(false);
            westCrosswalk.position.set(-0.45, 0.001, 0);
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
            const northCrosswalk = createCrosswalk(true);
            northCrosswalk.position.set(0, 0.001, -0.45);
            
            const southCrosswalk = createCrosswalk(true);
            southCrosswalk.position.set(0, 0.001, 0.45);
            
            roadGroup.add(northCrosswalk);
            roadGroup.add(southCrosswalk);
            
            // Add east crosswalk
            const eastCrosswalk = createCrosswalk(false);
            eastCrosswalk.position.set(0.45, 0.001, 0);
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
    
    const createCrossroad = () => {
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
        
        const eastCrosswalk = createCrosswalk(false);
        eastCrosswalk.position.set(0.45, 0.001, 0);
        
        const southCrosswalk = createCrosswalk(true);
        southCrosswalk.position.set(0, 0.001, 0.45);
        
        const westCrosswalk = createCrosswalk(false);
        westCrosswalk.position.set(-0.45, 0.001, 0);
        
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
            createCrossroad();
            break;
    }
    
    return roadGroup;
}

// Place a road
function placeRoad(x, z) {
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
function placeBuilding(type, x, z, forcedRotation) {
    if (x < -49 || x >= 49 || z < -49 || z >= 49) {
        console.log('Out of bounds');
        return;
    }
    
    const key = `${x}_${z}`;
    if (cityGrid.has(key)) {
        console.log('Building already exists here');
        return;
    }
    
    // Use forced rotation if provided (for loading saved games)
    const rotation = forcedRotation !== undefined ? forcedRotation : currentRotation;
    
    let buildingGeometry, buildingMaterial;
    
    switch (type) {
        case 'residential':
            // Create residential building (red)
            buildingGeometry = new THREE.BoxGeometry(0.8, 1 + Math.random() * 0.5, 0.8);
            buildingMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            numResidential++;
            break;
        case 'commercial':
            // Create commercial building (blue)
            buildingGeometry = new THREE.BoxGeometry(0.8, 1.5 + Math.random() * 1, 0.8);
            buildingMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
            numCommercial++;
            break;
        case 'industrial':
            // Create industrial building (yellow)
            buildingGeometry = new THREE.BoxGeometry(0.8, 0.8 + Math.random() * 0.4, 0.8);
            buildingMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            numIndustrial++;
            break;
    }
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x + 0.5, building.geometry.parameters.height / 2, z + 0.5);
    
    // Apply rotation
    building.rotation.y = (Math.PI / 2) * rotation;
    
    // Store building type and rotation for save functionality
    building.type = type;
    building.rotation = rotation;
    
    scene.add(building);
    cityGrid.set(key, building);
}
