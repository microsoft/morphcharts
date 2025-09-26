export class MathUtils {
    /**
     * Clamp value between min, max
     * @param value value to clamp
     * @param min min value
     * @param max max value
     * @returns clamped value
     * @example clamp(10, 0, 5) => 5
     */
    public static clamp(value: number, min: number, max: number) {
        return Math.max(Math.min(value, max), min);
    }

    /**
     * Linear interpolation from value1 to value2 by amount
     * @param value2 from value
     * @param value2 to value
     * @param amount interpolation amount [0,1]
     * @returns interpolated value
     * @example lerp(0, 10, 0.5) => 5
     */
    public static lerp(value1: number, value2: number, amount: number) {
        return value1 + (value2 - value1) * amount;
    }

    /**
     * Normalize value from [min,max] to [from,to]
     * @param value value to normalize
     * @param min min from value
     * @param max max from value 
     * @param from min to value
     * @param to max to value
     * @returns normalized value, clamped [from,to]
     * @example normalize(0.5, 0, 1, 0, 10) => 5
     */
    public static normalize(value: number, min: number, max: number, from = 0, to = 1) {
        return max - min == 0 ? 0 : Math.max(Math.min((to - from) * (value - min) / (max - min) + from, to), from);
    }

    /**
     * Generates "nice" numbers for axis scale
     * @param min min range value
     * @param max max range value
     * @param maxTicks max ticks for axis
     * @returns min, max, step size
     */
    public static niceScale(min: number, max: number, maxTicks: number) {
        const range = this.niceNumber(max - min, false);
        const tickSpacing = this.niceNumber(range / (maxTicks - 1), true);
        const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
        const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;
        return { niceMin, niceMax, tickSpacing };
    }

    /**
     * Rounds a number to a "nice" value
     * @param range range to be rounded
     * @param round whether to round the number 
     * @returns "nice" number
     */
    public static niceNumber(range: number, round: boolean): number {
        const exponent = Math.floor(Math.log10(range));
        const fraction = range / Math.pow(10, exponent);
        let niceFraction: number;
        if (round) {
            if (fraction < 1.5) { niceFraction = 1; }
            else if (fraction < 3) { niceFraction = 2; }
            else if (fraction < 7) { niceFraction = 5; }
            else { niceFraction = 10; }
        } else {
            if (fraction <= 1) { niceFraction = 1; }
            else if (fraction <= 2) { niceFraction = 2; }
            else if (fraction <= 5) { niceFraction = 5; }
            else { niceFraction = 10; }
        }
        return niceFraction * Math.pow(10, exponent);
    }
}