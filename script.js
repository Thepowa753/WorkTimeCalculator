// Constants
const WORK_DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
const STANDARD_HOURS = 8 * 60; // 8 hours in minutes
const THRESHOLD = 5; // 5 minutes threshold
const PERMIT_STEP = 30; // 30 minutes step for permits
const MIN_LUNCH_BREAK = 60; // Minimum lunch break in minutes
const MIN_ENTRY_TIME = '07:30'; // Minimum entry time (earlier doesn't count)
const MAX_EXIT_TIME = '20:00'; // Maximum exit time (later doesn't count)
const STORAGE_KEY = 'workTimeData';
const DEFAULT_DAY_KEY = 'defaultDayData';

// Helper function to format minutes to HH:MM
function formatMinutesToHHMM(minutes) {
    const sign = minutes < 0 ? '-' : '';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeTable();
    loadFromStorage();
    loadDefaultDay();
    attachEventListeners();
    attachDefaultDayListeners();
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
        <td><input type="text" class="entry1" data-index="${index}" placeholder="HH:MM" pattern="[0-9]{2}:[0-9]{2}"></td>
        <td><input type="text" class="exit1" data-index="${index}" placeholder="HH:MM" pattern="[0-9]{2}:[0-9]{2}"></td>
        <td><input type="text" class="entry2" data-index="${index}" placeholder="HH:MM" pattern="[0-9]{2}:[0-9]{2}"></td>
        <td class="exit2-cell">
            <input type="text" class="exit2" data-index="${index}" placeholder="HH:MM" pattern="[0-9]{2}:[0-9]{2}">
            <span class="exit2-tooltip" data-index="${index}"></span>
        </td>
        <td class="permit-cell">
            <button class="btn btn-secondary remove-permit" data-index="${index}">-</button>
            <button class="btn btn-primary add-permit" data-index="${index}">+</button>
            <span class="permit-value" data-index="${index}">00:00</span>
        </td>
        <td class="diff-cell diff-neutral" data-index="${index}">00:00</td>
    `;
    
    return tr;
}

// Attach event listeners
function attachEventListeners() {
    // Clear button
    document.getElementById('clearButton').addEventListener('click', clearStorage);
    
    // Export button
    document.getElementById('exportButton').addEventListener('click', exportToCSV);
    
    // SmartWorking checkboxes - dedicated listener
    document.querySelectorAll('.smartworking-check').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const index = parseInt(checkbox.dataset.index);
            handleSmartWorkingChange(index, checkbox.checked);
            saveToStorage();
            updateAllCalculations();
        });
    });
    
    // Time inputs - only in the main work table
    const workTableInputs = document.querySelectorAll('#workTableBody input[type="text"]');
    workTableInputs.forEach(input => {
        input.addEventListener('change', () => {
            saveToStorage();
            updateAllCalculations();
        });
        
        // For time inputs, also listen to input event for real-time placeholder update
        input.addEventListener('input', () => {
            const index = parseInt(input.dataset.index);
            if (!isNaN(index)) {
                updateExit2Placeholder(index);
            }
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
    
    // Remove blinking class when permit is added
    const addPermitButton = document.querySelector(`.add-permit[data-index="${index}"]`);
    addPermitButton.classList.remove('blink');
    
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

// Update permit button blinking status
function updatePermitButtonBlinking(index) {
    const data = getStoredData();
    const dayData = data[index] || {};
    const entry1 = dayData.entry1;
    const permit = dayData.permit || 0;
    const addPermitButton = document.querySelector(`.add-permit[data-index="${index}"]`);
    
    // Check if entry1 is after 09:00 and no permit has been added
    if (entry1 && permit === 0) {
        const [hour, min] = entry1.split(':').map(Number);
        const entryMinutes = hour * 60 + min;
        const nineAMMinutes = 9 * 60; // 09:00 in minutes
        
        if (entryMinutes > nineAMMinutes) {
            // Entry is after 09:00 and no permit, add blinking class
            addPermitButton.classList.add('blink');
        } else {
            // Entry is at or before 09:00, remove blinking
            addPermitButton.classList.remove('blink');
        }
    } else {
        // Either no entry1 or permit has been added, remove blinking
        addPermitButton.classList.remove('blink');
    }
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
    
    // Guard against missing elements during initialization or when elements are being updated
    if (!exit2Input || !exit2Tooltip) return;
    
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
    
    // Calculate accumulated minutes from previous days only (not including current day)
    let previousDaysDiff = 0;
    for (let i = 0; i < index; i++) {
        previousDaysDiff += calculateDayMinutes(i);
    }
    
    // We want to reach 0 difference ideally, so calculate needed minutes
    // Standard hours - first slot + lunch deduction adjustment - permit (which adds to worked time)
    let neededMinutes = STANDARD_HOURS - firstSlotMinutes + lunchAdjustment - permit;
    
    // Account for previous days' accumulated minutes
    // previousDaysDiff > 0: surplus (worked extra) - subtract to leave earlier
    // previousDaysDiff < 0: deficit (worked less) - subtract negative (adds) to work more
    neededMinutes -= previousDaysDiff;
    
    // Calculate exit2 time from entry2
    const cappedEntry2 = capTime(entry2, MIN_ENTRY_TIME, MAX_EXIT_TIME, true);
    const [entry2Hour, entry2Min] = cappedEntry2.split(':').map(Number);
    const entry2TotalMin = entry2Hour * 60 + entry2Min;
    const exit2TotalMin = entry2TotalMin + Math.max(0, neededMinutes);
    
    // Cap at MAX_EXIT_TIME
    const [maxHour, maxMin] = MAX_EXIT_TIME.split(':').map(Number);
    const maxTotalMin = maxHour * 60 + maxMin;
    
    const finalExit2TotalMin = Math.min(exit2TotalMin, maxTotalMin);
    
    // Ensure exit2 is never before 16:30 (990 minutes from midnight)
    const minExit2Time = 16 * 60 + 30; // 16:30 in minutes
    const cappedExit2TotalMin = Math.max(finalExit2TotalMin, minExit2Time);
    
    // Round down to 5-minute steps
    const roundedExit2TotalMin = Math.floor(cappedExit2TotalMin / THRESHOLD) * THRESHOLD;
    
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
        updatePermitButtonBlinking(index);
    });
    
    updateTotalDisplay();
}

// Update day difference display
function updateDayDiffDisplay(index, diff) {
    const cell = document.querySelector(`.diff-cell[data-index="${index}"]`);
    
    // Convert to HH:MM format using helper
    cell.textContent = formatMinutesToHHMM(diff);
    
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
    
    // Convert to HH:MM format using helper
    totalElement.textContent = formatMinutesToHHMM(total);
    
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
    if (confirm('Sei sicuro di voler cancellare tutti i dati della settimana? La giornata default verrà preservata.')) {
        // Clear week data only, not default day
        localStorage.removeItem(STORAGE_KEY);
        
        // Clear all time inputs in work table and re-enable editing
        const workTableInputs = document.querySelectorAll('#workTableBody input[type="text"]');
        workTableInputs.forEach(input => {
            input.value = '';
            input.disabled = false; // Re-enable all time inputs
        });
        
        // Uncheck all smartworking checkboxes in work table
        const workTableCheckboxes = document.querySelectorAll('#workTableBody input[type="checkbox"]');
        workTableCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Apply default day to week
        applyDefaultToWeek();
        
        updateAllCalculations();
    }
}

// Export to CSV
function exportToCSV() {
    const data = getStoredData();
    
    // Prepare CSV content
    let csvContent = '';
    
    // Add header row
    csvContent += 'Giorno,SmartWorking,Entrata 1,Uscita 1,Entrata 2,Uscita 2,Permesso,Scarto (HH:MM)\n';
    
    // Add data rows
    WORK_DAYS.forEach((day, index) => {
        const dayData = data[index] || {};
        const diff = calculateDayMinutes(index);
        
        // Format difference and permit as HH:MM using helper
        const diffFormatted = formatMinutesToHHMM(diff);
        const permitFormatted = formatMinutesToHHMM(dayData.permit || 0);
        
        csvContent += `${day},`;
        csvContent += `${dayData.smartworking ? 'Sì' : 'No'},`;
        csvContent += `${dayData.entry1 || ''},`;
        csvContent += `${dayData.exit1 || ''},`;
        csvContent += `${dayData.entry2 || ''},`;
        csvContent += `${dayData.exit2 || ''},`;
        csvContent += `${permitFormatted},`;
        csvContent += `${diffFormatted}\n`;
    });
    
    // Add empty row
    csvContent += '\n';
    
    // Add total row
    const total = calculateTotalMinutes();
    const totalFormatted = formatMinutesToHHMM(total);
    
    csvContent += `TOTALE SCARTO,,,,,,,${totalFormatted}\n`;
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `WorkTime_${dateStr}.csv`;
    
    // Create download link
    if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, filename);
    } else {
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Default Day functions
function getDefaultDayData() {
    const stored = localStorage.getItem(DEFAULT_DAY_KEY);
    return stored ? JSON.parse(stored) : {};
}

function saveDefaultDayData(data) {
    localStorage.setItem(DEFAULT_DAY_KEY, JSON.stringify(data));
}

function loadDefaultDay() {
    const data = getDefaultDayData();
    
    if (data.entry1) {
        document.getElementById('defaultEntry1').value = data.entry1;
    }
    if (data.exit1) {
        document.getElementById('defaultExit1').value = data.exit1;
    }
    if (data.entry2) {
        document.getElementById('defaultEntry2').value = data.entry2;
    }
    if (data.exit2) {
        document.getElementById('defaultExit2').value = data.exit2;
    }
}

function saveDefaultDay() {
    const data = {
        entry1: document.getElementById('defaultEntry1').value,
        exit1: document.getElementById('defaultExit1').value,
        entry2: document.getElementById('defaultEntry2').value,
        exit2: document.getElementById('defaultExit2').value
    };
    
    saveDefaultDayData(data);
}

function attachDefaultDayListeners() {
    // Time inputs
    ['defaultEntry1', 'defaultExit1', 'defaultEntry2', 'defaultExit2'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            saveDefaultDay();
        });
    });
}

function applyDefaultToWeek() {
    const defaultData = getDefaultDayData();
    const weekData = {};
    
    // Apply default to all days (without smartworking and permit)
    WORK_DAYS.forEach((_, index) => {
        weekData[index] = {
            smartworking: false, // Always false when resetting
            entry1: defaultData.entry1 || '',
            exit1: defaultData.exit1 || '',
            entry2: defaultData.entry2 || '',
            exit2: defaultData.exit2 || '',
            permit: 0 // Always 0 when resetting
        };
    });
    
    saveData(weekData);
    loadFromStorage();
    updateAllCalculations();
}

