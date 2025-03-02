window.CityBuilder = window.CityBuilder || {};
CityBuilder.ui = {
    init: function() {
        // DOM elements
        this.saveLoadContainer = document.getElementById('save-load-container');
        this.newCityButton = document.getElementById('new-city-btn');
        this.saveButton = document.getElementById('save-city-btn');
        this.saveAsButton = document.getElementById('save-as-btn');
        this.loadButton = document.getElementById('load-city-btn');
        this.autoSaveCheckbox = document.getElementById('auto-save');
        this.saveNotification = document.getElementById('save-notification');
        this.loadModal = document.getElementById('load-modal');
        this.modalContent = document.getElementById('modal-content');
        this.closeModalBtn = document.getElementById('close-modal-btn');
        this.savedCitiesList = document.getElementById('saved-cities-list');
        this.cityInfoForm = document.getElementById('city-info-form');
        this.cityNameInput = document.getElementById('city-name');
        this.cityDescriptionInput = document.getElementById('city-description');
        this.saveCityInfoBtn = document.getElementById('save-city-info');
        this.cancelCityInfoBtn = document.getElementById('cancel-city-info');
        this.loadingSpinner = document.getElementById('loading-spinner');

        // Event listeners
        this.newCityButton.addEventListener('click', CityBuilder.game.createNewCity);
        this.saveButton.addEventListener('click', CityBuilder.game.saveGameState);
        this.saveAsButton.addEventListener('click', CityBuilder.game.saveAsGameState);
        this.loadButton.addEventListener('click', () => {
            this.populateSavedCitiesList();
            this.loadModal.style.display = 'block';
        });
        this.closeModalBtn.onclick = () => this.loadModal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target === this.loadModal) this.loadModal.style.display = 'none';
        };
        this.saveCityInfoBtn.addEventListener('click', CityBuilder.game.completeSaveWithCityInfo);
        this.cancelCityInfoBtn.addEventListener('click', () => {
            if (confirm('Cancel saving? Your city will not be saved.')) {
                this.hideCityInfoForm();
            }
        });
        this.autoSaveCheckbox.addEventListener('change', () => {
            if (this.autoSaveCheckbox.checked) {
                CityBuilder.game.startAutoSave();
            } else {
                CityBuilder.game.stopAutoSave();
            }
        });
    },

    showNotification: function(message, duration = 2000) {
        // Make sure we have a reference to the notification element
        const notification = this.saveNotification || document.getElementById('save-notification');
        
        // Store the reference for future use
        this.saveNotification = notification;
        
        if (notification) {
            notification.textContent = message;
            notification.style.opacity = '1';
            setTimeout(() => notification.style.opacity = '0', duration);
        } else {
            console.warn('Save notification element not found');
        }
    },

    populateSavedCitiesList: function() {
        this.savedCitiesList.innerHTML = '';
        const cities = CityBuilder.storage.getSavedCities();
        
        if (cities.length === 0) {
            const noSavesMsg = document.createElement('p');
            noSavesMsg.textContent = 'No saved cities found.';
            noSavesMsg.style.textAlign = 'center';
            noSavesMsg.style.color = '#666';
            this.savedCitiesList.appendChild(noSavesMsg);
            return;
        }
        
        cities.forEach(city => {
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
                CityBuilder.game.loadGameState(city.id);
                CityBuilder.ui.loadModal.style.display = 'none';
            };
            buttonsContainer.appendChild(loadBtn);
            
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.textContent = 'Edit Info';
            editBtn.onclick = function() {
                CityBuilder.ui.editCityInfo(city.id, city.name, city.description);
            };
            buttonsContainer.appendChild(editBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = function() {
                if (confirm('Are you sure you want to delete this saved city?')) {
                    localStorage.removeItem(city.id);
                    CityBuilder.ui.populateSavedCitiesList();
                    
                    // Show notification
                    CityBuilder.ui.showNotification('City deleted successfully');
                }
            };
            buttonsContainer.appendChild(deleteBtn);
            
            cityItem.appendChild(buttonsContainer);
            
            this.savedCitiesList.appendChild(cityItem);
        });
    },
    
    editCityInfo: function(saveId, currentName, currentDescription) {
        // Store the save ID for later use
        CityBuilder.game.pendingSaveId = saveId;
        
        // Load the existing save data
        const savedData = CityBuilder.storage.loadFromLocalStorage(saveId);
        if (!savedData) {
            console.error('Save data not found');
            return;
        }
        
        CityBuilder.game.pendingSaveData = savedData;
        
        // Set form values to current values
        this.cityNameInput.value = currentName || 'Unnamed City';
        this.cityDescriptionInput.value = currentDescription || '';
        
        // Show the form
        this.cityInfoForm.classList.remove('hidden');
        
        // Update the save button text to indicate we're editing
        this.saveCityInfoBtn.textContent = 'Update Info';
        
        // Hide the load modal while editing
        this.loadModal.style.display = 'none';
        
        // If this is the currently loaded city, update the current city info when done
        if (saveId === CityBuilder.game.currentCityId) {
            this.saveCityInfoBtn.dataset.updateCurrent = 'true';
        } else {
            this.saveCityInfoBtn.dataset.updateCurrent = 'false';
        }
    },

    showCityInfoForm: function() {
        // Set default values
        this.cityNameInput.value = 'My Awesome City';
        this.cityDescriptionInput.value = '';
        
        // Show the form
        this.cityInfoForm.classList.remove('hidden');
        
        // Make sure the save button has the correct text
        this.saveCityInfoBtn.textContent = 'Save';
    },

    hideCityInfoForm: function() {
        this.cityInfoForm.classList.add('hidden');
        
        // Reset pending save data if we're canceling a new save
        // (not when we're just finishing an edit)
        if (this.saveCityInfoBtn.textContent === 'Save') {
            CityBuilder.game.pendingSaveData = null;
            CityBuilder.game.pendingSaveId = null;
        }
    },

    completeSaveWithCityInfo: function() {
        if (!CityBuilder.game.pendingSaveData || !CityBuilder.game.pendingSaveId) {
            console.error('No pending save data');
            return;
        }
        
        // Add city name, description, and auto-save preference to the save data
        CityBuilder.game.pendingSaveData.cityName = this.cityNameInput.value.trim() || 'Unnamed City';
        CityBuilder.game.pendingSaveData.cityDescription = this.cityDescriptionInput.value.trim();
        CityBuilder.game.pendingSaveData.autoSaveEnabled = this.autoSaveCheckbox.checked;
        
        // Save to localStorage
        CityBuilder.storage.saveToLocalStorage(CityBuilder.game.pendingSaveId, CityBuilder.game.pendingSaveData);
        
        // Update auto-save ID if this is the most recent save
        if (localStorage.getItem('simcity_autosave_id') === CityBuilder.game.pendingSaveId) {
            localStorage.setItem('simcity_autosave_id', CityBuilder.game.pendingSaveId);
        }
        
        // Check if we need to update the current city information
        if (this.saveCityInfoBtn.dataset.updateCurrent === 'true' || CityBuilder.game.pendingSaveId === CityBuilder.game.currentCityId) {
            CityBuilder.game.currentCityId = CityBuilder.game.pendingSaveId;
            CityBuilder.game.currentCityName = CityBuilder.game.pendingSaveData.cityName;
            CityBuilder.game.currentCityDescription = CityBuilder.game.pendingSaveData.cityDescription;
        }
        
        // Hide the form
        this.hideCityInfoForm();
        
        // Show save notification
        this.showNotification(`City "${CityBuilder.game.pendingSaveData.cityName}" saved!`);
        
        console.log('Game state saved with ID:', CityBuilder.game.pendingSaveId);
        
        // Reset the save button text
        this.saveCityInfoBtn.textContent = 'Save';
        
        // Reset the dataset attribute
        this.saveCityInfoBtn.dataset.updateCurrent = 'false';
        
        // If we were editing from the load modal, show it again
        if (this.loadModal.style.display === 'none' && document.activeElement !== this.saveButton) {
            this.loadModal.style.display = 'block';
            this.populateSavedCitiesList(); // Refresh the list
        }
        
        // Reset the unsaved changes flag
        CityBuilder.game.hasUnsavedChanges = false;
    },
    
    updateButtonStyles: function() {
        // You'll need to implement this based on the original code in game.js
        // This function updates button styles based on game state
    }
};