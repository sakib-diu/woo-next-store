// Mirrors WooCommerce's server-side `WC_Validation::is_postcode()` / `is_gb_postcode()`
// (plugins/woocommerce/includes/class-wc-validation.php) so the checkout form can reject an
// invalid postcode before submitting, instead of round-tripping to the Store API to find out.
// Countries not listed here fall through to WooCommerce's own permissive default (any postcode
// of just letters/digits/spaces/hyphens is accepted).

function isGbPostcode(toCheck: string): boolean {
    const alpha1 = "[abcdefghijklmnoprstuwyz]";
    const alpha2 = "[abcdefghklmnopqrstuvwxy]";
    const alpha3 = "[abcdefghjkpstuw]";
    const alpha4 = "[abehmnprvwxy]";
    const alpha5 = "[abdefghjlnpqrstuwxyz]";

    const patterns = [
        new RegExp(`^(${alpha1}{1}${alpha2}{0,1}[0-9]{1,2})([0-9]{1}${alpha5}{2})$`),
        new RegExp(`^(${alpha1}{1}[0-9]{1}${alpha3}{1})([0-9]{1}${alpha5}{2})$`),
        new RegExp(`^(${alpha1}{1}${alpha2}[0-9]{1}${alpha4})([0-9]{1}${alpha5}{2})$`),
        /^(gir)(0aa)$/,
        /^(bfpo)([0-9]{1,4})$/,
        /^(bfpo)(c\/o[0-9]{1,3})$/,
    ];

    const postcode = toCheck.toLowerCase().replace(/\s/g, "");
    return patterns.some((pattern) => pattern.test(postcode));
}

export function isValidPostcodeForCountry(postcode: string, country: string): boolean {
    if (!postcode) return false;
    // WooCommerce rejects anything containing a character other than letters/digits/space/hyphen
    // outright, regardless of country.
    if (/[^\sA-Za-z0-9-]/.test(postcode)) return false;

    switch (country) {
        case "AT":
        case "BE":
        case "CH":
        case "HU":
        case "NO":
            return /^[0-9]{4}$/.test(postcode);
        case "BA":
            return /^[7-8][0-9]{4}$/.test(postcode);
        case "BR":
            return /^[0-9]{5}-?[0-9]{3}$/.test(postcode);
        case "DE":
            return /^(0[1-9]|[1-9][0-9])[0-9]{3}$/.test(postcode);
        case "DK":
            return /^(DK-)?([1-24-9]\d{3}|3[0-8]\d{2})$/.test(postcode);
        case "ES":
        case "FI":
        case "EE":
        case "FR":
        case "IT":
            return /^[0-9]{5}$/i.test(postcode);
        case "GB":
            return isGbPostcode(postcode);
        case "IE":
            return /[AC-FHKNPRTV-Y]\d{2}|D6W[0-9AC-FHKNPRTV-Y]{4}/.test(postcode.toUpperCase().replace(/\s/g, ""));
        case "IN":
            return /^[1-9][0-9]{2}\s?[0-9]{3}$/.test(postcode);
        case "JP":
            return /^[0-9]{3}-?[0-9]{4}$/.test(postcode);
        case "PT":
            return /^[0-9]{4}-[0-9]{3}$/.test(postcode);
        case "PR":
        case "US":
            return /^[0-9]{5}(-[0-9]{4})?$/i.test(postcode);
        case "CA":
            return /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ]\s?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i.test(postcode);
        case "PL":
            return /^[0-9]{2}-[0-9]{3}$/.test(postcode);
        case "CZ":
        case "SE":
        case "SK":
            return new RegExp(`^(${country}-)?[0-9]{3}\\s?[0-9]{2}$`).test(postcode);
        case "NL":
            return /^[1-9][0-9]{3}\s?(?!SA|SD|SS)[A-Z]{2}$/i.test(postcode);
        case "SI":
            return /^[1-9][0-9]{3}$/.test(postcode);
        case "LI":
            return /^94[8-9][0-9]$/.test(postcode);
        case "LV":
            return /^(?:LV[- ]?)?[1-9][0-9]{3}$/i.test(postcode);
        default:
            return true;
    }
}
