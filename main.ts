/**
 * Custom blocks for decoding and managing configuration settings
 */
//% color="#54527D" icon="\uf1de" block="Settings Decoder"
namespace settingsDecoder {

    // Internal tracker key prefix to identify what data type is stored in the entry
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
     * Encodes the active tilemap currently running on the game screen into storage without crashing
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
        // Read layers safely using bracket notation fallback to target the layout grid image
        let mapImage: Image = (activeMap as any)["data"] || (activeMap as any)["_data"];
        if (!mapImage) return;

        settings.writeString(TYPE_PREFIX + name, "tilemap");
        settings.writeNumberArray("sd_tm_dim_" + name, [mapImage.width, mapImage.height]);

        let tileGrid: number[] = [];
        // Flatten the map layout grid by extracting individual tile IDs
        for (let y = 0; y < mapImage.height; y++) {
            for (let x = 0; x < mapImage.width; x++) {
                tileGrid.push(mapImage.getPixel(x, y));
            }
            // Memory Release Valve: Yield execution back to the hardware processor 
            // after every completed horizontal row to prevent memory lockup crashes
            pause(1);
        }
        settings.writeNumberArray("sd_tm_grid_" + name, tileGrid);
    }

    /**
     * Encodes a specific designated tilemap layout grid safely into storage without crashing
     * @param name The identification key name for this encode, eg: "myTilemap"
     * @param tilemapData The tilemap asset to save
     */
    //% group="Encoders"
    //% block="Encode tilemap %name as %tilemapData"
    //% tilemapData.shadow="tiles_tilemap_editor"
    //% name.defl="myTilemap"
    export function encodeTilemap(name: string, tilemapData: tiles.TileMapData): void {
        if (!name || !tilemapData) return;

        // Grab the internal layout layer safely
        let mapImage: Image = (tilemapData as any)["data"] || (tilemapData as any)["_data"] || (tilemapData as any)["layers"]();
        if (!mapImage) return;

        settings.writeString(TYPE_PREFIX + name, "tilemap");
        settings.writeNumberArray("sd_tm_dim_" + name, [mapImage.width, mapImage.height]);

        let tileGrid: number[] = [];
        for (let y = 0; y < mapImage.height; y++) {
            for (let x = 0; x < mapImage.width; x++) {
                tileGrid.push(mapImage.getPixel(x, y));
            }
            // Memory Release Valve: Prevents heavy custom maps from overheating hardware engines
            pause(1);
        }
        settings.writeNumberArray("sd_tm_grid_" + name, tileGrid);
    }

    /**
     * Encodes spatial position points (both pixel X/Y coordinates and Grid Column/Row coordinates)
     * @param name The identification key name for this encode, eg: "myPosition"
     * @param pixelX Horizontal screen position coordinate, eg: 80
     * @param pixelY Vertical screen position coordinate, eg: 60
     * @param tileCol Horizontal grid tile column coordinate, eg: 5
     * @param tileRow Vertical grid tile row coordinate, eg: 3
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

        // 1. Decode Image Type
        if (type == "image") {
            let dimKey = "sd_img_dim_" + name;
            let colKey = "sd_img_col_" + name;
            if (!settings.exists(dimKey) || !settings.exists(colKey)) return null;
            let dimensions = settings.readNumberArray(dimKey);
            let colors = settings.readNumberArray(colKey);
            if (!dimensions || dimensions.length < 2 || !colors) return null;

            let imgWidth = dimensions[0];
            let imgHeight = dimensions[1];
            let decodedImg = image.create(imgWidth, imgHeight);

            for (let y = 0; y < imgHeight; y++) {
                for (let x = 0; x < imgWidth; x++) {
                    let idx = (y * imgWidth) + x;
                    if (idx < colors.length) decodedImg.setPixel(x, y, colors[idx]);
                }
            }
            return decodedImg;
        }

        // 2. Decode Universal Array Type (Returns string elements array)
        if (type == "array") {
            let arrKey = "sd_arr_" + name;
            let raw = settings.readString(arrKey);
            if (!raw) return [];
            return raw.split("||sd_split||");
        }

        // 3. Decode Tilemap Type (Returns the flattened numerical grid layout array)
        if (type == "tilemap") {
            let gridKey = "sd_tm_grid_" + name;
            return settings.readNumberArray(gridKey) || [];
        }

        // 4. Decode Position Type (Returns array: [pixelX, pixelY, tileCol, tileRow])
        if (type == "position") {
            let posKey = "sd_pos_" + name;
            return settings.readNumberArray(posKey) || [];
        }

        return null;
    }

    // ==========================================
    // SUB-CATEGORY 3: MEMORY MANAGEMENT
    // ==========================================

    /**
     * Checks if an encoded item with this custom name exists in the memory
     * @param name The identification key name to check, eg: "myImage"
     */
    //% group="Memory Management"
    //% block="Encoded value with name %name exists"
    //% name.defl="myImage"
    export function encodedValueExists(name: string): boolean {
        return settings.exists(TYPE_PREFIX + name);
    }

    /**
     * Clears a specific Encode permanently out of device memory storage profiles
     * @param name The identification key name matching the encode to wipe, eg: "myImage"
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
        settings.remove("sd_tm_grid_" + name);
        settings.remove("sd_pos_" + name);
        settings.remove("sd_arr_" + name);
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
