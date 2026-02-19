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

// Helper function to get time value from hour/minute inputs
function getTimeValue(hourClass, minuteClass, index) {
    const hourInput = document.querySelector(`.${hourClass}[data-index="${index}"]`);
    const minuteInput = document.querySelector(`.${minuteClass}[data-index="${index}"]`);
    
    if (!hourInput || !minuteInput) return '';
    
    const hour = hourInput.value;
    const minute = minuteInput.value;
    
    if (!hour || !minute) return '';
    
    // Pad with zeros
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Helper function to set time value to hour/minute inputs
function setTimeValue(hourClass, minuteClass, index, timeValue) {
    const hourInput = document.querySelector(`.${hourClass}[data-index="${index}"]`);
    const minuteInput = document.querySelector(`.${minuteClass}[data-index="${index}"]`);
    
    if (!hourInput || !minuteInput) return;
    
    if (!timeValue) {
        hourInput.value = '';
        minuteInput.value = '';
        return;
    }
    
    const [hour, minute] = timeValue.split(':');
    hourInput.value = hour;
    minuteInput.value = minute;
}

// Helper function to validate and format number input (2 digits)
function formatNumberInput(input, max) {
    if (input.value === '') return;
    
    let value = parseInt(input.value);
    if (isNaN(value)) {
        input.value = '';
        return;
    }
    
    // Clamp value within range
    if (value < 0) value = 0;
    if (value > max) value = max;
    
    input.value = String(value).padStart(2, '0');
}


// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeTable();
    loadFromStorage();
    attachEventListeners();
    attachImportListeners();
    updateAllCalculations();
    autoFillFromJobTimePage();
    if (document.getElementById('saveDefaultButton')) {
        loadDefaultDay();
        attachDefaultDayListeners();
    }
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
        <td class="day-cell">
            ${day}
            <button class="btn-clearday" data-index="${index}" title="Cancella giornata">🗑️</button>
        </td>
        <td><input type="checkbox" class="smartworking-check" data-index="${index}"></td>
        <td>
            <div class="time-input-wrapper">
                <input type="number" class="hour-input entry1-hour" data-index="${index}" min="0" max="24" placeholder="00">
                <span class="time-separator">:</span>
                <input type="number" class="minute-input entry1-minute" data-index="${index}" min="0" max="59" placeholder="00">
            </div>
        </td>
        <td>
            <div class="time-input-wrapper">
                <input type="number" class="hour-input exit1-hour" data-index="${index}" min="0" max="24" placeholder="00">
                <span class="time-separator">:</span>
                <input type="number" class="minute-input exit1-minute" data-index="${index}" min="0" max="59" placeholder="00">
            </div>
        </td>
        <td>
            <div class="time-input-wrapper">
                <input type="number" class="hour-input entry2-hour" data-index="${index}" min="0" max="24" placeholder="00">
                <span class="time-separator">:</span>
                <input type="number" class="minute-input entry2-minute" data-index="${index}" min="0" max="59" placeholder="00">
            </div>
        </td>
        <td class="exit2-cell">
            <div class="time-input-wrapper">
                <input type="number" class="hour-input exit2-hour" data-index="${index}" min="0" max="24" placeholder="00">
                <span class="time-separator exit2-separator" data-index="${index}">:</span>
                <input type="number" class="minute-input exit2-minute" data-index="${index}" min="0" max="59" placeholder="00">
            </div>
            <span class="exit2-tooltip" data-index="${index}"></span>
        </td>
        <td class="permit-cell">
            <button class="btn btn-secondary remove-permit" data-index="${index}">-</button>
            <button class="btn btn-primary add-permit" data-index="${index}">+</button>
            <span class="permit-value" data-index="${index}">00:00</span>
        </td>
        <td class="diff-cell diff-neutral" data-index="${index}">00:00</td>
        <td class="rubato-cell" data-index="${index}">00:00</td>
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
    
    // Time inputs - hour and minute inputs in the main work table
    const workTableInputs = document.querySelectorAll('#workTableBody input[type="number"]');
    workTableInputs.forEach(input => {
        // Format on blur
        input.addEventListener('blur', () => {
            const max = input.classList.contains('hour-input') ? 24 : 59;
            formatNumberInput(input, max);
        });
        
        input.addEventListener('change', () => {
            saveToStorage();
            updateAllCalculations();
        });
        
        // For time inputs, also listen to input event for real-time placeholder update
        input.addEventListener('input', () => {
            // Auto-advance: move focus to next enabled input after 2 digits are entered
            if (input.value.toString().length >= 2) {
                const allInputs = Array.from(document.querySelectorAll('#workTableBody input[type="number"]:not(:disabled)'));
                const currentIdx = allInputs.indexOf(input);
                if (currentIdx >= 0 && currentIdx < allInputs.length - 1) {
                    allInputs[currentIdx + 1].focus();
                    allInputs[currentIdx + 1].select();
                }
            }

            saveToStorage();
            const index = parseInt(input.dataset.index);
            if (!isNaN(index)) {
                updateExit2Placeholder(index);
                validateLunchBreak(index);
                validateTimeOrder(index);
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
    
    // Clear day buttons
    document.querySelectorAll('.btn-clearday').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            clearDay(index);
        });
    });
}

// Handle SmartWorking checkbox change
function handleSmartWorkingChange(index, isChecked) {
    const entry1Hour = document.querySelector(`.entry1-hour[data-index="${index}"]`);
    const entry1Minute = document.querySelector(`.entry1-minute[data-index="${index}"]`);
    const exit1Hour = document.querySelector(`.exit1-hour[data-index="${index}"]`);
    const exit1Minute = document.querySelector(`.exit1-minute[data-index="${index}"]`);
    const entry2Hour = document.querySelector(`.entry2-hour[data-index="${index}"]`);
    const entry2Minute = document.querySelector(`.entry2-minute[data-index="${index}"]`);
    const exit2Hour = document.querySelector(`.exit2-hour[data-index="${index}"]`);
    const exit2Minute = document.querySelector(`.exit2-minute[data-index="${index}"]`);
    
    if (isChecked) {
        // Clear all time fields
        [entry1Hour, entry1Minute, exit1Hour, exit1Minute, entry2Hour, entry2Minute, exit2Hour, exit2Minute].forEach(input => {
            if (input) input.value = '';
        });
        
        // Disable all time fields
        [entry1Hour, entry1Minute, exit1Hour, exit1Minute, entry2Hour, entry2Minute, exit2Hour, exit2Minute].forEach(input => {
            if (input) input.disabled = true;
        });
    } else {
        // Re-enable all time fields
        [entry1Hour, entry1Minute, exit1Hour, exit1Minute, entry2Hour, entry2Minute, exit2Hour, exit2Minute].forEach(input => {
            if (input) input.disabled = false;
        });
    }
}

// Validate lunch break timing (12:00 - 14:30)
function validateLunchBreak(index) {
    const exit1 = getTimeValue('exit1-hour', 'exit1-minute', index);
    const entry2 = getTimeValue('entry2-hour', 'entry2-minute', index);
    
    if (!exit1 || !entry2) {
        // Clear any previous warnings
        clearLunchBreakWarning(index);
        return;
    }
    
    const [exit1Hour, exit1Min] = exit1.split(':').map(Number);
    const [entry2Hour, entry2Min] = entry2.split(':').map(Number);
    
    const exit1Minutes = exit1Hour * 60 + exit1Min;
    const entry2Minutes = entry2Hour * 60 + entry2Min;
    
    const minLunchStart = 12 * 60; // 12:00
    const maxLunchEnd = 14 * 60 + 30; // 14:30
    
    let warning = '';
    
    if (exit1Minutes < minLunchStart) {
        warning = '⚠️ Uscita 1 prima delle 12:00';
    } else if (entry2Minutes > maxLunchEnd) {
        warning = '⚠️ Entrata 2 dopo le 14:30';
    }
    
    if (warning) {
        showLunchBreakWarning(index, warning);
    } else {
        clearLunchBreakWarning(index);
    }
}

// Show lunch break warning
function showLunchBreakWarning(index, message) {
    // Find or create warning element
    let warningEl = document.querySelector(`.lunch-warning[data-index="${index}"]`);
    
    if (!warningEl) {
        const row = document.querySelector(`tr[data-index="${index}"]`);
        if (!row) return;
        
        warningEl = document.createElement('div');
        warningEl.className = 'lunch-warning';
        warningEl.dataset.index = index;
        
        // Insert after the row
        const parentTable = row.parentElement;
        const nextRow = row.nextElementSibling;
        
        const warningRow = document.createElement('tr');
        warningRow.className = 'lunch-warning-row';
        warningRow.dataset.index = index;
        
        const warningCell = document.createElement('td');
        warningCell.colSpan = 9;
        warningCell.appendChild(warningEl);
        warningRow.appendChild(warningCell);
        
        if (nextRow) {
            parentTable.insertBefore(warningRow, nextRow);
        } else {
            parentTable.appendChild(warningRow);
        }
    }
    
    warningEl.textContent = message;
    warningEl.style.display = 'block';
}

// Clear lunch break warning
function clearLunchBreakWarning(index) {
    const warningRow = document.querySelector(`.lunch-warning-row[data-index="${index}"]`);
    if (warningRow) {
        warningRow.remove();
    }
}

// Validate time order (each time must be >= previous: exit1 >= entry1, entry2 >= exit1, exit2 >= entry2)
function validateTimeOrder(index) {
    const entry1 = getTimeValue('entry1-hour', 'entry1-minute', index);
    const exit1 = getTimeValue('exit1-hour', 'exit1-minute', index);
    const entry2 = getTimeValue('entry2-hour', 'entry2-minute', index);
    const exit2 = getTimeValue('exit2-hour', 'exit2-minute', index);

    const markInvalid = (field, invalid) => {
        const hourEl = document.querySelector(`.${field}-hour[data-index="${index}"]`);
        const minuteEl = document.querySelector(`.${field}-minute[data-index="${index}"]`);
        if (hourEl) hourEl.classList.toggle('invalid-time', invalid);
        if (minuteEl) minuteEl.classList.toggle('invalid-time', invalid);
    };

    markInvalid('exit1', !!(entry1 && exit1 && exit1 < entry1));
    markInvalid('entry2', !!(exit1 && entry2 && entry2 < exit1));
    markInvalid('exit2', !!(entry2 && exit2 && exit2 < entry2));
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
    const exit1 = dayData.exit1;
    const entry2 = dayData.entry2;
    const exit2 = dayData.exit2;
    const permit = dayData.permit || 0;
    const addPermitButton = document.querySelector(`.add-permit[data-index="${index}"]`);
    
    // Only check if no permit has been added
    if (permit === 0) {
        let shouldBlink = false;
        
        // Check if entry1 is after 09:00
        if (entry1) {
            const [hour, min] = entry1.split(':').map(Number);
            const entryMinutes = hour * 60 + min;
            const nineAMMinutes = 9 * 60; // 09:00 in minutes
            
            if (entryMinutes > nineAMMinutes) {
                shouldBlink = true;
            }
        }
        
        // Check if exit1 is before 12:00 and no entry2 or no exit2
        if (exit1 && (!entry2 || !exit2)) {
            const [hour, min] = exit1.split(':').map(Number);
            const exit1Minutes = hour * 60 + min;
            const noonMinutes = 12 * 60; // 12:00 in minutes
            
            if (exit1Minutes < noonMinutes) {
                shouldBlink = true;
            }
        }
        
        // Check if entry2 is after 14:30
        if (entry2) {
            const [hour, min] = entry2.split(':').map(Number);
            const entry2Minutes = hour * 60 + min;
            const maxLunchEndMinutes = 14 * 60 + 30; // 14:30 in minutes
            
            if (entry2Minutes > maxLunchEndMinutes) {
                shouldBlink = true;
            }
        }
        
        // Check if exit2 is before 16:30
        if (exit2) {
            const [hour, min] = exit2.split(':').map(Number);
            const exit2Minutes = hour * 60 + min;
            const minExit2Minutes = 16 * 60 + 30; // 16:30 in minutes
            
            if (exit2Minutes < minExit2Minutes) {
                shouldBlink = true;
            }
        }
        
        if (shouldBlink) {
            addPermitButton.classList.add('blink');
        } else {
            addPermitButton.classList.remove('blink');
        }
    } else {
        // Permit has been added, remove blinking
        addPermitButton.classList.remove('blink');
    }
}

// Calculate raw day diff (before threshold rounding)
function calculateRawDayDiff(index) {
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

    // If entry2 is set but exit2 is not, don't calculate (return 0)
    if (entry2 && !exit2) {
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

    // Return difference from standard 8 hours (before threshold)
    return totalMinutes - STANDARD_HOURS;
}

// Calculate minutes worked for a day (with threshold applied)
function calculateDayMinutes(index) {
    return applyThreshold(calculateRawDayDiff(index));
}

// Calculate rubato minutes for a day (rounding loss per individual time entry)
function calculateRubatoMinutes(index) {
    const data = getStoredData();
    const dayData = data[index] || {};

    // If smartworking is enabled, no rubato
    if (dayData.smartworking) {
        return 0;
    }

    const entry1 = dayData.entry1;
    const exit1 = dayData.exit1;
    const entry2 = dayData.entry2;
    const exit2 = dayData.exit2;

    // If no time data, return 0
    if (!entry1 && !exit1 && !entry2 && !exit2) {
        return 0;
    }

    // For entry times: system rounds UP to next 5-min mark (stolen = minutes until next multiple of 5)
    function entryStolen(time) {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return (THRESHOLD - ((h * 60 + m) % THRESHOLD)) % THRESHOLD;
    }

    // For exit times: system rounds DOWN to previous 5-min mark (stolen = remainder after dividing by 5)
    function exitStolen(time) {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return (h * 60 + m) % THRESHOLD;
    }

    let totalRubato = 0;

    // Count entry1/exit1 rubato only if both are present
    if (entry1 && exit1) {
        totalRubato += entryStolen(entry1);
        totalRubato += exitStolen(exit1);
    }

    // Count entry2/exit2 rubato only if both are present
    if (entry2 && exit2) {
        totalRubato += entryStolen(entry2);
        totalRubato += exitStolen(exit2);
    }

    return totalRubato;
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
    const exit2HourInput = document.querySelector(`.exit2-hour[data-index="${index}"]`);
    const exit2MinuteInput = document.querySelector(`.exit2-minute[data-index="${index}"]`);
    const exit2Tooltip = document.querySelector(`.exit2-tooltip[data-index="${index}"]`);
    
    // Guard against missing elements during initialization or when elements are being updated
    if (!exit2HourInput || !exit2MinuteInput || !exit2Tooltip) return;
    
    // Only suggest if entry1, exit1, entry2 are filled but exit2 is not (and user hasn't started typing exit2)
    const exit2BeingEdited = exit2HourInput.value || exit2MinuteInput.value;
    if (dayData.entry1 && dayData.exit1 && dayData.entry2 && !dayData.exit2 && !exit2BeingEdited) {
        const suggestedTime = calculateSuggestedExit2(index);
        if (suggestedTime) {
            const [sugHour, sugMinute] = suggestedTime.split(':');
            exit2HourInput.placeholder = sugHour;
            exit2MinuteInput.placeholder = sugMinute;
            exit2Tooltip.textContent = `💡 ${suggestedTime}`;
            exit2Tooltip.classList.add('visible');
        } else {
            exit2HourInput.placeholder = '00';
            exit2MinuteInput.placeholder = '00';
            exit2Tooltip.textContent = '';
            exit2Tooltip.classList.remove('visible');
        }
    } else {
        exit2HourInput.placeholder = '00';
        exit2MinuteInput.placeholder = '00';
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
        validateTimeOrder(index);
        updateRubatoDisplay(index, calculateRubatoMinutes(index));
        updateExit2SeparatorBlink(index);
    });
    
    updateTotalDisplay();
    updateTotalRubatoDisplay();
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

// Update rubato display for a day
function updateRubatoDisplay(index, rubato) {
    const cell = document.querySelector(`.rubato-cell[data-index="${index}"]`);
    if (!cell) return;
    cell.textContent = formatMinutesToHHMM(rubato);
}

// Calculate total rubato minutes
function calculateTotalRubato() {
    let total = 0;
    WORK_DAYS.forEach((_, index) => {
        total += calculateRubatoMinutes(index);
    });
    return total;
}

// Update total rubato display
function updateTotalRubatoDisplay() {
    const el = document.getElementById('totalRubato');
    if (!el) return;
    el.textContent = formatMinutesToHHMM(calculateTotalRubato());
}

// Blink exit2 separator red when entry2 is set but exit2 is not
function updateExit2SeparatorBlink(index) {
    const data = getStoredData();
    const dayData = data[index] || {};
    const separator = document.querySelector(`.exit2-separator[data-index="${index}"]`);
    if (!separator) return;
    const shouldBlink = !!(dayData.entry2 && !dayData.exit2);
    separator.classList.toggle('exit2-separator-blink', shouldBlink);
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
            entry1: getTimeValue('entry1-hour', 'entry1-minute', index),
            exit1: getTimeValue('exit1-hour', 'exit1-minute', index),
            entry2: getTimeValue('entry2-hour', 'entry2-minute', index),
            exit2: getTimeValue('exit2-hour', 'exit2-minute', index),
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
            setTimeValue('entry1-hour', 'entry1-minute', index, dayData.entry1);
        }
        if (dayData.exit1) {
            setTimeValue('exit1-hour', 'exit1-minute', index, dayData.exit1);
        }
        if (dayData.entry2) {
            setTimeValue('entry2-hour', 'entry2-minute', index, dayData.entry2);
        }
        if (dayData.exit2) {
            setTimeValue('exit2-hour', 'exit2-minute', index, dayData.exit2);
        }
        
        updatePermitDisplay(index);
    });
}

function clearStorage() {
    if (confirm('Sei sicuro di voler cancellare tutti i dati della settimana? La giornata default verrà preservata.')) {
        // Clear week data only, not default day
        localStorage.removeItem(STORAGE_KEY);
        
        // Clear all time inputs in work table and re-enable editing
        const workTableInputs = document.querySelectorAll('#workTableBody input[type="number"]');
        workTableInputs.forEach(input => {
            input.value = '';
            input.disabled = false; // Re-enable all time inputs
        });
        
        // Uncheck all smartworking checkboxes in work table
        const workTableCheckboxes = document.querySelectorAll('#workTableBody input[type="checkbox"]');
        workTableCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Clear any lunch break warnings
        WORK_DAYS.forEach((_, index) => {
            clearLunchBreakWarning(index);
        });
        
        // DO NOT apply default day to week - let user use autofill buttons instead
        
        updateAllCalculations();
    }
}

// Export to CSV
function exportToCSV() {
    const data = getStoredData();
    
    // Prepare CSV content
    let csvContent = '';
    
    // Add header row
    csvContent += 'Giorno,SmartWorking,Entrata 1,Uscita 1,Entrata 2,Uscita 2,Permesso,Scarto (HH:MM),Rubati\n';
    
    // Add data rows
    WORK_DAYS.forEach((day, index) => {
        const dayData = data[index] || {};
        const diff = calculateDayMinutes(index);
        const rubato = calculateRubatoMinutes(index);
        
        // Format difference and permit as HH:MM using helper
        const diffFormatted = formatMinutesToHHMM(diff);
        const permitFormatted = formatMinutesToHHMM(dayData.permit || 0);
        const rubatoFormatted = formatMinutesToHHMM(rubato);
        
        csvContent += `${day},`;
        csvContent += `${dayData.smartworking ? 'Sì' : 'No'},`;
        csvContent += `${dayData.entry1 || ''},`;
        csvContent += `${dayData.exit1 || ''},`;
        csvContent += `${dayData.entry2 || ''},`;
        csvContent += `${dayData.exit2 || ''},`;
        csvContent += `${permitFormatted},`;
        csvContent += `${diffFormatted},`;
        csvContent += `${rubatoFormatted}\n`;
    });
    
    // Add empty row
    csvContent += '\n';
    
    // Add total row
    const total = calculateTotalMinutes();
    const totalFormatted = formatMinutesToHHMM(total);
    const totalRubato = calculateTotalRubato();
    const totalRubatoFormatted = formatMinutesToHHMM(totalRubato);
    
    csvContent += `TOTALE SCARTO,,,,,,,${totalFormatted},${totalRubatoFormatted}\n`;
    
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
    
    if (data.entry1 && data.entry1.includes(':')) {
        const [hour, minute] = data.entry1.split(':');
        document.getElementById('defaultEntry1Hour').value = hour;
        document.getElementById('defaultEntry1Minute').value = minute;
    }
    if (data.exit1 && data.exit1.includes(':')) {
        const [hour, minute] = data.exit1.split(':');
        document.getElementById('defaultExit1Hour').value = hour;
        document.getElementById('defaultExit1Minute').value = minute;
    }
    if (data.entry2 && data.entry2.includes(':')) {
        const [hour, minute] = data.entry2.split(':');
        document.getElementById('defaultEntry2Hour').value = hour;
        document.getElementById('defaultEntry2Minute').value = minute;
    }
    if (data.exit2 && data.exit2.includes(':')) {
        const [hour, minute] = data.exit2.split(':');
        document.getElementById('defaultExit2Hour').value = hour;
        document.getElementById('defaultExit2Minute').value = minute;
    }
}

function saveDefaultDay() {
    const entry1Hour = document.getElementById('defaultEntry1Hour').value;
    const entry1Minute = document.getElementById('defaultEntry1Minute').value;
    const exit1Hour = document.getElementById('defaultExit1Hour').value;
    const exit1Minute = document.getElementById('defaultExit1Minute').value;
    const entry2Hour = document.getElementById('defaultEntry2Hour').value;
    const entry2Minute = document.getElementById('defaultEntry2Minute').value;
    const exit2Hour = document.getElementById('defaultExit2Hour').value;
    const exit2Minute = document.getElementById('defaultExit2Minute').value;
    
    const data = {
        entry1: (entry1Hour && entry1Minute) ? `${String(entry1Hour).padStart(2, '0')}:${String(entry1Minute).padStart(2, '0')}` : '',
        exit1: (exit1Hour && exit1Minute) ? `${String(exit1Hour).padStart(2, '0')}:${String(exit1Minute).padStart(2, '0')}` : '',
        entry2: (entry2Hour && entry2Minute) ? `${String(entry2Hour).padStart(2, '0')}:${String(entry2Minute).padStart(2, '0')}` : '',
        exit2: (exit2Hour && exit2Minute) ? `${String(exit2Hour).padStart(2, '0')}:${String(exit2Minute).padStart(2, '0')}` : ''
    };
    
    saveDefaultDayData(data);
    
    // Show save confirmation
    const saveButton = document.getElementById('saveDefaultButton');
    const originalText = saveButton.textContent;
    saveButton.textContent = '✅ Salvato!';
    saveButton.classList.add('saved');
    
    setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.classList.remove('saved');
    }, 2000);
}

function attachDefaultDayListeners() {
    // Save button
    document.getElementById('saveDefaultButton').addEventListener('click', saveDefaultDay);
    
    // Format inputs on blur
    ['defaultEntry1Hour', 'defaultExit1Hour', 'defaultEntry2Hour', 'defaultExit2Hour'].forEach(id => {
        document.getElementById(id).addEventListener('blur', (e) => {
            formatNumberInput(e.target, 24);
        });
    });
    
    ['defaultEntry1Minute', 'defaultExit1Minute', 'defaultEntry2Minute', 'defaultExit2Minute'].forEach(id => {
        document.getElementById(id).addEventListener('blur', (e) => {
            formatNumberInput(e.target, 59);
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

function applyDefaultToDay(index) {
    const defaultData = getDefaultDayData();
    const data = getStoredData();
    
    // Preserve existing permit value before replacing data[index]
    const existingPermit = data[index]?.permit || 0;
    
    // Apply default to the specific day
    data[index] = {
        smartworking: false, // Always false when auto-filling
        entry1: defaultData.entry1 || '',
        exit1: defaultData.exit1 || '',
        entry2: defaultData.entry2 || '',
        exit2: defaultData.exit2 || '',
        permit: existingPermit // Preserve existing permit value
    };
    
    saveData(data);
    
    // Update the UI for this specific day
    const updateTimeField = (field) => {
        const hourClass = `${field}-hour`;
        const minuteClass = `${field}-minute`;
        setTimeValue(hourClass, minuteClass, index, data[index][field] || '');
    };
    
    updateTimeField('entry1');
    updateTimeField('exit1');
    updateTimeField('entry2');
    updateTimeField('exit2');
    
    // Uncheck smartworking
    const swCheckbox = document.querySelector(`.smartworking-check[data-index="${index}"]`);
    if (swCheckbox) {
        swCheckbox.checked = false;
        handleSmartWorkingChange(index, false);
    }
    
    updateAllCalculations();
}

function clearDay(index) {
    const data = getStoredData();
    data[index] = {
        smartworking: false,
        entry1: '',
        exit1: '',
        entry2: '',
        exit2: '',
        permit: 0
    };
    saveData(data);
    
    // Clear UI inputs
    ['entry1', 'exit1', 'entry2', 'exit2'].forEach(field => {
        setTimeValue(`${field}-hour`, `${field}-minute`, index, '');
    });
    
    // Uncheck smartworking and re-enable fields
    const swCheckbox = document.querySelector(`.smartworking-check[data-index="${index}"]`);
    if (swCheckbox) {
        swCheckbox.checked = false;
        handleSmartWorkingChange(index, false);
    }
    
    clearLunchBreakWarning(index);
    updateAllCalculations();
}

// Auto-fill all weekday entry/exit fields from the jobtime compilazione page
function autoFillFromJobTimePage() {
    if (!chrome || !chrome.tabs || !chrome.scripting) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return;
        let parsedUrl;
        try {
            parsedUrl = new URL(tabs[0].url || '');
        } catch (_) {
            return;
        }
        if (parsedUrl.hostname !== 'webapps-sgs.sms-group.com' ||
            !parsedUrl.pathname.toLowerCase().includes('/jobtime/compilazione.aspx')) return;

        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const ITALIAN_DAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì'];
                // result[0]=Monday ... result[4]=Friday
                const result = [null, null, null, null, null];

                // Extract ALL E/U stamps from a text block, returning {entries, exits}
                function extractAllStamps(text) {
                    const entries = [], exits = [];
                    const capturedTimestampPositions = new Set();
                    // Match every "E HH:MM[:SS]" or "U HH:MM[:SS]" occurrence
                    const stampPattern = /\b([EU])\s+(\d{1,2}:\d{2})(?::\d{2})?\b/gi;
                    let m;
                    while ((m = stampPattern.exec(text)) !== null) {
                        const type = m[1].toUpperCase();
                        const parts = m[2].split(':');
                        if (parts.length < 2 || !parts[0] || !parts[1]) continue;
                        const time = `${parts[0].padStart(2, '0')}:${parts[1]}`;
                        // Record position of the time portion so we skip it in the fallback pass
                        capturedTimestampPositions.add(m.index + m[0].indexOf(m[2]));
                        if (type === 'E') entries.push(time);
                        else if (type === 'U') exits.push(time);
                    }
                    // Fallback: capture standalone HH:MM[:SS] times not already matched above
                    // and treat them as additional exits (e.g. last exit rendered without U prefix).
                    // Note: this runs only on .boxTimb elements which contain exclusively stamp records.
                    const timePattern = /\b(\d{1,2}:\d{2})(?::\d{2})?\b/g;
                    while ((m = timePattern.exec(text)) !== null) {
                        if (capturedTimestampPositions.has(m.index)) continue;
                        const parts = m[1].split(':');
                        if (parts.length < 2 || !parts[0] || !parts[1]) continue;
                        const hour = parseInt(parts[0], 10);
                        const minute = parseInt(parts[1], 10);
                        if (hour > 23 || minute > 59) continue;
                        const time = `${parts[0].padStart(2, '0')}:${parts[1]}`;
                        exits.push(time);
                    }
                    return { entries, exits };
                }

                const allBoxes = Array.from(document.querySelectorAll('.boxTimb'));
                console.log('[WorkTimeCalculator] Found', allBoxes.length, 'boxTimb elements on', location.href);
                allBoxes.forEach((b, i) => {
                    console.log(`[WorkTimeCalculator] boxTimb[${i}]: "${b.textContent.trim()}"`);
                });

                // --- Primary strategy: day name is embedded in the .boxTimb text ---
                let foundAnyDay = false;
                let lastDayIdx = -1;
                const dayAccum = {}; // dayIdx -> { entries: [], exits: [], noStamps: bool }
                allBoxes.forEach(box => {
                    const text = box.textContent.trim();
                    const lower = text.toLowerCase();
                    let dayIdx = ITALIAN_DAYS.findIndex(d => lower.includes(d));
                    if (dayIdx !== -1) {
                        lastDayIdx = dayIdx;
                        foundAnyDay = true;
                    } else if (lastDayIdx !== -1) {
                        dayIdx = lastDayIdx; // assign orphan box to last known day
                    } else {
                        return; // no day context yet
                    }

                    if (!dayAccum[dayIdx]) dayAccum[dayIdx] = { entries: [], exits: [], noStamps: false };

                    if (lower.includes('nessuna timbratura')) {
                        dayAccum[dayIdx].noStamps = true;
                        console.log(`[WorkTimeCalculator] Day ${dayIdx} (${ITALIAN_DAYS[dayIdx]}): no stamps`);
                        return;
                    }

                    const { entries, exits } = extractAllStamps(text);
                    dayAccum[dayIdx].entries.push(...entries);
                    dayAccum[dayIdx].exits.push(...exits);
                    console.log(`[WorkTimeCalculator] Day ${dayIdx} (${ITALIAN_DAYS[dayIdx]}): entries=${JSON.stringify(entries)}, exits=${JSON.stringify(exits)}`);
                });

                // Finalize accumulated results
                Object.keys(dayAccum).forEach(key => {
                    const idx = parseInt(key);
                    const accum = dayAccum[idx];
                    if (accum.noStamps && accum.entries.length === 0 && accum.exits.length === 0) {
                        result[idx] = { entry1: null, exit1: null, entry2: null, exit2: null };
                    } else {
                        result[idx] = {
                            entry1: accum.entries[0] || null,
                            entry2: accum.entries[1] || null,
                            exit1: accum.exits[0] || null,
                            exit2: accum.exits[1] || null
                        };
                    }
                });

                // --- Fallback: day name lives in an ancestor element; group boxes by nearest day-named ancestor ---
                if (!foundAnyDay) {
                    console.log('[WorkTimeCalculator] Day names not found inside boxTimb, trying ancestor strategy');
                    const dayGroupMap = new Map(); // dayIdx -> box[]
                    allBoxes.forEach(box => {
                        let el = box.parentElement;
                        let depth = 0;
                        while (el && el !== document.body && depth < 10) {
                            const lower = el.textContent.toLowerCase();
                            const dayIdx = ITALIAN_DAYS.findIndex(d => lower.includes(d));
                            if (dayIdx !== -1) {
                                if (!dayGroupMap.has(dayIdx)) dayGroupMap.set(dayIdx, []);
                                dayGroupMap.get(dayIdx).push(box);
                                break;
                            }
                            el = el.parentElement;
                            depth++;
                        }
                    });
                    console.log('[WorkTimeCalculator] Ancestor strategy: found', dayGroupMap.size, 'day groups');
                    dayGroupMap.forEach((boxes, dayIdx) => {
                        const entries = [], exits = [];
                        boxes.forEach(box => {
                            const text = box.textContent.trim();
                            if (text.toLowerCase().includes('nessuna timbratura')) return;
                            const stamps = extractAllStamps(text);
                            entries.push(...stamps.entries);
                            exits.push(...stamps.exits);
                        });
                        result[dayIdx] = {
                            entry1: entries[0] || null,
                            entry2: entries[1] || null,
                            exit1: exits[0] || null,
                            exit2: exits[1] || null
                        };
                        console.log(`[WorkTimeCalculator] Day ${dayIdx} (${ITALIAN_DAYS[dayIdx]}): entries=${JSON.stringify(entries)}, exits=${JSON.stringify(exits)}`);
                    });
                }

                console.log('[WorkTimeCalculator] Final week result:', JSON.stringify(result));
                return result;
            }
        }, (results) => {
            if (chrome.runtime.lastError || !results || !results[0]) {
                console.error('[WorkTimeCalculator] Script execution error:', chrome.runtime.lastError?.message);
                return;
            }
            const weekData = results[0].result;
            if (!weekData) {
                console.warn('[WorkTimeCalculator] No week data returned from page script');
                return;
            }

            console.log('[WorkTimeCalculator] Populating table with week data:', weekData);
            let filledDays = 0;
            weekData.forEach((dayData, index) => {
                if (!dayData) return;
                if (dayData.entry1) setTimeValue('entry1-hour', 'entry1-minute', index, dayData.entry1);
                if (dayData.exit1)  setTimeValue('exit1-hour',  'exit1-minute',  index, dayData.exit1);
                if (dayData.entry2) setTimeValue('entry2-hour', 'entry2-minute', index, dayData.entry2);
                if (dayData.exit2)  setTimeValue('exit2-hour',  'exit2-minute',  index, dayData.exit2);
                filledDays++;
            });
            console.log('[WorkTimeCalculator] Filled', filledDays, 'day(s)');

            saveToStorage();
            updateAllCalculations();
        });
    });
}

// Parse a single line from Job Hour application
// Supports standard format: E HH:MM:SS   U HH:MM:SS   E HH:MM:SS   U HH:MM:SS
// And manual format: HH:MM:SS | HH:MM:SS | HH:MM:SS (M) | HH:MM:SS
function parseJobHourLine(line) {
    // Standard format: E/U prefix with seconds, separated by whitespace
    const standardPattern = /E\s+(\d{1,2}:\d{2}):\d{2}\s+U\s+(\d{1,2}:\d{2}):\d{2}\s+E\s+(\d{1,2}:\d{2}):\d{2}\s+U\s+(\d{1,2}:\d{2}):\d{2}/i;
    const standardMatch = line.match(standardPattern);
    if (standardMatch) {
        return {
            entry1: standardMatch[1],
            exit1: standardMatch[2],
            entry2: standardMatch[3],
            exit2: standardMatch[4]
        };
    }

    // Manual format: HH:MM:SS | HH:MM:SS | HH:MM:SS (M) | HH:MM:SS
    const manualPattern = /(\d{1,2}:\d{2}):\d{2}(?:\s*\([^)]*\))?\s*\|\s*(\d{1,2}:\d{2}):\d{2}(?:\s*\([^)]*\))?\s*\|\s*(\d{1,2}:\d{2}):\d{2}(?:\s*\([^)]*\))?\s*\|\s*(\d{1,2}:\d{2}):\d{2}(?:\s*\([^)]*\))?/;
    const manualMatch = line.match(manualPattern);
    if (manualMatch) {
        return {
            entry1: manualMatch[1],
            exit1: manualMatch[2],
            entry2: manualMatch[3],
            exit2: manualMatch[4]
        };
    }

    return null;
}

// Import work times from pasted Job Hour application content
function importFromJobHour() {
    const textarea = document.getElementById('importTextarea');
    const text = textarea.value.trim();
    if (!text) return;

    const lines = text.split('\n');
    const parsedDays = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const result = parseJobHourLine(trimmed);
        if (result) {
            parsedDays.push(result);
        }
    }

    if (parsedDays.length === 0) {
        alert('Nessun dato valido trovato.\n\nFormati supportati:\n- Standard: E 07:25:06   U 12:22:07   E 13:10:00   U 16:32:48\n- Manuale: 07:25:06 | 12:22:07 | 13:10:00 (M) | 16:32:48');
        return;
    }

    const data = getStoredData();
    const count = Math.min(parsedDays.length, WORK_DAYS.length);

    parsedDays.slice(0, count).forEach((dayData, index) => {
        data[index] = {
            smartworking: false,
            entry1: dayData.entry1 || '',
            exit1: dayData.exit1 || '',
            entry2: dayData.entry2 || '',
            exit2: dayData.exit2 || '',
            permit: data[index]?.permit || 0
        };
    });

    saveData(data);
    loadFromStorage();
    updateAllCalculations();

    textarea.value = '';

    const importButton = document.getElementById('importButton');
    const originalText = importButton.textContent;
    importButton.textContent = `✅ Importati ${count} giorni!`;
    setTimeout(() => {
        importButton.textContent = originalText;
    }, 2000);
}

function attachImportListeners() {
    const importButton = document.getElementById('importButton');
    if (!importButton) return;
    importButton.addEventListener('click', importFromJobHour);
}


