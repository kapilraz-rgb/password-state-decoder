// ==========================================
// SETTINGS DECODER SUITE EXTENSION
// ==========================================

// Custom dropdown mode choices for location tracking blocks
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
    //% block="encode image $img=screen as record $name"
    //% group="Images"
    //% weight=100
    export function encodeImage(img: Image, name: string): void {
        if (!img) return;
        let w = img.width;
        let h = img.height;
        let serialized = convertToText(w) + "," + convertToText(h) + ",";
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                serialized += convertToText(img.getPixel(x, y)) + ",";
            }
        }
        settings.writeString("IMG_" + name, serialized);
    }

    /**
     * Decode an image asset from a text string registry record (Universal Reporter Block)
     */
    //% block="decode image from record $name"
    //% group="Images"
    //% weight=90
    export function decodeImage(name: string): Image {
        let rawData = settings.readString("IMG_" + name);
        if (!rawData) return image.create(16, 16);

        let segments = rawData.split(",");
        if (segments.length < 2) return image.create(16, 16);

        // FIXED: Using array shifting to completely bypass bracket lookup errors in blocks view
        let wStr = segments.shift();
        let hStr = segments.shift();
        let w = parseInt(wStr);
        let h = parseInt(hStr);
        let img = image.create(w, h);

        for (let i = 0; i < w * h; i++) {
            if (i >= segments.length) break;
            let val = parseInt(segments[i]);
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
    //% block="save current location using $mode as $name"
    //% group="Locations"
    //% weight=80
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

        let serialized = convertToText(xVal) + "," + convertToText(yVal) + ",";
        settings.writeString("LOC_" + name, serialized);
    }

    /**
     * Decode a list of coordinate numbers from a text string registry record
     */
    //% block="decode layout coordinate list $name"
    //% group="Locations"
    //% weight=70
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
    //% block="encode tilemap image data $tmMap=screen as $name"
    //% group="Tilemaps"
    //% weight=60
    export function encodeTilemapImage(tmMap: Image, name: string): void {
        if (!tmMap) return;
        let w = tmMap.width;
        let h = tmMap.height;
        let serializedData = convertToText(w) + "," + convertToText(h) + ",";

        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                let tileIndex = tmMap.getPixel(col, row);
                serializedData += convertToText(tileIndex) + ",";
            }
        }
        settings.writeString("TM_" + name, serializedData);
    }

    /**
     * Decode tilemap strings back into a clean Image canvas structure format
     */
    //% block="decode tilemap $name with loading popup"
    //% group="Tilemaps"
    //% weight=50
    export function decodeTilemapWithPopup(name: string): Image {
        let rawData = settings.readString("TM_" + name);
        if (!rawData) return image.create(16, 16);

        let dataSegments = rawData.split(",");
        if (dataSegments.length < 2) return image.create(16, 16);

        // FIXED: Cleaned array parsing layout patterns to guarantee visual block generation
        let wStr = dataSegments.shift();
        let hStr = dataSegments.shift();
        let w = parseInt(wStr);
        let h = parseInt(hStr);

        let layersImage = image.create(w, h);

        isLoading = true;
        percentLoaded = 0;
        game.currentScene().eventContext.registerFrameHandler(95, drawProgressUI);

        let totalTiles = w * h;

        for (let i = 0; i < totalTiles; i++) {
            if (i >= dataSegments.length) break;

            let val = parseInt(dataSegments[i]);
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
    //% block="clear encode data $name"
    //% group="Memory Management"
    //% weight=40
    export function clearEncode(name: string): void {
        settings.remove("TM_" + name);
        settings.remove("IMG_" + name);
        settings.remove("LOC_" + name);
    }

    /**
     * Reset complete system registry layout configuration entries
     */
    //% block="clear all encoded assets"
    //% group="Memory Management"
    //% weight=30
    export function clearAll(): void {
        let tmKeys = settings.list("TM_");
        for (let k of tmKeys) settings.remove(k);
        let imgKeys = settings.list("IMG_");
        for (let k of imgKeys) settings.remove(k);
        let locKeys = settings.list("LOC_");
        for (let k of locKeys) settings.remove(k);
    }
}
