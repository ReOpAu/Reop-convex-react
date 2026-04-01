// Comprehensive test cases for address validation accuracy
// This file contains known address validation scenarios to test against Google's API
export const validationTestCases = [
    // === MELBOURNE INNER SUBURBS - KNOWN INVALID COMBINATIONS ===
    {
        id: "chaucer_camberwell",
        input: "18A Chaucer Crescent, Camberwell VIC 3126",
        expected: "SHOULD_FAIL",
        reason: "Chaucer Crescent is actually in Canterbury, not Camberwell",
        actualSuburb: "Canterbury",
        actualStreet: "Chaucer Crescent",
        postcode: "3124",
        category: "invalid_suburb",
        transcriptionVariations: [
            "18A Chaucer Crescent, Canterbury VIC 3124", // Correct version
            "18A Chorca Crescent, Camberwell VIC 3126", // Transcription error
        ],
    },
    {
        id: "collins_richmond",
        input: "999 Collins Street, Richmond VIC 3121",
        expected: "SHOULD_FAIL",
        reason: "Collins Street doesn't extend into Richmond - it's in Melbourne CBD",
        actualSuburb: "Melbourne",
        postcode: "3000",
        category: "invalid_suburb",
    },
    {
        id: "chapel_st_kilda",
        input: "500 Chapel Street, St Kilda VIC 3182",
        expected: "SHOULD_FAIL",
        reason: "Chapel Street runs through Prahran/South Yarra, not St Kilda",
        actualSuburb: "Prahran",
        postcode: "3181",
        category: "invalid_suburb",
    },
    {
        id: "burke_road_malvern",
        input: "234 Burke Road, Malvern VIC 3144",
        expected: "SHOULD_FAIL",
        reason: "Burke Road is primarily in Camberwell (3124), not Malvern",
        actualSuburb: "Camberwell",
        postcode: "3124",
        category: "invalid_suburb",
    },
    {
        id: "toorak_road_richmond",
        input: "567 Toorak Road, Richmond VIC 3121",
        expected: "SHOULD_FAIL",
        reason: "Toorak Road runs through Toorak/South Yarra, not Richmond",
        actualSuburb: "Toorak",
        postcode: "3142",
        category: "invalid_suburb",
    },
    {
        id: "flinders_lane_collingwood",
        input: "88 Flinders Lane, Collingwood VIC 3066",
        expected: "SHOULD_FAIL",
        reason: "Flinders Lane is in Melbourne CBD, not Collingwood",
        actualSuburb: "Melbourne",
        postcode: "3000",
        category: "invalid_suburb",
    },
    {
        id: "chapel_windsor",
        input: "789 Chapel Street, Windsor VIC 3181",
        expected: "SHOULD_FAIL",
        reason: "Chapel Street in Windsor area should be Windsor postcode 3181, but Chapel Street proper is Prahran",
        category: "invalid_suburb",
    },
    {
        id: "smith_street_fitzroy_north",
        input: "400 Smith Street, Fitzroy North VIC 3068",
        expected: "SHOULD_FAIL",
        reason: "Smith Street 400s are in Fitzroy (3065), not Fitzroy North",
        actualSuburb: "Fitzroy",
        postcode: "3065",
        category: "invalid_suburb",
    },
    // === CROSS-CITY SUBURB CONFUSION ===
    {
        id: "high_street_kew_armadale",
        input: "123 High Street, Armadale VIC 3143",
        expected: "SHOULD_FAIL",
        reason: "High Street 123 would be in different suburb - High Street spans many suburbs",
        category: "invalid_suburb",
    },
    {
        id: "station_street_box_hill_fairfield",
        input: "456 Station Street, Fairfield VIC 3078",
        expected: "SHOULD_FAIL",
        reason: "Station Street exists in multiple suburbs but 456 wouldn't be in Fairfield",
        category: "invalid_suburb",
    },
    {
        id: "church_street_brighton_richmond",
        input: "321 Church Street, Brighton VIC 3186",
        expected: "SHOULD_FAIL",
        reason: "Church Street 321 would be in Richmond area, not Brighton",
        actualSuburb: "Richmond",
        postcode: "3121",
        category: "invalid_suburb",
    },
    // === SYDNEY CROSS-VALIDATION ===
    {
        id: "george_street_melbourne",
        input: "789 George Street, Melbourne VIC 3000",
        expected: "SHOULD_FAIL",
        reason: "George Street is Sydney's main street, not Melbourne's",
        category: "invalid_street",
    },
    {
        id: "pitt_street_melbourne",
        input: "234 Pitt Street, Melbourne VIC 3000",
        expected: "SHOULD_FAIL",
        reason: "Pitt Street is a major Sydney street, not Melbourne",
        category: "invalid_street",
    },
    {
        id: "collins_street_sydney",
        input: "567 Collins Street, Sydney NSW 2000",
        expected: "SHOULD_FAIL",
        reason: "Collins Street is Melbourne's street, not Sydney's",
        category: "invalid_street",
    },
    // === NON-EXISTENT STREETS ===
    {
        id: "fake_street_melbourne",
        input: "123 Fake Street, Melbourne VIC 3000",
        expected: "SHOULD_FAIL",
        reason: "Fake Street doesn't exist",
        category: "invalid_street",
    },
    {
        id: "nonexistent_avenue_richmond",
        input: "456 Imaginary Avenue, Richmond VIC 3121",
        expected: "SHOULD_FAIL",
        reason: "Imaginary Avenue doesn't exist",
        category: "invalid_street",
    },
    {
        id: "test_street_anywhere",
        input: "789 Test Street, Camberwell VIC 3124",
        expected: "SHOULD_FAIL",
        reason: "Test Street is not a real street name",
        category: "invalid_street",
    },
    // === POSTCODE MISMATCHES ===
    {
        id: "melbourne_wrong_postcode_3141",
        input: "100 Collins Street, Melbourne VIC 3141",
        expected: "SHOULD_FAIL",
        reason: "Melbourne CBD is 3000, not 3141 (South Yarra)",
        category: "invalid_suburb",
    },
    {
        id: "richmond_wrong_postcode_3000",
        input: "200 Church Street, Richmond VIC 3000",
        expected: "SHOULD_FAIL",
        reason: "Richmond is 3121, not 3000 (Melbourne CBD)",
        category: "invalid_suburb",
    },
    {
        id: "prahran_wrong_postcode_3182",
        input: "300 Chapel Street, Prahran VIC 3182",
        expected: "SHOULD_FAIL",
        reason: "Prahran is 3181, not 3182 (St Kilda)",
        category: "invalid_suburb",
    },
    {
        id: "fitzroy_wrong_postcode_3121",
        input: "400 Brunswick Street, Fitzroy VIC 3121",
        expected: "SHOULD_FAIL",
        reason: "Fitzroy is 3065, not 3121 (Richmond)",
        category: "invalid_suburb",
    },
    // === TRANSCRIPTION ERROR SCENARIOS ===
    {
        id: "canterbury_camberwell_confusion",
        input: "45 High Street, Camberwell VIC 3124", // Wrong postcode for Camberwell
        expected: "SHOULD_FAIL",
        reason: "Postcode 3124 is Canterbury, not Camberwell (3124)",
        category: "transcription_error",
        transcriptionVariations: [
            "45 High Street, Canterbury VIC 3124", // Likely correct
            "45 High Street, Camberwell VIC 3124", // Correct suburb/postcode combo
        ],
    },
    {
        id: "street_vs_road_confusion",
        input: "25 Smith Road, Richmond VIC 3121",
        expected: "BORDERLINE",
        reason: "Common transcription: 'Street' vs 'Road' confusion",
        category: "transcription_error",
        transcriptionVariations: [
            "25 Smith Street, Richmond VIC 3121",
            "25 Smith Drive, Richmond VIC 3121",
        ],
    },
    {
        id: "number_transcription_error",
        input: "80 Chapel Street, Prahran VIC 3181", // 18 transcribed as 80
        expected: "BORDERLINE",
        reason: "Common voice transcription error: 18 heard as 80",
        category: "transcription_error",
        transcriptionVariations: [
            "18 Chapel Street, Prahran VIC 3181", // Likely intended
            "8 Chapel Street, Prahran VIC 3181", // Alternative mishearing
        ],
    },
    {
        id: "avenue_vs_ave_transcription",
        input: "123 Park Av, South Yarra VIC 3141", // Abbreviated incorrectly
        expected: "BORDERLINE",
        reason: "Voice transcription often mangles Avenue/Ave",
        category: "transcription_error",
        transcriptionVariations: [
            "123 Park Avenue, South Yarra VIC 3141",
            "123 Park Ave, South Yarra VIC 3141",
        ],
    },
    // === VALID ADDRESSES (Control Group) ===
    {
        id: "chaucer_canterbury_correct",
        input: "18A Chaucer Crescent, Canterbury VIC 3124",
        expected: "SHOULD_PASS",
        reason: "Chaucer Crescent is correctly in Canterbury with correct postcode",
        category: "valid_address",
    },
    {
        id: "collins_melbourne_correct",
        input: "123 Collins Street, Melbourne VIC 3000",
        expected: "SHOULD_PASS",
        reason: "Collins Street is a major street in Melbourne CBD",
        category: "valid_address",
    },
    {
        id: "chapel_prahran_correct",
        input: "300 Chapel Street, Prahran VIC 3181",
        expected: "SHOULD_PASS",
        reason: "Chapel Street runs through Prahran with correct postcode",
        category: "valid_address",
    },
    {
        id: "church_richmond_correct",
        input: "234 Church Street, Richmond VIC 3121",
        expected: "SHOULD_PASS",
        reason: "Church Street is a major Richmond street",
        category: "valid_address",
    },
    {
        id: "brunswick_fitzroy_correct",
        input: "456 Brunswick Street, Fitzroy VIC 3065",
        expected: "SHOULD_PASS",
        reason: "Brunswick Street is Fitzroy's main street",
        category: "valid_address",
    },
    {
        id: "smith_collingwood_correct",
        input: "234 Smith Street, Collingwood VIC 3066",
        expected: "SHOULD_PASS",
        reason: "Smith Street runs through Collingwood",
        category: "valid_address",
    },
    {
        id: "high_kew_correct",
        input: "567 High Street, Kew VIC 3101",
        expected: "SHOULD_PASS",
        reason: "High Street is a major Kew thoroughfare",
        category: "valid_address",
    },
    {
        id: "toorak_road_correct",
        input: "123 Toorak Road, Toorak VIC 3142",
        expected: "SHOULD_PASS",
        reason: "Toorak Road in Toorak is correct",
        category: "valid_address",
    },
    // === BORDERLINE CASES ===
    {
        id: "chapel_south_yarra_border",
        input: "600 Chapel Street, South Yarra VIC 3141",
        expected: "BORDERLINE",
        reason: "Chapel Street does run through South Yarra, but exact numbers may vary",
        category: "borderline",
    },
    {
        id: "boundary_road_multi_suburb",
        input: "1 Boundary Road, Canterbury VIC 3124",
        expected: "BORDERLINE",
        reason: "Boundary roads often span multiple postcodes/suburbs",
        category: "borderline",
    },
    {
        id: "high_street_spanning",
        input: "999 High Street, Northcote VIC 3070",
        expected: "BORDERLINE",
        reason: "High Street spans many suburbs, exact numbering unclear",
        category: "borderline",
    },
    {
        id: "station_street_generic",
        input: "12 Station Street, Preston VIC 3072",
        expected: "BORDERLINE",
        reason: "Station Street exists in many suburbs near train stations",
        category: "borderline",
    },
    // === RURAL/REGIONAL ADDRESSES ===
    {
        id: "princes_highway_pakenham",
        input: "1234 Princes Highway, Pakenham VIC 3810",
        expected: "SHOULD_PASS",
        reason: "Princes Highway does run through Pakenham",
        category: "valid_address",
    },
    {
        id: "collins_street_pakenham_invalid",
        input: "999 Collins Street, Pakenham VIC 3810",
        expected: "SHOULD_FAIL",
        reason: "Collins Street is not in Pakenham",
        category: "invalid_street",
    },
    {
        id: "hume_highway_craigieburn",
        input: "2000 Hume Highway, Craigieburn VIC 3064",
        expected: "SHOULD_PASS",
        reason: "Hume Highway runs through Craigieburn",
        category: "valid_address",
    },
    {
        id: "melbourne_street_ballarat_invalid",
        input: "456 Collins Street, Ballarat VIC 3350",
        expected: "SHOULD_FAIL",
        reason: "Collins Street is Melbourne-specific, not in Ballarat",
        category: "invalid_street",
    },
    // === UNIT/APARTMENT SCENARIOS ===
    {
        id: "unit_valid_format",
        input: "Unit 5/123 Collins Street, Melbourne VIC 3000",
        expected: "SHOULD_PASS",
        reason: "Valid unit format on known street",
        category: "valid_address",
    },
    {
        id: "apartment_invalid_suburb",
        input: "Apt 12/456 Collins Street, Richmond VIC 3121",
        expected: "SHOULD_FAIL",
        reason: "Collins Street is not in Richmond",
        category: "invalid_suburb",
    },
    {
        id: "level_transcription_error",
        input: "Level 3/789 Chapel Street, St Kilda VIC 3182",
        expected: "SHOULD_FAIL",
        reason: "Chapel Street is not in St Kilda",
        category: "invalid_suburb",
    },
    // === SHOPPING CENTER / LANDMARK CONFUSION ===
    {
        id: "chadstone_address_invalid",
        input: "123 Chadstone Shopping Centre, Malvern VIC 3144",
        expected: "SHOULD_FAIL",
        reason: "Chadstone is in Chadstone/Malvern East, not Malvern",
        category: "invalid_suburb",
    },
    {
        id: "melbourne_central_invalid",
        input: "456 Melbourne Central, Richmond VIC 3121",
        expected: "SHOULD_FAIL",
        reason: "Melbourne Central is in Melbourne CBD, not Richmond",
        category: "invalid_suburb",
    },
    // === COMMON VOICE RECOGNITION ERRORS ===
    {
        id: "forty_vs_fourteen",
        input: "40 Collins Street, Melbourne VIC 3000", // "fourteen" misheard as "forty"
        expected: "SHOULD_PASS", // Both could be valid
        reason: "Control case - both 14 and 40 Collins could exist",
        category: "transcription_error",
        transcriptionVariations: ["14 Collins Street, Melbourne VIC 3000"],
    },
    {
        id: "fifty_vs_fifteen",
        input: "50 Chapel Street, Prahran VIC 3181", // "fifteen" misheard as "fifty"
        expected: "SHOULD_PASS",
        reason: "Control case - both 15 and 50 Chapel could exist",
        category: "transcription_error",
        transcriptionVariations: ["15 Chapel Street, Prahran VIC 3181"],
    },
];
// Common transcription error patterns for voice input
export const transcriptionErrorPatterns = [
    // === MELBOURNE SUBURB CONFUSION (High Priority) ===
    {
        correct: "Canterbury",
        commonErrors: [
            "Camberwell",
            "Cantabury",
            "Cantebury",
            "Canterbury",
            "Canbury",
            "Kanterbury",
        ],
        similarity: "high",
        frequency: "very_high", // This is THE critical error case
    },
    {
        correct: "Camberwell",
        commonErrors: [
            "Canterbury",
            "Campbell",
            "Camber well",
            "Camberwell",
            "Kamberwll",
            "Camberwell",
        ],
        similarity: "high",
        frequency: "very_high",
    },
    {
        correct: "Prahran",
        commonErrors: ["Prahan", "Praran", "Praha", "Pran", "Prahan", "Prahan"],
        similarity: "high",
        frequency: "high",
    },
    {
        correct: "South Yarra",
        commonErrors: [
            "Southyarra",
            "South Yara",
            "South Yera",
            "South Yoora",
            "South Yarra",
        ],
        similarity: "medium",
        frequency: "high",
    },
    {
        correct: "Richmond",
        commonErrors: ["Richmont", "Rich mont", "Richmund", "Richmond"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Fitzroy",
        commonErrors: ["Fitsroy", "Fitzroy", "Fits Roy", "Fitroy"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Collingwood",
        commonErrors: ["Collinwood", "Colingwood", "Colling wood", "Kolingwood"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "St Kilda",
        commonErrors: [
            "Saint Kilda",
            "St Kilda",
            "St Kilda",
            "Snt Kilda",
            "St Killda",
        ],
        similarity: "high",
        frequency: "high",
    },
    {
        correct: "Northcote",
        commonErrors: ["North Cote", "Northcot", "North coat", "Northcoat"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Hawthorn",
        commonErrors: ["Hawthorne", "Haw thorn", "Hawthorn", "Hawthawn"],
        similarity: "medium",
        frequency: "medium",
    },
    // === STREET TYPE CONFUSION (Very Common) ===
    {
        correct: "Street",
        commonErrors: ["St", "Steet", "street", "Streat", "Strt"],
        similarity: "high",
        frequency: "very_high",
    },
    {
        correct: "Crescent",
        commonErrors: [
            "Cres",
            "Cresent",
            "crescant",
            "cresant",
            "Crescent",
            "Cresant",
        ],
        similarity: "high",
        frequency: "very_high",
    },
    {
        correct: "Avenue",
        commonErrors: ["Ave", "Av", "avenue", "Avenew", "avenu", "Avnue"],
        similarity: "high",
        frequency: "very_high",
    },
    {
        correct: "Road",
        commonErrors: ["Rd", "road", "Rode", "rowd", "Raod"],
        similarity: "medium",
        frequency: "high",
    },
    {
        correct: "Drive",
        commonErrors: ["Dr", "drive", "Drv", "draiv", "Driv"],
        similarity: "medium",
        frequency: "high",
    },
    {
        correct: "Court",
        commonErrors: ["Ct", "court", "cout", "cort", "Kort"],
        similarity: "medium",
        frequency: "high",
    },
    {
        correct: "Place",
        commonErrors: ["Pl", "place", "plase", "plac", "Plase"],
        similarity: "medium",
        frequency: "high",
    },
    {
        correct: "Lane",
        commonErrors: ["Ln", "lane", "lain", "Lane", "Lan"],
        similarity: "low",
        frequency: "medium",
    },
    {
        correct: "Parade",
        commonErrors: ["Pde", "parade", "paraid", "Parede"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Terrace",
        commonErrors: ["Tce", "terrace", "Terace", "Terece"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Grove",
        commonErrors: ["grove", "Grov", "Groov"],
        similarity: "low",
        frequency: "low",
    },
    {
        correct: "Close",
        commonErrors: ["close", "Clos", "Cloes"],
        similarity: "low",
        frequency: "low",
    },
    // === NUMBER CONFUSION (Common Voice Recognition Issues) ===
    {
        correct: "18",
        commonErrors: ["80", "8", "18th", "eighteen", "eighty"],
        similarity: "low",
        frequency: "high",
    },
    {
        correct: "15",
        commonErrors: ["50", "5", "15th", "fifteen", "fifty"],
        similarity: "low",
        frequency: "high",
    },
    {
        correct: "14",
        commonErrors: ["40", "4", "14th", "fourteen", "forty"],
        similarity: "low",
        frequency: "high",
    },
    {
        correct: "13",
        commonErrors: ["30", "3", "13th", "thirteen", "thirty"],
        similarity: "low",
        frequency: "high",
    },
    {
        correct: "16",
        commonErrors: ["60", "6", "16th", "sixteen", "sixty"],
        similarity: "low",
        frequency: "medium",
    },
    {
        correct: "17",
        commonErrors: ["70", "7", "17th", "seventeen", "seventy"],
        similarity: "low",
        frequency: "medium",
    },
    {
        correct: "19",
        commonErrors: ["90", "9", "19th", "nineteen", "ninety"],
        similarity: "low",
        frequency: "medium",
    },
    // === POSTCODE CONFUSION (Melbourne Specific) ===
    {
        correct: "3124", // Canterbury
        commonErrors: ["3126", "3104", "3142", "three one two four", "3214"],
        similarity: "low",
        frequency: "very_high",
    },
    {
        correct: "3126", // Camberwell
        commonErrors: ["3124", "3106", "3146", "three one two six", "3216"],
        similarity: "low",
        frequency: "very_high",
    },
    {
        correct: "3121", // Richmond
        commonErrors: ["3128", "3101", "3141", "three one two one", "3211"],
        similarity: "low",
        frequency: "high",
    },
    {
        correct: "3181", // Prahran
        commonErrors: ["3182", "3180", "3108", "three one eight one", "3118"],
        similarity: "low",
        frequency: "high",
    },
    {
        correct: "3000", // Melbourne CBD
        commonErrors: [
            "3001",
            "3002",
            "three thousand",
            "three zero zero zero",
            "300",
        ],
        similarity: "low",
        frequency: "medium",
    },
    {
        correct: "3141", // South Yarra
        commonErrors: ["3140", "3142", "three one four one", "3114"],
        similarity: "low",
        frequency: "medium",
    },
    {
        correct: "3065", // Fitzroy
        commonErrors: ["3066", "3064", "three zero six five", "3056"],
        similarity: "low",
        frequency: "medium",
    },
    // === UNIT/APARTMENT CONFUSION ===
    {
        correct: "Unit",
        commonErrors: ["Unit", "Ut", "u", "apartment", "apt"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Apartment",
        commonErrors: ["Apt", "apartment", "appartment", "unit"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Level",
        commonErrors: ["Lvl", "level", "Lv", "floor"],
        similarity: "medium",
        frequency: "medium",
    },
    // === STATE ABBREVIATION CONFUSION ===
    {
        correct: "VIC",
        commonErrors: ["Victoria", "Vic", "vic", "V-I-C"],
        similarity: "high",
        frequency: "high",
    },
    {
        correct: "Victoria",
        commonErrors: ["VIC", "victoria", "Viktoria"],
        similarity: "high",
        frequency: "medium",
    },
    {
        correct: "NSW",
        commonErrors: ["New South Wales", "nsw", "N-S-W"],
        similarity: "high",
        frequency: "low", // Less relevant for Melbourne addresses
    },
    // === COMMON WORD CONFUSION ===
    {
        correct: "A", // As in "18A"
        commonErrors: ["Ay", "Eh", "a", "Alpha"],
        similarity: "medium",
        frequency: "high",
    },
    {
        correct: "the",
        commonErrors: ["da", "thee", "tha"],
        similarity: "medium",
        frequency: "low",
    },
    // === PHONETIC SIMILARITY ERRORS ===
    {
        correct: "Chapel",
        commonErrors: ["Chappel", "chapel", "Chapell"],
        similarity: "high",
        frequency: "medium",
    },
    {
        correct: "Collins",
        commonErrors: ["Colins", "collins", "Kolins"],
        similarity: "high",
        frequency: "medium",
    },
    {
        correct: "Church",
        commonErrors: ["church", "Chuch", "Churh"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "High",
        commonErrors: ["hi", "hig", "Hie"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Smith",
        commonErrors: ["smith", "Smyth", "Smythe"],
        similarity: "medium",
        frequency: "medium",
    },
    {
        correct: "Brunswick",
        commonErrors: ["brunswick", "Brunswik", "Brunwick"],
        similarity: "medium",
        frequency: "medium",
    },
];
// Generate variations of an address with common transcription errors
export function generateTranscriptionVariations(address) {
    const variations = [];
    for (const pattern of transcriptionErrorPatterns) {
        for (const error of pattern.commonErrors) {
            if (address.includes(pattern.correct)) {
                variations.push(address.replace(pattern.correct, error));
            }
        }
    }
    return [...new Set(variations)]; // Remove duplicates
}
// Test case categories for organized testing
export const testCategories = {
    invalid_suburb: validationTestCases.filter((t) => t.category === "invalid_suburb"),
    invalid_street: validationTestCases.filter((t) => t.category === "invalid_street"),
    transcription_error: validationTestCases.filter((t) => t.category === "transcription_error"),
    borderline: validationTestCases.filter((t) => t.category === "borderline"),
    valid_address: validationTestCases.filter((t) => t.category === "valid_address"),
};
