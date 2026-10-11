// ==========================================
// SETTINGS DECODER SUITE EXTENSION
// ==========================================

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
    //% block="Encode image $img as record $name"
    //% group="Images"
    export function encodeImage(img: Image, name: string): void {
        if (!img) return;
        let w = img.width;
        let h = img.height;
        let serialized = w + "," + h + ",";
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                serialized += img.getPixel(x, y) + ",";
            }
        }
        settings.writeString("IMG_" + name, serialized);
    }

    /**
     * Decode an image asset from a text string registry record
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
     * Encode a list of coordinate numbers into a text string registry record
     */
    //% block="Encode layout coordinate list $coords as $name"
    //% group="Locations"
    export function encodeCoordinates(coords: number[], name: string): void {
        if (!coords || coords.length == 0) return;
        let serialized = "";
        for (let i = 0; i < coords.length; i++) {
            serialized += coords[i] + ",";
        }
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
     * Encode current tilemap matrix cleanly into flash registry settings strings
     */
    //% block="Encode current tilemap as $name"
    //% group="Tilemaps"
    export function encodeCurrentTilemap(name: string): void {
        let scene = game.currentScene();
        let tm = scene.tileMap;
        if (!tm) return;

        let data = (tm as any).data;
        if (!data) return;

        let w = data.width;
        let h = data.height;
        let serializedData = w + "," + h + ",";

        for (let row = 0; row < h; row++) {
            for (let col = 0; col < w; col++) {
                let tileLoc = tiles.getTileLocation(col, row);
                let tileImg = tiles.getTileImage(tileLoc);

                let tileIndex = 0;
                if (tileImg) {
                    tileIndex = tileImg.getPixel(0, 0) + 1;
                }
                serializedData += tileIndex + ",";
            }
        }
        settings.writeString("TM_" + name, serializedData);
    }

    /**
     * Decode tilemap strings back into native engine TileMapData instances
     */
    //% block="Decode tilemap $name with loading popup"
    //% group="Tilemaps"
    export function decodeTilemapWithPopup(name: string): tiles.TileMapData {
        let rawData = settings.readString("TM_" + name);

        if (!rawData) {
            let fallbackBuf = control.createBuffer(8);
            fallbackBuf.setNumber(NumberFormat.Int16LE, 0, 2);
            fallbackBuf.setNumber(NumberFormat.Int16LE, 2, 2);
            let emptyImg = image.create(16, 16);
            return new tiles.TileMapData(fallbackBuf, emptyImg, [], TileScale.Sixteen);
        }

        let dataSegments = rawData.split(",");
        let w = parseInt(dataSegments[0]);
        let h = parseInt(dataSegments[1]);

        let mapDataBuffer = control.createBuffer(4 + (w * h));
        mapDataBuffer.setNumber(NumberFormat.Int16LE, 0, w);
        mapDataBuffer.setNumber(NumberFormat.Int16LE, 2, h);

        let layersImage = image.create(w, h);
        let tilePaletteList: Image[] = [];

        for (let p = 0; p < 16; p++) {
            let pImg = image.create(16, 16);
            pImg.fill(p);
            tilePaletteList.push(pImg);
        }

        isLoading = true;
        percentLoaded = 0;
        game.currentScene().eventContext.registerFrameHandler(95, drawProgressUI);

        let dataOffset = 2;
        let totalTiles = w * h;

        for (let i = 0; i < totalTiles; i++) {
            if (i + dataOffset >= dataSegments.length) break;

            let val = parseInt(dataSegments[i + dataOffset]);
            mapDataBuffer[4 + i] = val;

            if (i % w == 0) {
                percentLoaded = Math.floor((i / totalTiles) * 100);
                loops.pause(1);
            }
        }

        percentLoaded = 100;
        isLoading = false;

        return new tiles.TileMapData(
            mapDataBuffer,
            layersImage,
            tilePaletteList,
            TileScale.Sixteen
        );
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
