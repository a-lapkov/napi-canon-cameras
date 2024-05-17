import { PropertyValue } from './CameraProperty';

export class TimeZone implements PropertyValue {

    [Symbol.toStringTag] = 'TimeZone';

    private readonly label_: string;

    private readonly difference_: number = 0;

    private readonly zone_: number;

    /**
     * TimeZone property value
     *
     * @class TimeZone
     * @implements PropertyValue
     * @param {number} value_
     */
    constructor(
        private readonly value_: number,
    ) {
        this.value_ = value_;
        this.zone_ = value_;
        this.label_ = TimeZone.Zones[`${value_}` as keyof typeof TimeZone.Zones] || '';
    }

    /**
     * @readonly
     * @type {string}
     */
    get label(): string {
        return this.label_;
    }

    /**
     * @readonly
     * @type {number}
     */
    get value(): number {
        return this.value_;
    }

    /**
     * @readonly
     * @type {number}
     */
    get zone(): number {
        return this.zone_;
    }

    /**
     * @readonly
     * @type {number}
     */
    get difference(): number {
        return this.difference_;
    }

    /**
     * Allows type cast to number - returns the value.
     * @param {string} hint
     * @return { number | string | null}
     */
    [Symbol.toPrimitive](hint: string): string | number | null {
        switch (hint) {
            case 'number':
                return this.value_;
            case 'string':
                return this.label_;
            default:
                return null;
        }
    }

    /**
     * @return {{label: string, value: number, zone: number, difference: number}}
     */
    toJSON(): { label: string, value: number, zone: number, difference: number } {
        return {
            label: this.label,
            value: this.value,
            zone: this.zone,
            difference: this.difference,
        };
    }

    // Generate: TimeZone

    /**
     * @readonly
     * @enum {string}
     */
    static readonly Zones: Record<'0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' | '30' | '31' | '32' | '33' | '34' | '35' | '256' | '65535', string> = {
        '0': 'None',
        '1': 'Chatham Islands',
        '2': 'Wellington',
        '3': 'Solomon Island',
        '4': 'Sydney',
        '5': 'Adeladie',
        '6': 'Tokyo',
        '7': 'Hong Kong',
        '8': 'Bangkok',
        '9': 'Yangon',
        '10': 'Dacca',
        '11': 'Kathmandu',
        '12': 'Delhi',
        '13': 'Karachi',
        '14': 'Kabul',
        '15': 'Dubai',
        '16': 'Tehran',
        '17': 'Moscow',
        '18': 'Cairo',
        '19': 'Paris',
        '20': 'London',
        '21': 'Azores',
        '22': 'Fernando de Noronha',
        '23': 'São Paulo',
        '24': 'Newfoundland',
        '25': 'Santiago',
        '26': 'Caracas',
        '27': 'New York',
        '28': 'Chicago',
        '29': 'Denver',
        '30': 'Los Angeles',
        '31': 'Anchorage',
        '32': 'Honolulu',
        '33': 'Samoa',
        '34': 'Riyadh',
        '35': 'Manaus',
        '256': 'UTC',
        '65535': 'UTC',
    };

    // GenerateEnd
}
