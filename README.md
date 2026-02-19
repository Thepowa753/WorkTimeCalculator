# WorkTimeCalculator

A Chrome extension that helps you track and calculate your weekly work hours with a 5-minute threshold system.

---

## Features

- **Weekly time tracking** – Enter up to two entry/exit pairs per day (Monday–Friday), covering split shifts with a lunch break.
- **5-minute threshold** – Times are automatically rounded to the nearest 5-minute mark (entries rounded up, exits rounded down), matching common HR/timekeeping systems.
- **Scarto (difference)** – Each day shows the difference between hours actually worked and the standard 8-hour day, displayed in HH:MM format.
- **Rubati (stolen minutes)** – Shows how many minutes you "lose" to rounding per day and in total for the week.
- **SmartWorking mode** – Check the SmartWorking checkbox for a day to mark it as remote work (time fields are cleared and disabled; the full 8 hours are counted automatically).
- **Permit tracking** – Add or remove permit/leave time in 30-minute steps per day.
- **Default day configuration** – Save a default schedule (entry/exit times) that is applied when you clear the week.
- **Auto-fill from timekeeping page** – When the active browser tab is the SMS Group JobTime page (`webapps-sgs.sms-group.com/jobtime/compilazione.aspx`), the extension automatically reads and fills in your stamped entry/exit times.
- **CSV export** – Export the weekly data as a CSV file.
- **Persistent storage** – All data is saved in `localStorage` and survives popup close/reopen.

---

## Installation

This extension is not published on the Chrome Web Store. Install it in **developer mode** by following these steps:

1. **Download or clone the repository**

   ```bash
   git clone https://github.com/Thepowa753/WorkTimeCalculator.git
   ```

   Or download the ZIP from GitHub and extract it to a local folder.

2. **Open Chrome Extensions**

   Navigate to `chrome://extensions` in your Chrome browser.

3. **Enable Developer Mode**

   Toggle on **Developer mode** in the top-right corner of the Extensions page.

4. **Load the unpacked extension**

   Click **Load unpacked** and select the root folder of the repository (the folder that contains `manifest.json`).

5. **Pin the extension** *(optional)*

   Click the puzzle-piece icon in the Chrome toolbar and pin **Work Time Calculator** for easy access.

---

## Usage

1. Click the **Work Time Calculator** icon in the Chrome toolbar to open the popup.
2. For each working day, enter your entry and exit times (HH and MM in separate fields).
3. Use the **+** / **−** buttons in the *Permesso* column to add or remove permit time (30-minute steps).
4. Check **Smart** for any day worked remotely – time inputs will be disabled and the full 8 hours counted.
5. The **Scarto** column updates in real time showing how much over or under 8 hours you worked.
6. The **Rubati** column shows minutes lost to the 5-minute rounding system.
7. Use **Esporta CSV** to download the week's data as a CSV file.
8. Use **Pulisci Storage** to clear all data and reset the table to the default day configuration.

---

## Requirements

- Google Chrome (or any Chromium-based browser that supports Manifest V3 extensions)
- No external dependencies – everything runs locally in the browser.
