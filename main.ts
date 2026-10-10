// Define custom block categories and styles using special comment tags
/**
 * Settings Decoder
 */
//% color="#E67E22" icon="\uf11b" block="My Extension"
namespace customTool {

    /**
     * Spawns a custom particle effect at a location
     * @param x horizontal position, eg: 80
     * @param y vertical position, eg: 60
     */
    //% block="spawn flash effect at x %x y %y"
    //% x.defl=80 y.defl=60
    export function spawnFlash(x: number, y: number): void {
        // Your logic here using the standard MakeCode Arcade APIs
    }
}

