// Constants
const WORK_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const STANDARD_HOURS = 8 * 60; // 8 hours in minutes
const THRESHOLD = 5; // 5 minutes threshold
const PERMIT_STEP = 30; // 30 minutes step for permits
const MIN_LUNCH_BREAK = 60; // Minimum lunch break in minutes
const MIN_ENTRY_TIME = '07:30'; // Minimum entry time (earlier doesn't count)
const MAX_EXIT_TIME = '18:00'; // Maximum exit time (later doesn't count)
const STORAGE_KEY = 'workTimeData';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeTable();
    loadFromStorage();
    attachEventListeners();
    updateAllCalculations();
});

// Initialize the table with 5 rows for weekdays
function initializeTable() {
    const tbody = document.getElementById('workTableBody');
    
    WORK_DAYS.forEach((day, index) => {
        const row = createTableRow(day, index);
        tbody.appendChild(row);
    });
}

// Create a table row for a day
function createTableRow(day, index) {
    const tr = document.createElement('tr');
    tr.dataset.index = index;
    
    tr.innerHTML = `
        <td class="day-cell">${day}</td>
        <td><input type="checkbox" class="smartworking-check" data-index="${index}"></td>
        <td><input type="time" class="entry1" data-index="${index}"></td>
        <td><input type="time" class="exit1" data-index="${index}"></td>
        <td><input type="time" class="entry2" data-index="${index}"></td>
        <td class="exit2-cell">
            <input type="time" class="exit2" data-index="${index}">
            <span class="exit2-tooltip" data-index="${index}"></span>
        </td>
        <td class="permit-cell">
            <button class="btn btn-secondary remove-permit" data-index="${index}">-</button>
            <button class="btn btn-primary add-permit" data-index="${index}">+</button>
            <span class="permit-value" data-index="${index}">00:00</span>
        </td>
        <td class="diff-cell diff-neutral" data-index="${index}">0</td>
    `;
    
    return tr;
}

// Attach event listeners
function attachEventListeners() {
    // Clear button
    document.getElementById('clearButton').addEventListener('click', clearStorage);
    
    // SmartWorking checkboxes - dedicated listener
    document.querySelectorAll('.smartworking-check').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const index = parseInt(checkbox.dataset.index);
            handleSmartWorkingChange(index, checkbox.checked);
            saveToStorage();
            updateAllCalculations();
        });
    });
    
    // Time inputs
    document.querySelectorAll('input[type="time"]').forEach(input => {
        input.addEventListener('change', () => {
            saveToStorage();
            updateAllCalculations();
        });
        
        // For time inputs, also listen to input event for real-time placeholder update
        input.addEventListener('input', () => {
            const index = parseInt(input.dataset.index);
            updateExit2Placeholder(index);
        });
    });
    
    // Permit buttons
    document.querySelectorAll('.add-permit').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            addPermitMinutes(index);
        });
    });
    
    document.querySelectorAll('.remove-permit').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            removePermitMinutes(index);
        });
    });
}

// Handle SmartWorking checkbox change
function handleSmartWorkingChange(index, isChecked) {
    const entry1Input = document.querySelector(`.entry1[data-index="${index}"]`);
    const exit1Input = document.querySelector(`.exit1[data-index="${index}"]`);
    const entry2Input = document.querySelector(`.entry2[data-index="${index}"]`);
    const exit2Input = document.querySelector(`.exit2[data-index="${index}"]`);
    
    if (isChecked) {
        // Clear all time fields
        entry1Input.value = '';
        exit1Input.value = '';
        entry2Input.value = '';
        exit2Input.value = '';
        
        // Disable all time fields
        entry1Input.disabled = true;
        exit1Input.disabled = true;
        entry2Input.disabled = true;
        exit2Input.disabled = true;
    } else {
        // Re-enable all time fields
        entry1Input.disabled = false;
        exit1Input.disabled = false;
        entry2Input.disabled = false;
        exit2Input.disabled = false;
    }
}

// Add permit minutes (30 min step)
function addPermitMinutes(index) {
    const data = getStoredData();
    const current = data[index]?.permit || 0;
    data[index] = data[index] || {};
    data[index].permit = current + PERMIT_STEP;
    
    saveData(data);
    updatePermitDisplay(index);
    updateAllCalculations();
}

// Remove permit minutes (30 min step)
function removePermitMinutes(index) {
    const data = getStoredData();
    const current = data[index]?.permit || 0;
    data[index] = data[index] || {};
    data[index].permit = Math.max(0, current - PERMIT_STEP);
    
    saveData(data);
    updatePermitDisplay(index);
    updateAllCalculations();
}

// Update permit display
function updatePermitDisplay(index) {
    const data = getStoredData();
    const permit = data[index]?.permit || 0;
    const permitSpan = document.querySelector(`.permit-value[data-index="${index}"]`);
    
    // Convert to HH:MM format
    const hours = Math.floor(permit / 60);
    const minutes = permit % 60;
    permitSpan.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Calculate minutes worked for a day
function calculateDayMinutes(index) {
    const data = getStoredData();
    const dayData = data[index] || {};
    
    // If smartworking is enabled, always return 0 (8h standard)
    if (dayData.smartworking) {
        return 0;
    }
    
    const entry1 = dayData.entry1;
    const exit1 = dayData.exit1;
    const entry2 = dayData.entry2;
    const exit2 = dayData.exit2;
    const permit = dayData.permit || 0;
    
    // If no time data is entered at all, return 0 (don't count this day)
    if (!entry1 && !exit1 && !entry2 && !exit2 && permit === 0) {
        return 0;
    }
    
    let totalMinutes = 0;
    
    // Calculate first time slot with time boundaries
    if (entry1 && exit1) {
        const cappedEntry1 = capTime(entry1, MIN_ENTRY_TIME, MAX_EXIT_TIME, true);
        const cappedExit1 = capTime(exit1, MIN_ENTRY_TIME, MAX_EXIT_TIME, false);
        totalMinutes += calculateTimeDifference(cappedEntry1, cappedExit1);
    }
    
    // Calculate second time slot only if both entry2 and exit2 are present
    if (entry2 && exit2) {
        const cappedEntry2 = capTime(entry2, MIN_ENTRY_TIME, MAX_EXIT_TIME, true);
        const cappedExit2 = capTime(exit2, MIN_ENTRY_TIME, MAX_EXIT_TIME, false);
        totalMinutes += calculateTimeDifference(cappedEntry2, cappedExit2);
    }
    
    // Apply minimum lunch break rule (exit1 to entry2)
    if (exit1 && entry2) {
        const actualBreak = calculateTimeDifference(exit1, entry2);
        if (actualBreak < MIN_LUNCH_BREAK) {
            // Deduct the difference between actual and minimum break
            totalMinutes -= (MIN_LUNCH_BREAK - actualBreak);
        }
    }
    
    // Add permit minutes (they count as additional worked minutes)
    totalMinutes += permit;
    
    // Calculate difference from standard 8 hours
    const diff = totalMinutes - STANDARD_HOURS;
    
    // Apply 5-minute threshold rounding
    return applyThreshold(diff);
}

// Calculate time difference in minutes
function calculateTimeDifference(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    
    return endTotalMin - startTotalMin;
}

// Cap time within boundaries (7:30 to 18:00)
function capTime(time, minTime, maxTime, isEntry) {
    if (!time) return time;
    
    const [hour, min] = time.split(':').map(Number);
    const totalMin = hour * 60 + min;
    
    const [minHour, minMin] = minTime.split(':').map(Number);
    const minTotalMin = minHour * 60 + minMin;
    
    const [maxHour, maxMin] = maxTime.split(':').map(Number);
    const maxTotalMin = maxHour * 60 + maxMin;
    
    // For entry times, use max of actual and minimum (early entries count from min time)
    if (isEntry) {
        if (totalMin < minTotalMin) return minTime;
        // Entry times after max time are not capped - they're just after work hours
        return time;
    } else {
        // For exit times, use min of actual and maximum (late exits count only until max time)
        if (totalMin > maxTotalMin) return maxTime;
        // Exit times before min time are not capped - they're just before work hours
        return time;
    }
}

// Apply threshold rounding (5 minutes)
function applyThreshold(minutes) {
    if (minutes === 0) return 0;
    
    // Determine the sign
    const sign = minutes > 0 ? 1 : -1;
    const absMinutes = Math.abs(minutes);
    
    // Round to nearest multiple of THRESHOLD
    const rounded = Math.round(absMinutes / THRESHOLD) * THRESHOLD;
    
    return sign * rounded;
}

// Update exit2 placeholder suggestion
function updateExit2Placeholder(index) {
    const data = getStoredData();
    const dayData = data[index] || {};
    const exit2Input = document.querySelector(`.exit2[data-index="${index}"]`);
    const exit2Tooltip = document.querySelector(`.exit2-tooltip[data-index="${index}"]`);
    
    // Only suggest if entry1, exit1, entry2 are filled but exit2 is not
    if (dayData.entry1 && dayData.exit1 && dayData.entry2 && !dayData.exit2) {
        const suggestedTime = calculateSuggestedExit2(index);
        if (suggestedTime) {
            exit2Input.placeholder = suggestedTime;
            exit2Tooltip.textContent = `💡 ${suggestedTime}`;
            exit2Tooltip.classList.add('visible');
        } else {
            exit2Tooltip.textContent = '';
            exit2Tooltip.classList.remove('visible');
        }
    } else {
        exit2Input.placeholder = '';
        exit2Tooltip.textContent = '';
        exit2Tooltip.classList.remove('visible');
    }
}

// Calculate suggested exit2 time
function calculateSuggestedExit2(index) {
    const data = getStoredData();
    const dayData = data[index] || {};
    
    const entry1 = dayData.entry1;
    const exit1 = dayData.exit1;
    const entry2 = dayData.entry2;
    const permit = dayData.permit || 0;
    
    if (!entry1 || !exit1 || !entry2) return null;
    
    // Calculate how many minutes worked in first slot with time boundaries
    const cappedEntry1 = capTime(entry1, MIN_ENTRY_TIME, MAX_EXIT_TIME, true);
    const cappedExit1 = capTime(exit1, MIN_ENTRY_TIME, MAX_EXIT_TIME, false);
    const firstSlotMinutes = calculateTimeDifference(cappedEntry1, cappedExit1);
    
    // Calculate lunch break adjustment
    const actualBreak = calculateTimeDifference(exit1, entry2);
    const lunchAdjustment = actualBreak < MIN_LUNCH_BREAK ? (MIN_LUNCH_BREAK - actualBreak) : 0;
    
    // Calculate accumulated deficit from previous days only (not including current day)
    let previousDaysDiff = 0;
    for (let i = 0; i < index; i++) {
        previousDaysDiff += calculateDayMinutes(i);
    }
    
    // We want to reach 0 difference ideally, so calculate needed minutes
    // Standard hours - first slot + lunch deduction adjustment - permit (which adds to worked time)
    let neededMinutes = STANDARD_HOURS - firstSlotMinutes + lunchAdjustment - permit;
    
    // If we have a deficit from previous days, we might want to work more
    if (previousDaysDiff < 0) {
        neededMinutes += Math.abs(previousDaysDiff);
    }
    
    // Calculate exit2 time from entry2
    const cappedEntry2 = capTime(entry2, MIN_ENTRY_TIME, MAX_EXIT_TIME, true);
    const [entry2Hour, entry2Min] = cappedEntry2.split(':').map(Number);
    const entry2TotalMin = entry2Hour * 60 + entry2Min;
    const exit2TotalMin = entry2TotalMin + Math.max(0, neededMinutes);
    
    // Cap at MAX_EXIT_TIME
    const [maxHour, maxMin] = MAX_EXIT_TIME.split(':').map(Number);
    const maxTotalMin = maxHour * 60 + maxMin;
    
    const finalExit2TotalMin = Math.min(exit2TotalMin, maxTotalMin);
    
    // Round down to 5-minute steps
    const roundedExit2TotalMin = Math.floor(finalExit2TotalMin / THRESHOLD) * THRESHOLD;
    
    const exit2Hour = Math.floor(roundedExit2TotalMin / 60);
    const exit2Minute = roundedExit2TotalMin % 60;
    
    return `${String(exit2Hour).padStart(2, '0')}:${String(exit2Minute).padStart(2, '0')}`;
}

// Update all calculations
function updateAllCalculations() {
    WORK_DAYS.forEach((_, index) => {
        const diff = calculateDayMinutes(index);
        updateDayDiffDisplay(index, diff);
        updatePermitDisplay(index);
        updateExit2Placeholder(index);
    });
    
    updateTotalDisplay();
}

// Update day difference display
function updateDayDiffDisplay(index, diff) {
    const cell = document.querySelector(`.diff-cell[data-index="${index}"]`);
    cell.textContent = diff;
    
    // Update styling based on value
    cell.classList.remove('diff-positive', 'diff-negative', 'diff-neutral');
    if (diff > 0) {
        cell.classList.add('diff-positive');
    } else if (diff < 0) {
        cell.classList.add('diff-negative');
    } else {
        cell.classList.add('diff-neutral');
    }
}

// Calculate total minutes difference
function calculateTotalMinutes() {
    let total = 0;
    WORK_DAYS.forEach((_, index) => {
        total += calculateDayMinutes(index);
    });
    return total;
}

// Update total display
function updateTotalDisplay() {
    const total = calculateTotalMinutes();
    const totalElement = document.getElementById('totalMinutes');
    
    totalElement.textContent = total;
    
    // Update styling
    totalElement.style.color = total > 0 ? 'var(--success-color)' : 
                               total < 0 ? 'var(--danger-color)' : 'white';
}

// LocalStorage functions
function getStoredData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function saveToStorage() {
    const data = {};
    const existingData = getStoredData();
    
    WORK_DAYS.forEach((_, index) => {
        data[index] = {
            smartworking: document.querySelector(`.smartworking-check[data-index="${index}"]`).checked,
            entry1: document.querySelector(`.entry1[data-index="${index}"]`).value,
            exit1: document.querySelector(`.exit1[data-index="${index}"]`).value,
            entry2: document.querySelector(`.entry2[data-index="${index}"]`).value,
            exit2: document.querySelector(`.exit2[data-index="${index}"]`).value,
            permit: existingData[index]?.permit || 0
        };
    });
    
    saveData(data);
}

function loadFromStorage() {
    const data = getStoredData();
    
    WORK_DAYS.forEach((_, index) => {
        const dayData = data[index] || {};
        
        if (dayData.smartworking !== undefined) {
            document.querySelector(`.smartworking-check[data-index="${index}"]`).checked = dayData.smartworking;
            // Apply SmartWorking state (disable/enable fields)
            handleSmartWorkingChange(index, dayData.smartworking);
        }
        if (dayData.entry1) {
            document.querySelector(`.entry1[data-index="${index}"]`).value = dayData.entry1;
        }
        if (dayData.exit1) {
            document.querySelector(`.exit1[data-index="${index}"]`).value = dayData.exit1;
        }
        if (dayData.entry2) {
            document.querySelector(`.entry2[data-index="${index}"]`).value = dayData.entry2;
        }
        if (dayData.exit2) {
            document.querySelector(`.exit2[data-index="${index}"]`).value = dayData.exit2;
        }
        
        updatePermitDisplay(index);
    });
}

function clearStorage() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati?')) {
        localStorage.removeItem(STORAGE_KEY);
        
        // Clear all inputs
        document.querySelectorAll('input[type="time"]').forEach(input => input.value = '');
        document.querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
        
        // Reset permits
        const data = {};
        WORK_DAYS.forEach((_, index) => {
            data[index] = { permit: 0 };
        });
        saveData(data);
        
        updateAllCalculations();
    }
}
