import * as ble from './ble.js';

const BLUETOOTH_SERVICES = {
  DIS_SERVICE: {
    uuid: 0x180A,
    characteristics: {
      MANUFACTURER_NAME: {
        uuid: '00002a29-0000-1000-8000-00805f9b34fb',
        properties: ['read'],
        type: 'string',
        name: 'MANUFACTURER_NAME',
        value: null,
      },
      MODEL_NUMBER: {
        uuid: '00002a24-0000-1000-8000-00805f9b34fb',
        properties: ['read'],
        type: 'string',
        name: 'MODEL_NUMBER',
        value: null,
      },
      // SERIAL_NUMBER_STRING: {
      //   uuid: '00002a25-0000-1000-8000-00805f9b34db',
      //   properties: ['read'],
      //   value: null,
      // },
      HARDWARE_VERSION: {
        uuid: '00002a27-0000-1000-8000-00805f9b34fb',
        properties: ['read'],
        type: 'string',
        name: 'HARDWARE_VERSION',
        value: null,
      },
      FIRMWARE_VERSION: {
        uuid: '00002a26-0000-1000-8000-00805f9b34db',
        properties: ['read'],
        type: 'string',
        name: 'FIRMWARE_VERSION',
        value: null,
      },
      SOFTWARE_VERSION: {
        uuid: '00002a28-0000-1000-8000-00805f9b34fb',
        properties: ['read'],
        type: 'string',
        name: 'SOFTWARE_VERSION',
        value: null,
      },
    },
  },
  DEVICE_CUSTOM_SERVICE: {
    uuid: '0783b03e-8535-b5a0-7140-a304d2495cb7',
    characteristics: {
      TX_ACTIVELOOK: {
        uuid: '0783b03e-8535-b5a0-7140-a304d2495cb8',
        properties: ['notify'],
        type: 'uint8',
        name: 'DEVICE_CUSTOM_SERVICE',
        descriptors: ['UUID 0x2902 configuration'],
        value: null,
      },
      RX_ACTIVELOOK: {
        uuid: '0783b03e-8535-b5a0-7140-a304d2495cba',
        properties: ['write', 'writeWithoutResponse'],
        type: 'uint8',
        name: 'RX_ACTIVELOOK',
        descriptors: ['UUID 0x2902 configuration'],
        value: null,
      },
      CONTROL: {
        uuid: '0783b03e-8535-b5a0-7140-a304d2495cb9',
        properties: ['notify'],
        type: 'uint8',
        name: 'CONTROL',
        descriptors: ['UUID 0x2902 configuration'],
        value: null,
      },
      GESTURE_EVENT: {
        uuid: '0783b03e-8535-b5a0-7140-a304d2495cbb',
        properties: ['notify'],
        type: 'uint8',
        name: 'GESTURE_EVENT',
        descriptors: ['UUID 0x2902 configuration'],
        value: null,
      },
      TOUCH_EVENT: {
        uuid: '0783b03e-8535-b5a0-7140-a304d2495cbc',
        properties: ['notify'],
        type: 'uint8',
        name: 'TOUCH_EVENT',
        descriptors: ['UUID 0x2902 configuration'],
        value: null,
      },
    },
  },
  BATTERY_SERVICE: {
    uuid: 0x180F, 
    characteristics: {
      BATTERY_LEVEL: {
        uuid: '00002a19-0000-1000-8000-00805f9b34fb',
        properties: ['read', 'notify'],
        type: 'uint8',
        name: 'BATTERY_LEVEL',
        descriptors: ['UUID 0x2902 configuration'],
        value: 'battery level (in %)',
      },
    },
  },
};
const NAME = 'ENGO';

let device = null;
let server = null;

let batteryService = null;
let DISService = null;
let customService = null;
let RxCharacteristic = null;


export async function connectToDevice() {
    try {
      const optionalServices = [
          Number(BLUETOOTH_SERVICES.BATTERY_SERVICE.uuid),
          BLUETOOTH_SERVICES.DEVICE_CUSTOM_SERVICE.uuid,
          Number(BLUETOOTH_SERVICES.DIS_SERVICE.uuid)
          ];
      const serviceUUID = BLUETOOTH_SERVICES.DEVICE_CUSTOM_SERVICE.uuid;
      device = await ble.requestDevice(NAME, serviceUUID, optionalServices);
      server = await ble.connectDevice(device);

      batteryService = await server.getPrimaryService(BLUETOOTH_SERVICES.BATTERY_SERVICE.uuid);
      DISService = await server.getPrimaryService(BLUETOOTH_SERVICES.DIS_SERVICE.uuid);
      customService = await server.getPrimaryService(BLUETOOTH_SERVICES.DEVICE_CUSTOM_SERVICE.uuid);

      RxCharacteristic = await customService.getCharacteristic(BLUETOOTH_SERVICES.DEVICE_CUSTOM_SERVICE.characteristics.RX_ACTIVELOOK.uuid);
      console.log('Connected successfully!');
      return device;
    } catch (error) {
      console.error('Error connecting:', error);
      throw error;
    }
  }

  export async function subscribeToBAS(eventHandler) {
    try {
      await ble.subscribeToCharacteristic(batteryService, BLUETOOTH_SERVICES.BATTERY_SERVICE.characteristics.BATTERY_LEVEL, eventHandler);
    } catch (error) {
      console.error('Error sub to BAS:', error);
      throw error;
    }
  }

  export async function readBAS() {
    try {
      const value = await ble.readCharacteristic(batteryService, BLUETOOTH_SERVICES.BATTERY_SERVICE.characteristics.BATTERY_LEVEL);
      return value;
    } catch (error) {
      console.error('Error read BAS:', error);
      throw error;
    }
  }

  export async function readDIS(characteristicName) {
    try {
      const serviceName = 'DIS_SERVICE';
      const property = 'read';
      const characteristicStruct = getCharacteristicStruct(serviceName, characteristicName, property);
      if (characteristicStruct) {
        const value = await ble.readCharacteristic(DISService, characteristicStruct);
        return value;
      }
      else {
        console.log('No characteristic found');
        return;
      }
    } catch (error) {
      console.error('Error sub to DIS:', error, characteristicName);
      throw error;
    }
  }

  export async function subscribeToCustom(eventHandler, characteristicName) {
    try {
      const serviceName = 'DEVICE_CUSTOM_SERVICE';
      const property = 'notify';
      const characteristicStruct = getCharacteristicStruct(serviceName, characteristicName, property);
      if (characteristicStruct) {
        await ble.subscribeToCharacteristic(customService, characteristicStruct, eventHandler);
      }
      else {
        console.log('No characteristic found');
        return;
      }
    } catch (error) {
      console.error('Error sub to CUSTOM:', error, characteristicName);
      throw error;
    }
  }

// GENERAL COMMANDS //
// Command ID: 0x00 - Enable / Disable Display Power
export async function enableDisplayPower(enable) {
  const commandID = 0x00;
  const data = [enable ? 1 : 0];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x01 - Clear Display
export async function clearDisplay() {
  const commandID = 0x01;
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, []);
}

// Command ID: 0x02 - Set Grey Level
export async function setGreyLevel(level) {
  const commandID = 0x02;
  const data = new Uint8Array([level]); // Assuming 'level' is a valid grey level (0 to 15)
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x03 - Display Demo
export async function displayDemo(demoID) {
  const commandID = 0x03;
  const data = new Uint8Array([demoID]); // 0: Fill screen, 1: Rectangle with a cross, 2: Display saved images, etc.
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x05 - Get Battery Level
export async function getBatteryLevel() {
  const commandID = 0x05;
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, []);
}

// Command ID: 0x06 - Get Device ID and Firmware Version
export async function getDeviceVersion() {
  const commandID = 0x06;
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, []);
}

// Command ID: 0x08 - Set LED
export async function setLED(state) {
  const commandID = 0x08;
  const data = new Uint8Array([state]); // 0: Off, 1: On, 2: Toggle, 3: Blinking
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x09 - Shift Display
export async function shiftDisplay(x, y) {
  const commandID = 0x09;
  const data = new Uint8Array([
    (x >> 8) & 0xFF,  // High byte of x
    x & 0xFF,         // Low byte of x
    (y >> 8) & 0xFF,  // High byte of y
    y & 0xFF          // Low byte of y
  ]);

  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x0A - Get User Parameters
export async function getUserParameters() {
  const commandID = 0x0A;
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, []);
}

//  Display luminance commands //
// Command ID: 0x10 - Set Display Luminance
export async function setDisplayLuminance(level) {
  const commandID = 0x10;
  const data = new Uint8Array([level]);
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Optical sensor commands //
// Command ID: 0x20 - Turn On/Off Sensor
export async function toggleSensor(enable) {
  const commandID = 0x20;
  const data = [enable ? 1 : 0];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x21 - Turn On/Off Gesture Detection
export async function toggleGestureDetection(enable) {
  const commandID = 0x21;
  const data = [enable ? 1 : 0];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x22 - Turn On/Off Auto-Brightness Adjustment
export async function toggleAutoBrightness(enable) {
  const commandID = 0x22;
  const data = [enable ? 1 : 0];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Graphics commands //
// Command ID: 0x30 - Set Graphics Color
export async function setGraphicsColor(color) {
  const commandID = 0x30;
  const data = new Uint8Array([color]);
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x31 - Draw a Pixel
export async function drawPixel(x, y) {
  const commandID = 0x31;
  const data = new Uint8Array([x >> 8, x & 0xFF, y >> 8, y & 0xFF]); // Combine x and y as 16-bit signed values
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x32 - Draw a Line
export async function drawLine(x0, y0, x1, y1) {
  const commandID = 0x32;
  const data = new Uint8Array([
    (x0 >> 8) & 0xFF, x0 & 0xFF,
    (y0 >> 8) & 0xFF, y0 & 0xFF,
    (x1 >> 8) & 0xFF, x1 & 0xFF,
    (y1 >> 8) & 0xFF, y1 & 0xFF
  ]); // Combine coordinates as 16-bit signed values
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x33 - Draw an empty rectangle
export async function drawEmptyRectangle(x0, y0, x1, y1) {
  const commandID = 0x33;
  const data = new Uint8Array([
    (x0 >> 8) & 0xFF, x0 & 0xFF,
    (y0 >> 8) & 0xFF, y0 & 0xFF,
    (x1 >> 8) & 0xFF, x1 & 0xFF,
    (y1 >> 8) & 0xFF, y1 & 0xFF
  ]); // Combine coordinates as 16-bit signed values
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x34 - Draw a full rectangle
export async function drawFullRectangle(x0, y0, x1, y1) {
  const commandID = 0x34;
  const data = new Uint8Array([
    (x0 >> 8) & 0xFF, x0 & 0xFF,
    (y0 >> 8) & 0xFF, y0 & 0xFF,
    (x1 >> 8) & 0xFF, x1 & 0xFF,
    (y1 >> 8) & 0xFF, y1 & 0xFF
  ]); // Combine coordinates as 16-bit signed values
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x35 - Draw an empty circle
export async function drawEmptyCircle(x, y, r) {
  const commandID = 0x35;
  const data = new Uint8Array([
    (x >> 8) & 0xFF, x & 0xFF,
    (y >> 8) & 0xFF, y & 0xFF,
    r & 0xFF
  ]); // Combine coordinates as 16-bit signed values and radius as an 8-bit value
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x36 - Draw a full circle
export async function drawFullCircle(x, y, r) {
  const commandID = 0x36;
  const data = new Uint8Array([
    (x >> 8) & 0xFF, x & 0xFF,
    (y >> 8) & 0xFF, y & 0xFF,
    r & 0xFF
  ]); // Combine coordinates as 16-bit signed values and radius as an 8-bit value
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x37 - Write text string
export async function writeTextString(x, y, rotation, fontSize, color, text) {
  const commandID = 0x37;
  const textLength = text.length;
  const data = new Uint8Array([
    (x >> 8) & 0xFF, x & 0xFF,
    (y >> 8) & 0xFF, y & 0xFF,
    rotation,
    fontSize,
    color
  ]);

  // Append the text as bytes
  for (let i = 0; i < textLength; i++) {
    data.push(text.charCodeAt(i) & 0xFF);
  }

  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x38 - Draw multiple connected lines
export async function drawPolyline(thickness, coordinates) {
  const commandID = 0x38;
  const numCoordinates = coordinates.length / 2;
  const data = new Uint8Array([
    thickness,
    0, 0, // Reserved bytes
  ]);

  // Append the coordinates
  for (let i = 0; i < numCoordinates; i++) {
    const x = coordinates[i * 2];
    const y = coordinates[i * 2 + 1];
    data.push((x >> 8) & 0xFF, x & 0xFF, (y >> 8) & 0xFF, y & 0xFF);
  }

  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x39 - Hold or flush the graphic engine
export async function holdOrFlushGraphicEngine(action) {
  const commandID = 0x39;
  const data = new Uint8Array([action]);
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}





// Images cmd //
// Command ID: 0x41 - Save Image
export async function saveImage(id, size, width, format) {
  const commandID = 0x41;
  const data = [id, size >> 24, (size >> 16) & 0xFF, (size >> 8) & 0xFF, size & 0xFF, width >> 8, width & 0xFF, format];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x42 - Display Image
export async function displayImage(id, x, y) {
  const commandID = 0x42;
  const data = [id, x >> 8, x & 0xFF, y >> 8, y & 0xFF];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x44 - Stream Image
export async function streamImage(size, width, x, y, format) {
  const commandID = 0x44;
  const data = [size >> 24, (size >> 16) & 0xFF, (size >> 8) & 0xFF, size & 0xFF, width >> 8, width & 0xFF, x >> 8, x & 0xFF, y >> 8, y & 0xFF, format];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x46 - Delete Image
export async function deleteImage(id) {
  const commandID = 0x46;
  const data = [id];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x47 - List Images
export async function listImages() {
  const commandID = 0x47;
  const data = await await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
  console.log(data);
  const images = [];
  let i = 0;
  while (i < data.length) {
    const id = data[i];
    const height = (data[i + 1] << 8) | data[i + 2];
    const width = (data[i + 3] << 8) | data[i + 4];
    images.push({ id, height, width });
    i += 5; // Move to the next image data
  }
  return images;
}


// Fonts commands //
// Command ID: 0x50 - List Fonts
export async function listFonts() {
  const commandID = 0x50;
  const idHeightPairs = await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
  const fonts = [];
  for (let i = 0; i < idHeightPairs.length; i += 2) {
    const id = idHeightPairs[i];
    const height = idHeightPairs[i + 1];
    fonts.push({ id, height });
  }
  return fonts;
}

// Command ID: 0x51 - Save Font
export async function saveFont(id, size, data) {
  const commandID = 0x51;
  const dataToSend = [id, size >> 8, size & 0xFF, ...data];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x52 - Select Font
export async function selectFont(id) {
  const commandID = 0x52;
  const data = [id];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Command ID: 0x53 - Delete Font
export async function deleteFont(id) {
  const commandID = 0x53;
  const data = [id];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], data);
}

// Layout commands //
// Command ID: 0x60 - Save Layout
export async function saveLayout(parameters, commands) {
  const commandID = 0x60;
  // Serialize parameters into an array
  const dataToSend = serializeLayoutParameters(parameters, commands);
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x61 - Delete Layout
export async function deleteLayout(id) {
  const commandID = 0x61;
  const dataToSend = [id];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x62 - Display Layout
export async function displayLayout(id, text) {
  const commandID = 0x62;
  const dataToSend = [id, ...text];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x63 - Clear Layout
export async function clearLayout(id) {
  const commandID = 0x63;
  const dataToSend = [id];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x64 - Layout List
export async function layoutList() {
  const commandID = 0x64;
  const layoutListResponse = await await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);

  return layoutListResponse;
}

// Command ID: 0x65 - Redefine Layout Position
export async function redefineLayoutPosition(id, x, y) {
  const commandID = 0x65;
  const dataToSend = [id, x >> 8, x & 0xFF, y];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x66 - Extended Display Layout
export async function displayExtendedLayout(id, x, y, text, extraCmd) {
  const commandID = 0x66;
  // Serialize parameters into an array
  const dataToSend = serializeExtendedLayoutParameters(id, x, y, text, extraCmd);
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x67 - Get Layout Parameters
export async function getLayoutParameters(id) {
  const commandID = 0x67;
  const dataToSend = [id];
  const layoutResponse = await await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);

  if (layoutResponse.length < 17) {
    throw new Error('Invalid layout response');
  }

  const layoutParams = createLayoutParams();
  layoutParams.id = layoutResponse[0];
  layoutParams.size = layoutResponse[1];
  layoutParams.x = (layoutResponse[2] << 8) | layoutResponse[3];
  layoutParams.y = layoutResponse[4];
  layoutParams.width = (layoutResponse[5] << 8) | layoutResponse[6];
  layoutParams.height = layoutResponse[7];
  layoutParams.foreColor = layoutResponse[8];
  layoutParams.backColor = layoutResponse[9];
  layoutParams.font = layoutResponse[10];
  layoutParams.textValid = !!layoutResponse[11];
  layoutParams.textX = (layoutResponse[12] << 8) | layoutResponse[13];
  layoutParams.textY = layoutResponse[14];
  layoutParams.textRotation = layoutResponse[15];
  layoutParams.textOpacity = !!layoutResponse[16];

  return layoutParams;
}

// Command ID: 0x68 - Clear Extended Layout
export async function clearExtendedLayout(id, x, y) {
  const commandID = 0x68;
  const dataToSend = [id, x >> 8, x & 0xFF, y];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x69 - Clear and Display Layout
export async function clearAndDisplayLayout(id, text) {
  const commandID = 0x69;
  const dataToSend = [id, ...text];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x6A - Clear and Display Extended Layout
export async function clearAndDisplayExtendedLayout(id, x, y, text, extraCmd) {
  const commandID = 0x6A;
  // Serialize parameters into an array
  const dataToSend = serializeExtendedLayoutParameters(id, x, y, text, extraCmd);
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Gauge commands //
// Command ID: 0x70 - Gauge Display
export async function displayGaugeValue(id, value) {
  const commandID = 0x70;
  const dataToSend = [id, value];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x71 - Gauge Save
export async function saveGaugeParameters(gaugeParam) {
  const { id, x, y, r, rIn, start, end, clockWise } = gaugeParam;
  const commandID = 0x71;
  const dataToSend = [
    id,
    x >> 8,
    x & 0xFF,
    y >> 8,
    y & 0xFF,
    r >> 8,
    r & 0xFF,
    rIn >> 8,
    rIn & 0xFF,
    start,
    end,
    clockWise ? 1 : 0,
  ];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x72 - Gauge Delete
export async function deleteGauge(id) {
  const commandID = 0x72;
  const dataToSend = [id];
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x73 - Gauge List
export async function listGauges() {
  const commandID = 0x73;
  return await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
}

// Command ID: 0x74 - Gauge Get
export async function getGaugeParameters(id) {
  const commandID = 0x74;
  const dataToSend = [id];
  const gaugeResponse = await await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);

  if (gaugeResponse.length < 11) {
    throw new Error('Invalid gauge response');
  }

  const gaugeParams = createGaugeParams();
  gaugeParams.x = (gaugeResponse[0] << 8) | gaugeResponse[1];
  gaugeParams.y = (gaugeResponse[2] << 8) | gaugeResponse[3];
  gaugeParams.r = (gaugeResponse[4] << 8) | gaugeResponse[5];
  gaugeParams.rIn = (gaugeResponse[6] << 8) | gaugeResponse[7];
  gaugeParams.start = gaugeResponse[8];
  gaugeParams.end = gaugeResponse[9];
  gaugeParams.clockWise = !!gaugeResponse[10];

  return gaugeParams;
}

// Command ID: 0x80 - Page Save
export async function savePage(pageData) {
  const commandID = 0x80;
  const dataToSend = [pageData];
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x81 - Page Get
export async function getPage(id) {
  const commandID = 0x81;
  const dataToSend = [id];
  const pageResponse = await ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);

  return pageResponse;
}

// Command ID: 0x82 - Page Delete
export async function deletePage(id) {
  const commandID = 0x82;
  const dataToSend = [id];
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x83 - Page Display
export async function displayPage(id, strings) {
  const commandID = 0x83;
  const dataToSend = [id, ...strings];
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x84 - Page Clear
export async function clearPage(id) {
  const commandID = 0x84;
  const dataToSend = [id];
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0x85 - Page List
export async function listPages() {
  const commandID = 0x85;
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
}

// Command ID: 0x86 - Page Clear and Display
export async function clearAndDisplayPage(id, strings) {
  const commandID = 0x86;
  const dataToSend = [id, ...strings];
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0xD0 - Write Configuration
export async function writeConfiguration(name, version, password) {
  const commandID = 0xD0;
  const dataToSend = stringToUint8Array(name);
  dataToSend.push(version >> 24, (version >> 16) & 0xFF, (version >> 8) & 0xFF, version & 0xFF);
  dataToSend.push(password >> 24, (password >> 16) & 0xFF, (password >> 8) & 0xFF, password & 0xFF);
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0xD1 - Read Configuration
export async function readConfiguration(name) {
  const commandID = 0xD1;
  const dataToSend = stringToUint8Array(name);
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0xD2 - Set Configuration
export async function setConfiguration(name) {
  const commandID = 0xD2;
  const dataToSend = stringToUint8Array(name);
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0xD3 - List Configurations
export async function listConfigurations() {
  const commandID = 0xD3;
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
}

// Command ID: 0xD4 - Rename Configuration
export async function renameConfiguration(oldName, newName, password) {
  const commandID = 0xD4;
  const dataToSend = stringToUint8Array(oldName);
  dataToSend.push(...stringToUint8Array(newName));
  dataToSend.push(password >> 24, (password >> 16) & 0xFF, (password >> 8) & 0xFF, password & 0xFF);
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0xD5 - Delete Configuration
export async function deleteConfiguration(name) {
  const commandID = 0xD5;
  const dataToSend = stringToUint8Array(name);
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], dataToSend);
}

// Command ID: 0xD6 - Delete Less Used Configuration
export async function deleteLessUsedConfiguration() {
  const commandID = 0xD6;
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
}

// Command ID: 0xD7 - Get Free Space
export async function getFreeSpace() {
  const commandID = 0xD7;
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
}

// Command ID: 0xD8 - Get Number of Configurations
export async function getNumberOfConfigurations() {
  const commandID = 0xD8;
  return ble.writeCommand(RxCharacteristic, commandID, 0x10, [], []);
}

// Helper function to convert a string to Uint8Array
function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

export function createLayoutParams() {
  return {
    id: 0,
    size: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    foreColor: 0,
    backColor: 0,
    font: 0,
    textValid: false,
    textX: 0,
    textY: 0,
    textRotation: 0,
    textOpacity: false,
  };
}

export function createGaugeParams() {
  return {
    id: 1,
    x: 100,
    y: 100,
    r: 50,
    rIn: 40,
    start: 0,
    end: 100,
    clockWise: true,
  };
}


export function createPageOneLayout(pageId, layoutId1, x1, y1) {
  const layoutData = new Uint8Array([
    pageId,               // Page ID (u8)
    layoutId1,            // Layout ID 1 (u8)
    x1 >> 8, x1 & 0xFF,   // X-coordinate for Layout 1 (u16)
    y1                   // Y-coordinate for Layout 1 (u8)
    // Add more layouts as needed
  ]);
  return layoutData;
}

// Function to serialize extended layout parameters into an array
function serializeExtendedLayoutParameters(id, x, y, text, extraCmd) {
  const data = [id, x >> 8, x & 0xFF, y, ...text, ...extraCmd];
  return data;
}


function serializeLayoutParameters(layoutParams, commands) {  
  const data = [
    layoutParams.id,
    layoutParams.size,
    layoutParams.x >> 8,
    layoutParams.x & 0xFF,
    layoutParams.y,
    layoutParams.width >> 8,
    layoutParams.width & 0xFF,
    layoutParams.height,
    layoutParams.foreColor,
    layoutParams.backColor,
    layoutParams.font,
    layoutParams.textValid ? 1 : 0,
    layoutParams.textX >> 8,
    layoutParams.textX & 0xFF,
    layoutParams.textY,
    layoutParams.textRotation,
    layoutParams.textOpacity ? 1 : 0,
    ...commands,
  ];

  return data;
}


function getCharacteristicStruct(serviceName, characteristicName, property) {
  // Check if the service exists in BLUETOOTH_SERVICES
  if (BLUETOOTH_SERVICES[serviceName]) {
    const characteristics = BLUETOOTH_SERVICES[serviceName].characteristics;
    // Check if the characteristicName exists in the service's characteristics
    if (characteristics[characteristicName]) {
      const characteristic = characteristics[characteristicName];
      // Check if the property array contains property i.e 'notify'
      if (characteristic.properties && characteristic.properties.includes(property)) {
        return characteristic;
      }
    }
  }
  return null; // Return null if not found
}
