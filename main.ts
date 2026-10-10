namespace settingsDecoder {

    /**
     * Encodes and saves a visual image canvas to a specific picture slot ID for future playthroughs
     * @param imageId a unique name or number for this specific picture, eg: "hero_sprite"
     * @param myImage The visual image grid drawn by the programmer
     */
    //% group="Image Decoder"
    //% block="encode image to slot %imageId from %myImage"
    //% myImage.shadow="screen_image_picker"
    //% imageId.defl="hero_sprite"
    export function encodeImageToSlot(imageId: string, myImage: Image): void {
        if (!imageId || !myImage) return;

        let width = myImage.width;
        let height = myImage.height;

        // Save dimensions using a dynamic unique key name
        settings.writeNumberArray("pxt_img_dim_" + imageId, [width, height]);

        // Flatten the 2D canvas rows into a 1D color array
        let colorArray: number[] = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                colorArray.push(myImage.getPixel(x, y));
            }
        }

        // Save the unique color array to memory
        settings.writeNumberArray("pxt_img_col_" + imageId, colorArray);
    }

    /**
     * Decodes a saved image layout from a specific slot ID and returns it as an Image asset
     * @param imageId the unique name or number of the picture slot to load, eg: "hero_sprite"
     */
    //% group="Image Decoder"
    //% block="decode image from slot %imageId"
    //% imageId.defl="hero_sprite"
    export function decodeImageFromSlot(imageId: string): Image {
        let dimKey = "pxt_img_dim_" + imageId;
        let colKey = "pxt_img_col_" + imageId;

        // If slot keys don't exist yet, return a safe blank 1x1 fallback pixel
        if (!settings.exists(dimKey) || !settings.exists(colKey)) {
            return image.create(1, 1);
        }

        let dimensions = settings.readNumberArray(dimKey);
        let colors = settings.readNumberArray(colKey);

        if (!dimensions || dimensions.length < 2 || !colors) {
            return image.create(1, 1);
        }

        let imgWidth = dimensions[0];
        let imgHeight = dimensions[1];
        let decodedImg = image.create(imgWidth, imgHeight);

        // Reconstruct the unique visual image grid
        for (let y2 = 0; y2 < imgHeight; y2++) {
            for (let x2 = 0; x2 < imgWidth; x2++) {
                let colorIndex = (y2 * imgWidth) + x2;
                if (colorIndex < colors.length) {
                    decodedImg.setPixel(x2, y2, colors[colorIndex]);
                }
            }
        }

        return decodedImg;
    }

    /**
     * Completely wipes a saved picture slot from the console's memory
     * @param imageId the unique name or number of the picture slot to delete, eg: "hero_sprite"
     */
    //% group="Image Decoder"
    //% block="clear saved image slot %imageId"
    //% imageId.defl="hero_sprite"
    export function clearImageSlot(imageId: string): void {
        let dimKey2 = "pxt_img_dim_" + imageId;
        let colKey2 = "pxt_img_col_" + imageId;

        // Remove the data keys permanently from flash storage
        if (settings.exists(dimKey2)) {
            settings.remove(dimKey2);
        }
        if (settings.exists(colKey2)) {
            settings.remove(colKey2);
        }
    }
}
