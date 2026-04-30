export interface StateInfo {
	name: string;
	capital: string;
	abbr: string;
}

export const AUSTRALIAN_STATES: Record<string, StateInfo> = {
	NSW: { name: "New South Wales", capital: "Sydney", abbr: "NSW" },
	VIC: { name: "Victoria", capital: "Melbourne", abbr: "VIC" },
	QLD: { name: "Queensland", capital: "Brisbane", abbr: "QLD" },
	WA: { name: "Western Australia", capital: "Perth", abbr: "WA" },
	SA: { name: "South Australia", capital: "Adelaide", abbr: "SA" },
	TAS: { name: "Tasmania", capital: "Hobart", abbr: "TAS" },
	ACT: { name: "Australian Capital Territory", capital: "Canberra", abbr: "ACT" },
	NT: { name: "Northern Territory", capital: "Darwin", abbr: "NT" },
} as const;

export const STATE_ABBREVIATIONS = Object.keys(AUSTRALIAN_STATES) as Array<keyof typeof AUSTRALIAN_STATES>;

export const getStateInfo = (stateAbbr: string): StateInfo | null => {
	const normalizedState = stateAbbr.toUpperCase();
	return AUSTRALIAN_STATES[normalizedState] || null;
}; 