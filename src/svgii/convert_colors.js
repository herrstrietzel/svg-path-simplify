export function hex2Rgb(hex = '') {
    // Remove # if present
    if (hex.startsWith('#')) hex = hex.substring(1);

    // normalize short notation (e.g., 'fff' or 'ffff')
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    } else if (hex.length === 4) {
        // Handle short notation with alpha (e.g., 'ffff')
        hex = hex.split('').map(char => char + char).join('');
    }

    let r = 0, g = 0, b = 0, a = 0;

    // invalid
    if (hex.length < 6 || hex.length > 8) {
        console.warn('Invalid hex format');
        return { r, g, b, a };
    }

    let isRgba = hex.length === 8

    let numericValue = parseInt(hex, 16);
    r = isRgba ? parseInt(hex.substring(0, 2), 16) : numericValue >> 16 & 0xFF;
    g = isRgba ? parseInt(hex.substring(2, 4), 16) : numericValue >> 8 & 0xFF;
    b = isRgba ? parseInt(hex.substring(4, 6), 16) : numericValue & 0xFF;
    a = isRgba ? parseInt(hex.substring(6, 8), 16) : 255;

    return { r, g, b, a };

}

export function rgba2Hex({ r, g, b, a = 255 }) {
    // Helper function to convert number to 2-digit hex
    const toHex = (num) => {
        const hex = Math.min(255, Math.max(0, Math.round(num))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    // Get hex values
    let rHex = toHex(r);
    let gHex = toHex(g);
    let bHex = toHex(b);
    let aHex = a < 255 ? toHex(a) : 0;

    let allowsShort = rHex[0] === rHex[1] && gHex[0] === gHex[1] && bHex[0] === bHex[1];

    // Check for 3-character RGB short notation (e.g., #fff)
    if (!aHex && allowsShort) {
        return `#${rHex[0]}${gHex[0]}${bHex[0]}`;
    }

    // Check for 4-character RGBA short notation (e.g., #ffff)
    if (aHex && allowsShort ) {
        return `#${rHex[0]}${gHex[0]}${bHex[0]}${aHex[0]}`;
    }

    // Return 6-character RGB if no alpha
    if (!aHex) {
        return `#${rHex}${gHex}${bHex}`;
    }

    // Return 8-character RGBA
    return `#${rHex}${gHex}${bHex}${aHex}`;
}



export function hsl2Rgb(hsla = {}) {
    let {h, s, l, a = 1} = hsla;

    // Normalize
    h = ((h % 360) + 360) % 360; // wrap hue
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = l - c / 2;

    let r1, g1, b1;

    if (h < 60) [r1, g1, b1] = [c, x, 0];
    else if (h < 120) [r1, g1, b1] = [x, c, 0];
    else if (h < 180) [r1, g1, b1] = [0, c, x];
    else if (h < 240) [r1, g1, b1] = [0, x, c];
    else if (h < 300) [r1, g1, b1] = [x, 0, c];
    else[r1, g1, b1] = [c, 0, x];

    let r = (r1 + m) * 255;
    let g = (g1 + m) * 255;
    let b = (b1 + m) * 255;
    a = Math.floor(a*255);

    [r, g, b] = [r, g, b].map((val) => +val.toFixed(0));

    return {r,g,b,a}
}
