/**
 * Custom blocks for decoding and managing configuration settings without crashes
 */
//% color="#54527D" icon="\uf1de" block="Settings Decoder"
namespace settingsDecoder {

    const TYPE_PREFIX = "sd_type_";

    // ==========================================
    // SUB-CATEGORY 1: ENCODERS
    // ==========================================

    /**
     * Encodes a visual image canvas into system storage
     * @param name The identification key name for this encode, eg: "myImage"
     * @param img The visual image canvas drawn by the programmer
     */
    //% group="Encoders"
    //% block="Encode %name as %img"
    //% img.shadow="screen_image_picker"
    //% name.defl="myImage"
    export function encodeImage(name: string, img: Image): void {
        if (!name || !img) return;
        settings.writeString(TYPE_PREFIX + name, "image");
        settings.writeNumberArray("sd_img_dim_" + name, [img.width, img.height]);
        let colorArray: number[] = [];
        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                colorArray.push(img.getPixel(x, y));
            }
        }
        settings.writeNumberArray("sd_img_col_" + name, colorArray);
    }

    /**
     * Encodes any array type (Numbers, Strings, Booleans, etc.) into system storage
     * @param name The identification key name for this encode, eg: "myArray"
     * @param list The target array of any data type to encode
     */
    //% group="Encoders"
    //% block="Encode array %name as list %list"
    //% list.shadow="lists_create_with"
    //% name.defl="myArray"
    export function encodeAnyArray(name: string, list: any[]): void {
        if (!name || !list) return;
        settings.writeString(TYPE_PREFIX + name, "array");
        let flatStrings: string[] = [];
        for (let i = 0; i < list.length; i++) {
            flatStrings.push("" + list[i]);
        }
        let flatString = flatStrings.join("||sd_split||");
        settings.writeString("sd_arr_" + name, flatString);
    }

    /**
     * Encodes the active tilemap currently running on the game screen into storage safely using background chunk streaming
     * @param name The identification key name for this tilemap encode, eg: "currentLevel"
     */
    //% group="Encoders"
    //% block="Encode current tilemap as %name"
    //% name.defl="currentLevel"
    export function encodeCurrentTilemap(name: string): void {
        if (!name) return;
        let scene = game.currentScene();
        if (!scene || !scene.tileMap) return;

        let activeMap = scene.tileMap;
        let mapWidth = (activeMap as any)["data"] ? (activeMap as any)["data"].width : 16;
        let mapHeight = (activeMap as any)["data"] ? (activeMap as any)["data"].height : 16;

        settings.writeString(TYPE_PREFIX + name, "tilemap");
        settings.writeNumberArray("sd_tm_dim_" + name, [mapWidth, mapHeight]);

        control.runInParallel(function () {
            let chunkCount = 0;
            for (let y = 0; y < mapHeight; y++) {
                let rowBuf = control.createBuffer(mapWidth);
                for (let x = 0; x < mapWidth; x++) {
                    let tile = activeMap.getTile(x, y);
                    let tileImg = tiles.getTileImage(tile);                    let id = 0;
                    if (tileImg) {
                        id = tileImg.getPixel(0, 0) + (tileImg.width % 16);
                    }
                    rowBuf.setUint8(x, id & 0xFF);
                }
                settings.writeBuffer("sd_tm_b" + chunkCount + "_" + name, rowBuf);
                chunkCount++;
                pause(6);
            }
            settings.writeNumber("sd_tm_chunks_" + name, chunkCount);
        });
    }

    /**
     * Encodes a specific designated tilemap layout grid safely into storage
     * @param name The identification key name for this encode, eg: "myTilemap"
     * @param tilemapData The tilemap asset to save
     */
    //% group="Encoders"
    //% block="Encode tilemap %name as %tilemapData"
    //% tilemapData.shadow="tiles_tilemap_editor"
    //% name.defl="myTilemap"
    export function encodeTilemap(name: string, tilemapData: tiles.TileMapData): void {
        if (!name || !tilemapData) return;
        let mapImage: Image = (tilemapData as any)["data"] || (tilemapData as any)["_data"];
        if (!mapImage) return;

        settings.writeString(TYPE_PREFIX + name, "tilemap");
        settings.writeNumberArray("sd_tm_dim_" + name, [mapImage.width, mapImage.height]);

        control.runInParallel(function () {
            let chunkCount = 0;
            for (let y = 0; y < mapImage.height; y++) {
                let rowBuf = control.createBuffer(mapImage.width);
                for (let x = 0; x < mapImage.width; x++) {
                    rowBuf.setUint8(x, mapImage.getPixel(x, y) & 0xFF);
                }
                settings.writeBuffer("sd_tm_b" + chunkCount + "_" + name, rowBuf);
                chunkCount++;
                pause(6);
            }
            settings.writeNumber("sd_tm_chunks_" + name, chunkCount);
        });
    }

    /**
     * Encodes spatial position points
     * @param name The identification key name for this encode, eg: "myPosition"
     */
    //% group="Encoders"
    //% block="Encode position %name with pixel x %pixelX y %pixelY tile col %tileCol row %tileRow"
    //% name.defl="myPosition" pixelX.defl=80 pixelY.defl=60 tileCol.defl=5 tileRow.defl=3
    export function encodePosition(name: string, pixelX: number, pixelY: number, tileCol: number, tileRow: number): void {
        if (!name) return;
        settings.writeString(TYPE_PREFIX + name, "position");
        settings.writeNumberArray("sd_pos_" + name, [pixelX, pixelY, tileCol, tileRow]);
    }

    // ==========================================
    // SUB-CATEGORY 2: DECODERS
    // ==========================================

    /**
     * Gets the decoded value of the encode dynamically based on what was saved
     * @param name The identification key name of the encode, eg: "myImage"
     */
    //% group="Decoders"
    //% block="Decoded value of %name"
    //% name.defl="myImage"
    export function decodedValueOf(name: string): any {
        if (!settings.exists(TYPE_PREFIX + name)) return null;
        let type = settings.readString(TYPE_PREFIX + name);

        if (type == "image") {
            let dimKey = "sd_img_dim_" + name;
            let colKey = "sd_img_col_" + name;
            if (!settings.exists(dimKey) || !settings.exists(colKey)) return null;
            let dimensions = settings.readNumberArray(dimKey);
            let colors = settings.readNumberArray(colKey);
            if (!dimensions || dimensions.length < 2 || !colors) return null;

            let decodedImg = image.create(dimensions[0], dimensions[1]);
            for (let y = 0; y < dimensions[1]; y++) {
                for (let x = 0; x < dimensions[0]; x++) {
                    let idx = (y * dimensions[0]) + x;
                    if (idx < colors.length) decodedImg.setPixel(x, y, colors[idx]);
                }
            }
            return decodedImg;
        }

        if (type == "array") {
            let arrKey = "sd_arr_" + name;
            let raw = settings.readString(arrKey);
            if (!raw) return [];
            return raw.split("||sd_split||");
        }

        if (type == "tilemap") {
            let chunkLimitKey = "sd_tm_chunks_" + name;
            if (!settings.exists(chunkLimitKey)) return [];

            let totalChunks = settings.readNumber(chunkLimitKey);
            let tileGridArray: number[] = [];

            for (let c = 0; c < totalChunks; c++) {
                let rowBuf = settings.readBuffer("sd_tm_b" + c + "_" + name);
                if (rowBuf) {
                    for (let i = 0; i < rowBuf.length; i++) {
                        tileGridArray.push(rowBuf.getUint8(i));
                    }
                }
            }
            return tileGridArray;
        }

        if (type == "position") {
            let posKey = "sd_pos_" + name;
            return settings.readNumberArray(posKey) || [];
        }

        return null;
    }

    /**
     * Decodes a saved tilemap structure dynamically while displaying an elegant, visual loading popup
     * @param name The identification key name of the tilemap encode, eg: "currentLevel"
     */
    //% group="Decoders"
    //% block="Decode tilemap %name with loading popup"
    //% name.defl="currentLevel"
    export function decodeTilemapWithPopup(name: string): number[] {
        let chunkLimitKey = "sd_tm_chunks_" + name;
        if (!settings.exists(chunkLimitKey)) return [];

        let totalChunks = settings.readNumber(chunkLimitKey);
        let tileGridArray: number[] = [];

        let modal = sprites.create(image.create(120, 50), SpriteKind.Food);
        modal.image.fill(11);
        modal.image.drawRect(2, 2, 116, 46, 1);
        modal.z = 200;

        for (let c = 0; c < totalChunks; c++) {
            let rowBuf = settings.readBuffer("sd_tm_b" + c + "_" + name);
            if (rowBuf) {
                for (let i = 0; i < rowBuf.length; i++) {
                    tileGridArray.push(rowBuf.getUint8(i));
                }
            }

            let percentage = Math.floor(((c + 1) / totalChunks) * 100);

            modal.image.fill(11);
            modal.image.drawRect(2, 2, 116, 46, 1);
            modal.image.print("LOADING MAP...", 24, 10, 1, image.font5);
            modal.image.drawRect(10, 26, 100, 10, 1);

            if (percentage > 0) {
                modal.image.fillRect(12, 28, Math.floor(percentage * 0.96), 6, 4);
            }

            modal.image.print(percentage + "%", 50, 38, 3, image.font5);
            pause(6);
        }

        modal.destroy();
        return tileGridArray;
    }

    // ==========================================
    // SUB-CATEGORY 3: MEMORY MANAGEMENT
    // ==========================================

    /**
     * Checks if an encoded item with this custom name exists in the memory
     */
    //% group="Memory Management"
    //% block="Encoded value with name %name exists"
    //% name.defl="myImage"
    export function encodedValueExists(name: string): boolean {
        return settings.exists(TYPE_PREFIX + name);
    }

    /**
     * Clears a specific Encode permanently out of device memory storage profiles
     */
    //% group="Memory Management"
    //% block="Clear Encode %name"
    //% name.defl="myImage"
    export function clearEncode(name: string): void {
        if (!name) return;
        settings.remove(TYPE_PREFIX + name);
        settings.remove("sd_img_dim_" + name);
        settings.remove("sd_img_col_" + name);
        settings.remove("sd_tm_dim_" + name);
        settings.remove("sd_tm_chunks_" + name);
        settings.remove("sd_pos_" + name);
        settings.remove("sd_arr_" + name);

        for (let i = 0; i < 256; i++) {
            let segmentKey = "sd_tm_b" + i + "_" + name;
            if (settings.exists(segmentKey)) {
                settings.remove(segmentKey);
            } else {
                break;
            }
        }
    }

    /**
     * Clears all encodes and settings permanently out of flash memory profiles
     */
    //% group="Memory Management"
    //% block="Clear All"
    export function clearAll(): void {
        let allKeys = settings.list("");
        for (let key of allKeys) {
            settings.remove(key);
        }
    }
}

// ============================================================================
// SANDBOX INTEGRATED TEST CODE SUITE
// ============================================================================

let mockMapData = image.create(32, 32);
for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
        mockMapData.setPixel(x, y, (x + y) % 6);
    }
}

settingsDecoder.encodeImage("test_drawing", mockMapData);

settings.writeString("sd_type_level_one", "tilemap");
settings.writeNumber("sd_tm_chunks_level_one", 32);
for (let r = 0; r < 32; r++) {
    let mockBuf = control.createBuffer(32);
    for (let c = 0; c < 32; c++) {
        mockBuf.setUint8(c, 3);
    }
    settings.writeBuffer("sd_tm_b" + r + "_level_one", mockBuf);
}

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    scene.setBackgroundColor(2);
    let decodedData = settingsDecoder.decodeTilemapWithPopup("level_one");
    music.play(music.melodyPlayable(music.baDing), music.PlaybackMode.UntilDone);
});
