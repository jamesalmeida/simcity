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

// Building and road selection
let selectedBuildingType = null;
document.getElementById('residential-btn').addEventListener('click', () => {
    selectedBuildingType = 'residential';
});
document.getElementById('commercial-btn').addEventListener('click', () => {
    selectedBuildingType = 'commercial';
});
document.getElementById('industrial-btn').addEventListener('click', () => {
    selectedBuildingType = 'industrial';
});
document.getElementById('horizontal-road-btn').addEventListener('click', () => {
    selectedBuildingType = 'horizontal-road';
});
document.getElementById('vertical-road-btn').addEventListener('click', () => {
    selectedBuildingType = 'vertical-road';
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

// Place a building
function placeBuilding(type, x, z) {
    const key = `${x}_${z}`;
    if (cityGrid.has(key)) {
        console.log('Position already occupied');
        return;
    }
    if (Math.abs(x) > 50 || Math.abs(z) > 50) {
        console.log('Out of bounds');
        return;
    }
    let color;
    switch (type) {
        case 'residential':
            color = 0xff0000; // Red
            break;
        case 'commercial':
            color = 0x0000ff; // Blue
            break;
        case 'industrial':
            color = 0xffff00; // Yellow
            break;
        default:
            return;
    }
    const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
    const buildingMaterial = new THREE.MeshBasicMaterial({ color: color });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(x, 0.5, z);
    scene.add(building);
    cityGrid.set(key, building);
    building.type = type;
    if (type === 'residential') numResidential++;
    else if (type === 'commercial') numCommercial++;
    else if (type === 'industrial') numIndustrial++;
}

// Place a road
function placeRoad(type, x, z) {
    let key, position, size;
    if (type === 'horizontal-road') {
        if (x < -50 || x >= 50 || z < -50 || z > 50) {
            console.log('Out of bounds');
            return;
        }
        key = `h_${x}_${z}`;
        position = new THREE.Vector3(x + 0.5, 0.005, z);
        size = [1, 0.01, 0.2];
    } else if (type === 'vertical-road') {
        if (z < -50 || z >= 50 || x < -50 || x > 50) {
            console.log('Out of bounds');
            return;
        }
        key = `v_${x}_${z}`;
        position = new THREE.Vector3(x, 0.005, z + 0.5);
        size = [0.2, 0.01, 1];
    } else {
        return;
    }
    if (roadGrid.has(key)) {
        console.log('Road already exists');
        return;
    }
    const roadGeometry = new THREE.BoxGeometry(...size);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.position.set(position.x, position.y, position.z);
    scene.add(road);
    roadGrid.set(key, road);
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
            const gridX = Math.round(point.x);
            const gridZ = Math.round(point.z);
            if (selectedBuildingType === 'horizontal-road' || selectedBuildingType === 'vertical-road') {
                placeRoad(selectedBuildingType, gridX, gridZ);
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
const buildingPreviewGeometry = new THREE.BoxGeometry(1, 1, 1);
const buildingPreview = new THREE.Mesh(buildingPreviewGeometry, previewMaterial);
buildingPreview.visible = false;
scene.add(buildingPreview);

// Horizontal road preview (a thin, wide rectangle)
const horizontalRoadPreviewGeometry = new THREE.BoxGeometry(1, 0.01, 0.2);
const horizontalRoadPreview = new THREE.Mesh(horizontalRoadPreviewGeometry, roadPreviewMaterial);
horizontalRoadPreview.visible = false;
scene.add(horizontalRoadPreview);

// Vertical road preview (a thin, tall rectangle)
const verticalRoadPreviewGeometry = new THREE.BoxGeometry(0.2, 0.01, 1);
const verticalRoadPreview = new THREE.Mesh(verticalRoadPreviewGeometry, roadPreviewMaterial);
verticalRoadPreview.visible = false;
scene.add(verticalRoadPreview);

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
    if (intersects.length > 0) {
        const point = intersects[0].point;
        const gridX = Math.round(point.x); // Snap to nearest grid point
        const gridZ = Math.round(point.z);

        // Hide all previews initially
        buildingPreview.visible = false;
        horizontalRoadPreview.visible = false;
        verticalRoadPreview.visible = false;

        // Show preview based on selected building type
        if (selectedBuildingType) {
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
                buildingPreview.position.set(gridX, 0.5, gridZ); // Center on grid point, raised
                buildingPreview.visible = true;
            } else if (selectedBuildingType === 'horizontal-road') {
                horizontalRoadPreview.position.set(gridX + 0.5, 0.005, gridZ); // Between grid points
                horizontalRoadPreview.visible = true;
            } else if (selectedBuildingType === 'vertical-road') {
                verticalRoadPreview.position.set(gridX, 0.005, gridZ + 0.5); // Between grid points
                verticalRoadPreview.visible = true;
            }
        }
    } else {
        // Hide all previews when not over the ground
        buildingPreview.visible = false;
        horizontalRoadPreview.visible = false;
        verticalRoadPreview.visible = false;
    }
}
