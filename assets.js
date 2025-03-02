window.CityBuilder = window.CityBuilder || {};
CityBuilder.assets = {
    // Materials
    roadMaterial: new THREE.MeshBasicMaterial({ color: 0x888888 }),
    sidewalkMaterial: new THREE.MeshBasicMaterial({ color: 0xcccccc }),
    laneLineMaterial: new THREE.MeshBasicMaterial({ color: 0xffffff }),

    // Residential building (house)
    createHouseBuilding: function() {
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

        // Add a small chimney
        const chimneyWidth = 0.1;
        const chimneyHeight = 0.2;
        const chimneyGeometry = new THREE.BoxGeometry(chimneyWidth, chimneyHeight, chimneyWidth);
        const chimneyMaterial = new THREE.MeshBasicMaterial({ color: 0x8B0000 }); // Dark red
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(bodyWidth/4, bodyHeight + roofHeight/2 + chimneyHeight/2, 0);
        houseGroup.add(chimney);
        
        // Add a small yard/garden
        const yardSize = 0.8;
        const yardGeometry = new THREE.PlaneGeometry(yardSize, yardSize);
        const yardMaterial = new THREE.MeshBasicMaterial({ color: 0x7CFC00, side: THREE.DoubleSide }); // Light green
        const yard = new THREE.Mesh(yardGeometry, yardMaterial);
        yard.position.set(0, 0.001, 0); // Just above ground
        yard.rotation.x = -Math.PI / 2; // Flat on ground
        houseGroup.add(yard);
        
        return houseGroup;
    },

    // Commercial building
    createCommercialBuilding: function() {
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

    // Add a roof structure
    const roofGeometry = new THREE.BoxGeometry(buildingWidth + 0.1, 0.05, buildingDepth + 0.1);
    const roofMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Dark gray
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = buildingHeight + 0.025;
    buildingGroup.add(roof);
    
    // Add roof details (like AC units, water towers, etc.)
    if (Math.random() < 0.7) { // 70% chance to have roof details
        // AC unit or mechanical equipment
        const acUnitGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.2);
        const acUnitMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
        const acUnit = new THREE.Mesh(acUnitGeometry, acUnitMaterial);
        acUnit.position.set(
            (Math.random() - 0.5) * (buildingWidth/2),
            buildingHeight + 0.1,
            (Math.random() - 0.5) * (buildingDepth/2)
        );
        buildingGroup.add(acUnit);
        
        // Maybe add a water tower for taller buildings
        if (buildingHeight > 2 && Math.random() < 0.4) {
            const towerBaseGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8);
            const towerTopGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
            const towerMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
            
            const towerBase = new THREE.Mesh(towerBaseGeometry, towerMaterial);
            const towerTop = new THREE.Mesh(towerTopGeometry, towerMaterial);
            
            towerBase.position.set(
                -buildingWidth/4,
                buildingHeight + 0.075,
                buildingDepth/4
            );
            
            towerTop.position.set(
                -buildingWidth/4,
                buildingHeight + 0.2,
                buildingDepth/4
            );
            
            buildingGroup.add(towerBase);
            buildingGroup.add(towerTop);
        }
    }
    
    return buildingGroup;
    },

    // Industrial building
    createIndustrialBuilding: function() {
        const geometry = new THREE.BoxGeometry(0.8, 0.8 + Math.random() * 0.4, 0.8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const building = new THREE.Mesh(geometry, material);
        building.position.y = building.geometry.parameters.height / 2;
        return building;
    },

    // Road group
    createRoadGroup: function(roadType) {
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
        // Create a custom geometry for the corner road piece with a rounded corner
        const roadWidth = 0.8;
        const sideLength = 1.0;
        
        // Create a custom shape with a rounded corner
        const shape = new THREE.Shape();
        
        // Determine which corner to round based on parameters
        if (sw) {
            // Southwest corner - round the southwest corner
            shape.moveTo(-0.5, -0.5);  // Bottom-left
            shape.lineTo(0.5, -0.5);   // Bottom-right
            shape.lineTo(0.5, 0.0);    // Start of curve
            
            // Add a quadratic curve for the rounded corner
            shape.quadraticCurveTo(0.5, 0.5, 0.0, 0.5);
            
            shape.lineTo(-0.5, 0.5);   // Top-left
            shape.lineTo(-0.5, -0.5);  // Back to start
        } else if (se) {
            // Southeast corner - round the southeast corner
            shape.moveTo(0.5, -0.5);   // Bottom-right
            shape.lineTo(-0.5, -0.5);  // Bottom-left
            shape.lineTo(-0.5, 0.0);   // Start of curve
            
            // Add a quadratic curve for the rounded corner
            shape.quadraticCurveTo(-0.5, 0.5, 0.0, 0.5);
            
            shape.lineTo(0.5, 0.5);    // Top-right
            shape.lineTo(0.5, -0.5);   // Back to start
        } else if (nw) {
            // Northwest corner - round the northwest corner
            shape.moveTo(-0.5, 0.5);   // Top-left
            shape.lineTo(0.5, 0.5);    // Top-right
            shape.lineTo(0.5, 0.0);    // Start of curve
            
            // Add a quadratic curve for the rounded corner
            shape.quadraticCurveTo(0.5, -0.5, 0.0, -0.5);
            
            shape.lineTo(-0.5, -0.5);  // Bottom-left
            shape.lineTo(-0.5, 0.5);   // Back to start
        } else if (ne) {
            // Northeast corner - round the northeast corner
            shape.moveTo(0.5, 0.5);    // Top-right
            shape.lineTo(-0.5, 0.5);   // Top-left
            shape.lineTo(-0.5, 0.0);   // Start of curve
            
            // Add a quadratic curve for the rounded corner
            shape.quadraticCurveTo(-0.5, -0.5, 0.0, -0.5);
            
            shape.lineTo(0.5, -0.5);   // Bottom-right
            shape.lineTo(0.5, 0.5);    // Back to start
        }
        
        // Create geometry from the shape
        const roadGeometry = new THREE.ShapeGeometry(shape);
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
        roadGroup.add(road);
        
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
};