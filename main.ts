// ==========================================
// SETTINGS DECODER SUITE EXTENSION
// ==========================================

// Custom dropdown mode options for position tracking
enum LocationMode {
    //% block="Player Position (X,Y)"
    PlayerPosition = 1,
    //% block="Tile Location (Col,Row)"
    TileLocation = 2
}

//% color="#e91e63" icon="\uf1de" block="Settings Decoder"
namespace settingsDecoder {
    let percentLoaded = 0;
    let isLoading = false;

    // Helper to draw the progress bar overlay safely on screen
    function drawProgressUI() {
        if (!isLoading) return;
        screen.fillRect(10, 50, 140, 60, 11);
        screen.fillRect(12, 52, 136, 56, 15);
        screen.print("LOADING TILEMAP...", 20, 62, 9, image.font8);
        screen.drawRect(20, 80, 120, 12, 1);
        let barWidth = Math.floor((percentLoaded / 100) * 116);
        if (barWidth > 0) {
            screen.fillRect(22, 82, barWidth, 8, 5);
        }
        screen.print(percentLoaded + "%", 70, 96, 6, image.font5);
    }

    // ==========================================
    // 1. IMAGE ENCODERS & DECODERS
    // ==========================================

    /**
     * Encode an image asset into a text string registry record
     */
    //% block="Encode image $img=screen as record $name"
    //% group="Images"
    export function encodeImage(img: Image, name: string): void {
        if (!img) return;
        let w = img.width;
        let h = img.height;
        let serialized = convertToText(w) + "," + convertToText(h) + ",";
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // FIXED: Wrapped with convertToText() to block type parsing bugs
                serialized += convertToText(img.getPixel(x, y)) + ",";
            }
        }
        settings.writeString("IMG_" + name, serialized);
    }

    /**
     * Decode an image asset from a text string registry record (Universal Reporter Block)
     */
    //% block="Decode image from record $name"
    //% group="Images"
    export function decodeImage(name: string): Image {
        let rawData = settings.readString("IMG_" + name);
        if (!rawData) return image.create(16, 16);

        let segments = rawData.split(",");
        let w = parseInt(segments[0]);
        let h = parseInt(segments[1]);
        let img = image.create(w, h);

        let offset = 2;
        for (let i = 0; i < w * h; i++) {
            if (i + offset >= segments.length) break;
            let val = parseInt(segments[i + offset]);
            let x = i % w;
            let y = Math.floor(i / w);
            img.setPixel(x, y, val);
        }
        return img;
    }

    // ==========================================
    // 2. LOCATION / COORDINATE ENCODERS & DECODERS
    // ==========================================

    /**
     * Save target dynamic point data with choice menu configuration profiles
     */
    //% block="Save current location using $mode as $name"
    //% group="Locations"
    export function saveLocationCoordsMode(mode: LocationMode, name: string): void {
        let xVal = 0;
        let yVal = 0;
        let scene = game.currentScene();

        if (mode === LocationMode.PlayerPosition) {
            xVal = scene.camera ? scene.camera.offsetX + 80 : 0;
            yVal = scene.camera ? scene.camera.offsetY + 60 : 0;
        } else if (mode === LocationMode.TileLocation) {
            let pixelX = scene.camera ? scene.camera.offsetX + 80 : 0;
            let pixelY = scene.camera ? scene.camera.offsetY + 60 : 0;
            xVal = Math.floor(pixelX / 16);
            yVal = Math.floor(pixelY / 16);
        }

        // FIXED: Replaced standard string concatenation with safe explicit text conversions
        let serialized = convertToText(xVal) + "," + convertToText(yVal) + ",";
        settings.writeString("LOC_" + name, serialized);
    }

    /**
     * Decode a list of coordinate numbers from a text string registry record
     */
    //% block="Decode layout coordinate list $name"
    //% group="Locations"
    export function decodeCoordinates(name: string): number[] {
        let rawData = settings.readString("LOC_" + name);
        if (!rawData) return [];

        let segments = rawData.split(",");
        let coords: number[] = [];
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].length == 0) continue;
            coords.push(parseInt(segments[i]));
        }
        return coords;
    }

    // ==========================================
    // 3. TILEMAP ENCODERS & DECODERS
    // ==========================================

    /**
     * Encode a raw layer image layout out into flash registry settings strings
     */
    //% block="Encode tilemap image data $tmMap=screen as $name"
    //% group="Tilemaps"
    export function encodeTilemapImage(tmMap: Image, name: string): void {
        if (!tmMap) return;
        let w = tmMap.width;
        let h = tmMap.height;
        let serializedData = convertToText(w) + "," + convertToText(h) + ",";

        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                let tileIndex = tmMap.getPixel(col, row);
                // FIXED: Wrapped numeric values with convertToText() to ensure a perfect 0 errors build
                serializedData += convertToText(tileIndex) + ",";
            }
        }
        settings.writeString("TM_" + name, serializedData);
    }

    /**
     * Decode tilemap strings back into a clean Image canvas structure format
     */
    //% block="Decode tilemap $name with loading popup"
    //% group="Tilemaps"
    export function decodeTilemapWithPopup(name: string): Image {
        let rawData = settings.readString("TM_" + name);
        if (!rawData) return image.create(16, 16);

        let dataSegments = rawData.split(",");
        let w = parseInt(dataSegments[0]);
        let h = parseInt(dataSegments[1]);

        let layersImage = image.create(w, h);

        isLoading = true;
        percentLoaded = 0;
        game.currentScene().eventContext.registerFrameHandler(95, drawProgressUI);

        let dataOffset = 2;
        let totalTiles = w * h;

        for (let i = 0; i < totalTiles; i++) {
            if (i + dataOffset >= dataSegments.length) break;

            let val = parseInt(dataSegments[i + dataOffset]);
            let col = i % w;
            let row = Math.floor(i / w);
            layersImage.setPixel(col, row, val);

            if (i % w == 0) {
                percentLoaded = Math.floor((i / totalTiles) * 100);
                loops.pause(1);
            }
        }

        percentLoaded = 100;
        isLoading = false;

        return layersImage;
    }

    // ==========================================
    // 4. GENERAL SYSTEM MEMORY MANAGEMENT
    // ==========================================

    /**
     * Clear specific memory profiles tied to tag target names
     */
    //% block="Clear Encode $name"
    //% group="Memory Management"
    export function clearEncode(name: string): void {
        settings.remove("TM_" + name);
        settings.remove("IMG_" + name);
        settings.remove("LOC_" + name);
    }

    /**
     * Reset complete system registry layout configuration entries
     */
    //% block="Clear All Encoded Assets"
    //% group="Memory Management"
    export function clearAll(): void {
        let tmKeys = settings.list("TM_");
        for (let k of tmKeys) settings.remove(k);
        let imgKeys = settings.list("IMG_");
        for (let k of imgKeys) settings.remove(k);
        let locKeys = settings.list("LOC_");
        for (let k of locKeys) settings.remove(k);
    }
}
