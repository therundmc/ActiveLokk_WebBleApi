const BATTERY_LEVEL     = 0x05;
const VERSION           = 0x06;
const SETTINGS          = 0x0A;


export function decodeControlReceive(data) {
    const command = data.getUint8(1); // Fixed a missing const declaration
    const payload = new Uint8Array(data.buffer, 4); // Create a new array starting from index 4
    let dataDecode = null;
    switch (command) {
        case BATTERY_LEVEL:
            dataDecode = decodeBatteryLevel(payload);
            break;
        case VERSION:
            dataDecode = decodeVersion(payload);
            break;
        case SETTINGS:
            dataDecode = decodeSettings(payload);
            break;
        default:
            // Handle other cases
    }
    return dataDecode;
}

function decodeBatteryLevel(payload) {
    if (payload.length >= 1) {
        const batteryLevelHex = payload[0]; 
        const batteryLevelDecimal = parseInt(batteryLevelHex, 16);
        
        // Create a battery level object
        const batteryLevelObj = {
            batteryLevel: batteryLevelDecimal
        };

        return batteryLevelObj;
    } else {
        console.error("Payload length is too short to decode battery level.");
        return null;
    }
}

function decodeVersion(payload) {
    if (payload.length >= 9) {
        const fwVersion = [
            payload[0], // Major version
            payload[1], // Minor version
            payload[2], // Patch version
            payload[3]  // Build version
        ];
        const mfcYear = payload[4]; // Manufacturing year
        const mfcWeek = payload[5]; // Manufacturing week
        const serialNumber = [
            payload[6], // Serial number byte 1
            payload[7], // Serial number byte 2
            payload[8]  // Serial number byte 3
        ];

        // Create a version object
        const versionObj = {
            firmwareVersion: fwVersion.join('.'),
            manufacturingYear: mfcYear,
            manufacturingWeek: mfcWeek,
            serialNumber: serialNumber.join('')
        };

        return versionObj;
    } else {
        console.error("Payload length is too short to decode version information.");
        return null;
    }
}

function decodeSettings(payload) {
    if (payload.length >= 5) {
        const xShift = payload[0]; // Global X shift
        const yShift = payload[1]; // Global Y shift
        const luma = payload[2];   // Display luminance (0 to 15)
        const alsEnable = !!payload[3]; // Auto-brightness adjustment status (convert to boolean)
        const gestureEnable = !!payload[4]; // Gesture detection status (convert to boolean)

        // Create a settings object
        const settingsObj = {
            xShift,
            yShift,
            luminance: luma,
            autoBrightnessAdjustment: alsEnable,
            gestureDetection: gestureEnable
        };

        return settingsObj;
    } else {
        console.error("Payload length is too short to decode settings information.");
        return null;
    }
}
