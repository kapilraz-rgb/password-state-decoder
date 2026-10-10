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

        // Save the overarching variable type
        settings.writeString(TYPE_PREFIX + name, "array");

        // Convert the elements to text strings safely using a classic index loop
        let flatStrings: string[] = [];
        for (let i = 0; i < list.length; i++) {
            flatStrings.push("" + list[i]);
        }

        let flatString = flatStrings.join("||sd_split||");
        settings.writeString("sd_arr_" + name, flatString);
    }

    /**
     * Encodes a visual tilemap layout grid safely into storage
     * @param name The identification key name for this encode, eg: "myTilemap"
     * @param tilemapData The tilemap asset to save
     */
    //% group="Encoders"
    //% block="Encode tilemap %name as %tilemapData"
    //% tilemapData.shadow="tiles_tilemap_editor"
    //% name.defl="myTilemap"
    export function encodeTilemap(name: string, tilemapData: tiles.TileMapData): void {
        if (!name || !tilemapData) return;

        // Use property string bypass to safely grab the raw internal layout buffer
        let rawBuffer = (tilemapData as any)["data"] as Buffer;
        if (!rawBuffer) return;

        settings.writeString(TYPE_PREFIX + name, "tilemap");
        settings.writeNumber("sd_tm_scale_" + name, tilemapData.scale);
        settings.writeBuffer("sd_tm_buf_" + name, rawBuffer);
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

            for (let y2 = 0; y2 < imgHeight; y2++) {
                for (let x2 = 0; x2 < imgWidth; x2++) {
                    let idx = (y2 * imgWidth) + x2;
                    if (idx < colors.length) decodedImg.setPixel(x2, y2, colors[idx]);
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

        // 3. Decode Tilemap Type (Returns the compiled TileMapData buffer registry object)
        if (type == "tilemap") {
            let bufKey = "sd_tm_buf_" + name;
            let scaleKey = "sd_tm_scale_" + name;
            if (!settings.exists(bufKey)) return null;

            let storedBuf = settings.readBuffer(bufKey);
            let storedScale = settings.readNumber(scaleKey) || 4; // Defaults to 16x16 tiles layout (2^4=16)

            // Reconstructs a structural runtime clone map asset
            return new tiles.TileMapData(storedBuf, image.create(16, 16), [], storedScale);
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
        settings.remove("sd_tm_scale_" + name);
        settings.remove("sd_tm_buf_" + name);
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
