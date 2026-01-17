// ==========================================
// MODULE: Settings (PIN & Vehicle)
// ==========================================

import { db } from './firebase-config.js';
import { showToast } from './ui.js';
import { renderHeader } from './ui.js';

// 1. PIN SETTINGS
export function openPinModal() {
    document.getElementById('pinModal').classList.remove('hidden');
    document.getElementById('newPinInput').value = '';
}

export function closePinModal() {
    document.getElementById('pinModal').classList.add('hidden');
}

export function saveNewPin() {
    const newPin = document.getElementById('newPinInput').value;
    const user = window.Ramazone.user;

    if (!newPin || newPin.length < 4) {
        return showToast("Enter 4 digit PIN");
    }

    // Database Update
    db.ref('deliveryBoys/' + user.mobile).update({ password: newPin }).then(() => {
        showToast("PIN Updated Successfully!");

        // Local Storage Update
        user.password = newPin;
        localStorage.setItem('rmz_delivery_user', JSON.stringify(user));

        closePinModal();
    }).catch(err => {
        showToast("Error updating PIN");
        console.error(err);
    });
}

// 2. VEHICLE SETTINGS
export function openVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('hidden');
    // Set current vehicle selection
    const current = window.Ramazone.user.vehicle || 'Bike';
    const select = document.getElementById('vehicleSelect');
    if(select) select.value = current;
}

export function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.add('hidden');
}

export function saveVehicleInfo() {
    const newVehicle = document.getElementById('vehicleSelect').value;
    const user = window.Ramazone.user;

    // Database Update
    db.ref('deliveryBoys/' + user.mobile).update({ vehicle: newVehicle }).then(() => {
        showToast("Vehicle Info Updated!");

        // Local Storage & UI Update
        user.vehicle = newVehicle;
        window.Ramazone.user = user;
        localStorage.setItem('rmz_delivery_user', JSON.stringify(user));

        renderHeader(user); // Header mein turant change dikhayega
        closeVehicleModal();
    }).catch(err => {
        showToast("Error updating Vehicle");
        console.error(err);
    });
}