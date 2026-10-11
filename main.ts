// ==========================================
// SETTINGS DECODER SUITE EXTENSION
// ==========================================

//% color="#2d7cd6" icon="\uf0ac" block="Settings Decoder"
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

    /**
     * Encode current tilemap matrix cleanly into flash registry settings strings
     */
    //% block="Encode current tilemap as $name"
    //% group="Encoders"
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
    //% group="Decoders"
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

        // FIXED LINES 76 & 77: Targeted the exact array elements instead of passing the full array
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

    /**
     * Clear specific memory profiles tied to tag target names
     */
    //% block="Clear Encode $name"
    //% group="Memory Management"
    export function clearEncode(name: string): void {
        settings.remove("TM_" + name);
    }

    /**
     * Reset complete system registry layout configuration entries
     */
    //% block="Clear All Encoded Tilemaps"
    //% group="Memory Management"
    export function clearAll(): void {
        let keys = settings.list("TM_");
        for (let k of keys) {
            settings.remove(k);
        }
    }
}
