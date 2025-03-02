window.CityBuilder = window.CityBuilder || {};
CityBuilder.storage = {
    generateSaveId: function() {
        return `simcity_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    },

    getSavedCities: function() {
        const cities = [];
        
        // Loop through localStorage and find all simcity saves
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('simcity_')) {
                try {
                    // Get the value associated with the key
                    const savedData = localStorage.getItem(key);
                    if (!savedData) continue;
                    
                    const data = JSON.parse(savedData);
                    cities.push({
                        id: key,
                        name: data.cityName || 'Unnamed City',
                        description: data.cityDescription || '',
                        timestamp: new Date(data.timestamp || Date.now()),
                        stats: data.stats || { population: 0 },
                        buildings: data.buildings ? data.buildings.length : 0,
                        roads: data.roads ? data.roads.length : 0
                    });
                } catch (e) {
                    console.error('Error parsing saved city:', e, 'Key:', key);
                }
            }
        }
        
        // Sort by most recent first
        cities.sort((a, b) => b.timestamp - a.timestamp);
        
        return cities;
    },

    saveToLocalStorage: function(saveId, saveData) {
        localStorage.setItem(saveId, JSON.stringify(saveData));
    },

    loadFromLocalStorage: function(saveId) {
        const savedData = localStorage.getItem(saveId);
        return savedData ? JSON.parse(savedData) : null;
    },
    
    saveGameState: function(cityGrid, roadGrid, gameStats) {
        // Show loading spinner
        CityBuilder.ui.loadingSpinner.classList.remove('hidden');
        
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
    
            // Create save data object
            const saveData = {
                buildings: buildingsData,
                roads: roadsData,
                stats: gameStats,
                timestamp: new Date().toISOString()
            };
    
            // Check if we're saving a previously loaded city
            if (CityBuilder.game.currentCityId && CityBuilder.game.currentCityName) {
                // Reuse the existing city ID, name, and description
                saveData.cityName = CityBuilder.game.currentCityName;
                saveData.cityDescription = CityBuilder.game.currentCityDescription || '';
                
                // Save directly without showing the form
                this.saveToLocalStorage(CityBuilder.game.currentCityId, saveData);
                
                // Update auto-save ID to the most recent save
                localStorage.setItem('simcity_autosave_id', CityBuilder.game.currentCityId);
                
                // Reset the unsaved changes flag
                CityBuilder.game.hasUnsavedChanges = false;
                
                // Hide loading spinner
                CityBuilder.ui.loadingSpinner.classList.add('hidden');
                
                // Show save notification
                CityBuilder.ui.showNotification(`City "${CityBuilder.game.currentCityName}" saved!`);
                
                console.log('Game state saved with ID:', CityBuilder.game.currentCityId);
            } else {
                // Generate a new save ID for a new city
                const saveId = this.generateSaveId();
                
                // Store pending save data
                CityBuilder.game.pendingSaveData = saveData;
                CityBuilder.game.pendingSaveId = saveId;
                
                // Hide loading spinner
                CityBuilder.ui.loadingSpinner.classList.add('hidden');
                
                // Show city info form to get name and description
                CityBuilder.ui.showCityInfoForm();
            }
        }, 100); // Small delay to ensure UI updates
    },
    
    saveAsGameState: function(cityGrid, roadGrid, gameStats) {
        // Show loading spinner
        CityBuilder.ui.loadingSpinner.classList.remove('hidden');
        
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
            const saveData = {
                buildings: buildingsData,
                roads: roadsData,
                stats: gameStats,
                timestamp: new Date().toISOString()
            };
            
            // Create a new save ID for 'Save As'
            const saveId = this.generateSaveId();
            
            // If we have an existing city name, suggest it as the default
            if (CityBuilder.game.currentCityName) {
                saveData.cityName = CityBuilder.game.currentCityName;
                saveData.cityDescription = CityBuilder.game.currentCityDescription || '';
            }
            
            // Store pending save data
            CityBuilder.game.pendingSaveData = saveData;
            CityBuilder.game.pendingSaveId = saveId;
            
            // Hide loading spinner
            CityBuilder.ui.loadingSpinner.classList.add('hidden');
            
            // Always show city info form for 'Save As'
            CityBuilder.ui.showCityInfoForm();
        }, 100); // Small delay to ensure UI updates
    },
    
    loadGameState: function(saveId) {
        CityBuilder.ui.loadingSpinner.classList.remove('hidden');
        
        setTimeout(() => {
            // Load saved data
            const savedData = this.loadFromLocalStorage(saveId);
            
            if (!savedData) {
                alert('Failed to load saved city. Data not found or corrupted.');
                CityBuilder.ui.loadingSpinner.classList.add('hidden');
                return;
            }
            
            // Update current city information
            CityBuilder.game.currentCityId = saveId;
            CityBuilder.game.currentCityName = savedData.cityName || 'Unnamed City';
            CityBuilder.game.currentCityDescription = savedData.cityDescription || '';
            
            // Set auto-save preference if it was saved
            if (savedData.hasOwnProperty('autoSaveEnabled')) {
                CityBuilder.ui.autoSaveCheckbox.checked = savedData.autoSaveEnabled;
                
                if (savedData.autoSaveEnabled) {
                    CityBuilder.game.startAutoSave();
                } else {
                    CityBuilder.game.stopAutoSave();
                }
            }
            
            // Update the game state with the loaded data
            CityBuilder.game.loadCityData(savedData);
            
            // Hide loading spinner
            CityBuilder.ui.loadingSpinner.classList.add('hidden');
            
            // Show notification
            CityBuilder.ui.showNotification(`City "${CityBuilder.game.currentCityName}" loaded!`);
            
            // Reset the unsaved changes flag
            CityBuilder.game.hasUnsavedChanges = false;
            
            console.log('Game state loaded with ID:', saveId);
        }, 100); // Small delay to ensure UI updates
    },
    
    autoSaveGameState: function(cityGrid, roadGrid, gameStats) {
        // Only auto-save if we have unsaved changes and a current city ID
        if (!CityBuilder.game.hasUnsavedChanges || !CityBuilder.game.currentCityId) {
            return;
        }
        
        console.log('Auto-saving...');
        
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
        const saveData = {
            buildings: buildingsData,
            roads: roadsData,
            stats: gameStats,
            timestamp: new Date().toISOString(),
            cityName: CityBuilder.game.currentCityName,
            cityDescription: CityBuilder.game.currentCityDescription,
            autoSaveEnabled: CityBuilder.ui.autoSaveCheckbox.checked
        };
        
        // Use the current city ID for auto-save
        this.saveToLocalStorage(CityBuilder.game.currentCityId, saveData);
        
        // Update auto-save ID
        localStorage.setItem('simcity_autosave_id', CityBuilder.game.currentCityId);
        
        // Reset the unsaved changes flag
        CityBuilder.game.hasUnsavedChanges = false;
        
        // Show subtle notification
        CityBuilder.ui.showNotification('Auto-saved', 1000);
    }
};