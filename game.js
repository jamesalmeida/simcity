// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Initialize CityBuilder game object if it doesn't exist
window.CityBuilder = window.CityBuilder || {};
CityBuilder.game = {};

// Notification Popups - use the UI version instead
function showNotification(message, duration = 2000) {
    if (window.CityBuilder && CityBuilder.ui) {
        CityBuilder.ui.showNotification(message, duration);
    } else {
        // Fallback if UI module isn't loaded yet
        const notification = document.getElementById('save-notification');
        if (notification) {
            notification.textContent = message;
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.opacity = '0';
            }, duration);
        } else {
            console.warn('Save notification element not found');
        }
    }
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
    CityBuilder.game.hasUnsavedChanges = true;
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
controls.maxDistance = 75;
controls.minDistance = 5;

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
CityBuilder.game.pendingSaveData = null;
CityBuilder.game.pendingSaveId = null;

// Variables to track the currently loaded city
CityBuilder.game.currentCityId = null;
CityBuilder.game.currentCityName = null;
CityBuilder.game.currentCityDescription = null;

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

// Save game state to localStorage - wrapper for storage module
CityBuilder.game.saveGameState = function() {
    const gameStats = {
        numResidential,
        numCommercial,
        numIndustrial,
        population
    };
    
    CityBuilder.storage.saveGameState(cityGrid, roadGrid, gameStats);
};

// Load game state from localStorage - wrapper for storage module
CityBuilder.game.loadGameState = function(saveId) {
    return CityBuilder.storage.loadGameState(saveId);
};

// Function to process loaded city data
CityBuilder.game.loadCityData = function(data) {
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
        const distance = Math.max(sizeX, sizeZ) * 0.5;
        camera.position.set(centerX + distance, distance, centerZ + distance);
        camera.lookAt(centerX, 0, centerZ);
    }
    
    // Force a scene update
    renderer.render(scene, camera);
};

// Create a new city (clear everything)
CityBuilder.game.createNewCity = function() {
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
    CityBuilder.game.currentCityId = null;
    CityBuilder.game.currentCityName = null;
    CityBuilder.game.currentCityDescription = null;
    
    // Update UI
    document.getElementById('population-display').textContent = `Population: ${Math.floor(population)}`;
    
    // Show notification
    showNotification('Started a new city');    
    console.log('Created new city');
};

// Function to save the game with a new name and description - wrapper for storage module
CityBuilder.game.saveAsGameState = function() {
    const gameStats = {
        numResidential,
        numCommercial,
        numIndustrial,
        population
    };
    
    CityBuilder.storage.saveAsGameState(cityGrid, roadGrid, gameStats);
};

// Function for completing the save process with city info
CityBuilder.game.completeSaveWithCityInfo = function() {
    if (CityBuilder.ui) {
        CityBuilder.ui.completeSaveWithCityInfo();
    } else {
        console.error('UI module not initialized');
    }
};

// Auto-save functionality (every 60 seconds)
const AUTO_SAVE_INTERVAL = 60000; // 1 minute
let autoSaveTimer;

// Flag to track if changes have been made since last save
CityBuilder.game.hasUnsavedChanges = false;

CityBuilder.game.startAutoSave = function() {
    autoSaveTimer = setInterval(() => {
        if (autoSaveCheckbox.checked && CityBuilder.game.hasUnsavedChanges) {
            // Auto-save without showing the form
            const gameStats = {
                numResidential,
                numCommercial,
                numIndustrial,
                population
            };
            
            CityBuilder.storage.autoSaveGameState(cityGrid, roadGrid, gameStats);
            // Reset the flag after saving
            CityBuilder.game.hasUnsavedChanges = false;
        }
    }, AUTO_SAVE_INTERVAL);
};

CityBuilder.game.stopAutoSave = function() {
    clearInterval(autoSaveTimer);
};

// Start auto-save on game load
CityBuilder.game.startAutoSave();

// Try to load saved game on startup
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Try to load the most recent autosave
        const autosaveId = localStorage.getItem('simcity_autosave_id');
        if (autosaveId) {
            CityBuilder.game.loadGameState(autosaveId);
        }
    }, 500); // Small delay to ensure all components are ready
});

// Function to update button styles based on selection
function updateButtonStyles() {
    if (CityBuilder.ui && CityBuilder.ui.updateButtonStyles) {
        CityBuilder.ui.updateButtonStyles();
    } else {
        // Fallback if UI module isn't loaded yet
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
const roadMaterial = window.CityBuilder.assets.roadMaterial;

// Building counters and population
let numResidential = 0;
let numCommercial = 0;
let numIndustrial = 0;
let population = 0;

// Road materials
const sidewalkMaterial = window.CityBuilder.assets.sidewalkMaterial;
const laneLineMaterial = window.CityBuilder.assets.laneLineMaterial;

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
    return window.CityBuilder.assets.createRoadGroup(roadType);
}

// Function to place a road at the specified grid coordinates
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
            building = window.CityBuilder.assets.createIndustrialBuilding();
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
    return window.CityBuilder.assets.createHouseBuilding();
}

// Function to create a commercial building with windows
function createCommercialBuilding() {
    return window.CityBuilder.assets.createCommercialBuilding();
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

// Initialize UI after game functions are defined
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI module
    if (CityBuilder.ui && typeof CityBuilder.ui.init === 'function') {
        CityBuilder.ui.init();
        console.log('UI module initialized');
    } else {
        console.error('UI module not found or init method not available');
        
        // Fallback event listeners if UI module isn't available
        const newCityButton = document.getElementById('new-city-btn');
        const saveButton = document.getElementById('save-city-btn');
        const saveAsButton = document.getElementById('save-as-btn');
        const loadButton = document.getElementById('load-city-btn');
        
        if (newCityButton) newCityButton.addEventListener('click', CityBuilder.game.createNewCity);
        if (saveButton) saveButton.addEventListener('click', CityBuilder.game.saveGameState);
        if (saveAsButton) saveAsButton.addEventListener('click', CityBuilder.game.saveAsGameState);
        if (loadButton) loadButton.addEventListener('click', function() {
            const loadModal = document.getElementById('load-modal');
            if (loadModal) loadModal.style.display = 'block';
        });
    }
    
    // Try to load the most recent autosave
    setTimeout(() => {
        const autosaveId = localStorage.getItem('simcity_autosave_id');
        if (autosaveId) {
            CityBuilder.game.loadGameState(autosaveId);
        }
    }, 500);
});
