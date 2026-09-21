"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import 'katex/dist/katex.min.css';
import { InlineMath } from "react-katex";
import LayoutWrapper from "../../components/LayoutWrapper";

const COLOR_MODES = [
    { id: "mod", label: "Mod" },
    { id: "valuation", label: "Prime Valuation" },
    { id: "signed_log", label: "Signed Log" },
    { id: "row_signed_log", label: "Row Signed Log" },
    { id: "small_values", label: "Small Values" },
    { id: "zero_windows", label: "Zero Windows" },

];

const FIRST_100_PRIMES = [
    2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
    31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
    73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
    127, 131, 137, 139, 149, 151, 157, 163, 167, 173,
    179, 181, 191, 193, 197, 199, 211, 223, 227, 229,
    233, 239, 241, 251, 257, 263, 269, 271, 277, 281,
    283, 293, 307, 311, 313, 317, 331, 337, 347, 349,
    353, 359, 367, 373, 379, 383, 389, 397, 401, 409,
    419, 421, 431, 433, 439, 443, 449, 457, 461, 463,
    467, 479, 487, 491, 499, 503, 509, 521, 523, 541,
];

const DEFAULT_MODULUS = 2;

const CUSTOM_SEQUENCE_ID = "custom-sequence";

const CUSTOM_INPUT_MODES = {
    SEQUENCE: "sequence",
    FUNCTION: "function",
};

const CUSTOM_FUNCTION_TERM_COUNT = 100;

const CUSTOM_FUNCTION_NAMES = new Set([
    "abs",
    "floor",
    "ceil",
    "round",
    "sqrt",
    "cbrt",
    "pow",
    "log",
    "exp",
    "sin",
    "cos",
    "tan",
    "min",
    "max",
]);

const CUSTOM_ALLOWED_IDENTIFIERS = new Set([
    "n",
    "pi",
    "e",
    ...CUSTOM_FUNCTION_NAMES,
]);

const CUSTOM_FUNCTION_LIBRARY = Object.freeze({
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    pow: Math.pow,
    log: Math.log,
    exp: Math.exp,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    min: Math.min,
    max: Math.max,
    pi: Math.PI,
    e: Math.E,
});

function stripFunctionPrefix(rawExpression) {
    return String(rawExpression)
        .trim()
        .replace(/^([A-Za-z_][A-Za-z0-9_]*\s*\(\s*n\s*\)|[A-Za-z_][A-Za-z0-9_]*)\s*=/, "");
}

function isNumberToken(token) {
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token);
}

function isIdentifierToken(token) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(token);
}

function isValueEndToken(token) {
    return token === "n" || token === "pi" || token === "e" || token === ")" || isNumberToken(token);
}

function isValueStartToken(token) {
    return (
        token === "n" ||
        token === "pi" ||
        token === "e" ||
        token === "(" ||
        isNumberToken(token) ||
        CUSTOM_FUNCTION_NAMES.has(token)
    );
}

function tokenizeCustomFunction(rawExpression) {
    const normalized = stripFunctionPrefix(rawExpression)
        .replaceAll("π", "pi")
        .replaceAll("−", "-")
        .replace(/\s+/g, "")
        .replace(/\^/g, "**");

    if (!normalized) {
        throw new Error("Enter a function of n.");
    }

    const tokenPattern = /(?:\d+(?:\.\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|\*\*|[()+\-*/%,])/g;
    const tokens = normalized.match(tokenPattern) ?? [];

    if (tokens.join("") !== normalized) {
        throw new Error("Only numbers, n, +, -, *, /, ^, %, parentheses, commas, and supported functions are allowed.");
    }

    for (const token of tokens) {
        if (isIdentifierToken(token) && !CUSTOM_ALLOWED_IDENTIFIERS.has(token)) {
            throw new Error(`Unsupported symbol "${token}". Use n, pi, e, or functions like floor, sqrt, sin, cos.`);
        }
    }

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];

        if (CUSTOM_FUNCTION_NAMES.has(token) && tokens[i + 1] !== "(") {
            throw new Error(`Use ${token}(...) with parentheses.`);
        }
    }

    return tokens;
}

function normalizeCustomFunctionExpression(rawExpression) {
    const tokens = tokenizeCustomFunction(rawExpression);
    const expandedTokens = [];

    for (let i = 0; i < tokens.length; i += 1) {
        const previous = tokens[i - 1];
        const current = tokens[i];

        if (i > 0 && isValueEndToken(previous) && isValueStartToken(current)) {
            expandedTokens.push("*");
        }

        if (current === "n") {
            expandedTokens.push("n");
        } else if (current === "pi" || current === "e") {
            expandedTokens.push(`M.${current}`);
        } else if (CUSTOM_FUNCTION_NAMES.has(current)) {
            expandedTokens.push(`M.${current}`);
        } else {
            expandedTokens.push(current);
        }
    }

    return expandedTokens.join("");
}


function customFunctionToLatex(rawExpression) {
    let text = stripFunctionPrefix(rawExpression)
        .trim()
        .replaceAll("π", "pi");

    if (!text) {
        return "";
    }

    // Common supported functions.
    text = text
        .replace(/\bpi\b/g, "\\pi")
        .replace(/\bsqrt\(([^()]*)\)/g, "\\sqrt{$1}")
        .replace(/\bfloor\(([^()]*)\)/g, "\\left\\lfloor $1 \\right\\rfloor")
        .replace(/\bceil\(([^()]*)\)/g, "\\left\\lceil $1 \\right\\rceil")
        .replace(/\babs\(([^()]*)\)/g, "\\left| $1 \\right|");

    // Simple powers such as n^2, n^10, (n+1)^2.
    text = text
        .replace(/([A-Za-z0-9]+)\^([A-Za-z0-9]+)/g, "$1^{$2}")
        .replace(/(\([^()]+\))\^([A-Za-z0-9]+)/g, "$1^{$2}");

    // Convert a simple final division into a fraction:
    // n(n+1)/2 -> \frac{n(n+1)}{2}
    const slashIndex = text.lastIndexOf("/");

    if (slashIndex > 0 && slashIndex < text.length - 1) {
        const numerator = text.slice(0, slashIndex).trim();
        const denominator = text.slice(slashIndex + 1).trim();

        if (
            numerator &&
            denominator &&
            !denominator.includes("/")
        ) {
            text = `\\frac{${numerator}}{${denominator}}`;
        }
    }

    text = text.replace(/\*/g, "\\cdot ");

    return text;
}

function buildSequenceFromCustomFunction(rawExpression, count) {
    const jsExpression = normalizeCustomFunctionExpression(rawExpression);
    const evaluator = new Function("n", "M", `"use strict"; return (${jsExpression});`);

    return Array.from({ length: count }, (_, n) => {
        const value = evaluator(n, CUSTOM_FUNCTION_LIBRARY);

        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error(`The function did not produce a finite number at n=${n}.`);
        }

        const roundedValue = Math.round(value);

        if (Math.abs(value - roundedValue) > 1e-9) {
            throw new Error(`The function produced a non-integer at n=${n}: ${value}. Number walls require integer terms.`);
        }

        if (!Number.isSafeInteger(roundedValue)) {
            throw new Error(`The function produced a value too large at n=${n}: ${value}.`);
        }

        return String(Object.is(roundedValue, -0) ? 0 : roundedValue);
    });
}

function isPrimeNumber(value) {
    if (value < 2) {
        return false;
    }

    for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
        if (value % divisor === 0) {
            return false;
        }
    }

    return true;
}

function customBareissDet(matrix) {
    const n = matrix.length;

    if (n === 0) {
        return 1n;
    }

    if (n === 1) {
        return matrix[0][0];
    }

    const a = matrix.map((row) => row.slice());
    let sign = 1n;
    let previousPivot = 1n;

    for (let k = 0; k < n - 1; k += 1) {
        if (a[k][k] === 0n) {
            let swapRow = null;

            for (let r = k + 1; r < n; r += 1) {
                if (a[r][k] !== 0n) {
                    swapRow = r;
                    break;
                }
            }

            if (swapRow === null) {
                return 0n;
            }

            const temp = a[k];
            a[k] = a[swapRow];
            a[swapRow] = temp;
            sign *= -1n;
        }

        const pivot = a[k][k];

        for (let i = k + 1; i < n; i += 1) {
            for (let j = k + 1; j < n; j += 1) {
                a[i][j] = (a[i][j] * pivot - a[i][k] * a[k][j]) / previousPivot;
            }
        }

        previousPivot = pivot;

        for (let i = k + 1; i < n; i += 1) {
            a[i][k] = 0n;
        }

        for (let j = k + 1; j < n; j += 1) {
            a[k][j] = 0n;
        }
    }

    return sign * a[n - 1][n - 1];
}

function customWallEntry(sequence, row, col) {
    if (row === -1) {
        return "1";
    }

    if (row === 0) {
        if (0 <= col && col < sequence.length) {
            return String(sequence[col]);
        }

        return null;
    }

    const leftNeeded = col - row;
    const rightNeeded = col + row;

    if (leftNeeded < 0 || rightNeeded >= sequence.length) {
        return null;
    }

    const matrix = [];

    for (let i = 0; i < row + 1; i += 1) {
        const matrixRow = [];

        for (let j = 0; j < row + 1; j += 1) {
            matrixRow.push(BigInt(sequence[col + i - j]));
        }

        matrix.push(matrixRow);
    }

    return String(customBareissDet(matrix));
}

function buildCustomWallData(customSequenceValues, options = {}) {
    const {
        title = "Custom Sequence",
        emptyDescription = "Enter up to 100 sequence entries. Each square can contain a whole number.",
        filledDescription = null,
    } = options;

    const trimmedValues = customSequenceValues.map((value) => String(value).trim());

    let usedLength = 0;

    for (let i = 0; i < trimmedValues.length; i += 1) {
        if (trimmedValues[i] === "" || trimmedValues[i] === "-") {
            break;
        }

        usedLength += 1;
    }

    const sequence = trimmedValues
        .slice(0, usedLength)
        .map((value) => value);

    const visibleWidth = 100;
    const visibleDepth = sequence.length > 0
        ? Math.max(1, Math.min(50, Math.floor((sequence.length - 1) / 2)))
        : 1;

    const rows = [];

    for (let rowNumber = -1; rowNumber <= visibleDepth; rowNumber += 1) {
        const values = [];

        for (let col = 0; col < visibleWidth; col += 1) {
            values.push(customWallEntry(sequence, rowNumber, col));
        }

        rows.push({
            row: rowNumber,
            values,
        });
    }

    return {
        id: CUSTOM_SEQUENCE_ID,
        title,
        category: "custom",
        kind: "terms",
        description: sequence.length === 0
            ? emptyDescription
            : filledDescription || `Custom number wall built from ${sequence.length} entered term${sequence.length === 1 ? "" : "s"}.`,
        visibleWidth,
        visibleDepth,
        sequence: sequence.map((value) => String(value)),
        rows,
    };
}

function sanitizeSequenceCellValue(value) {
    const text = String(value);

    if (text === "") {
        return "";
    }

    if (text === "-") {
        return "-";
    }

    const cleaned = text.replace(/[^0-9-]/g, "");

    if (cleaned.startsWith("-")) {
        return `-${cleaned.slice(1).replace(/-/g, "")}`;
    }

    return cleaned.replace(/-/g, "");
}

function getContiguousCustomLength(customSequenceValues) {
    let usedLength = 0;

    for (let i = 0; i < customSequenceValues.length; i += 1) {
        const text = String(customSequenceValues[i] || "").trim();

        if (text === "" || text === "-") {
            break;
        }

        usedLength += 1;
    }

    return usedLength;
}


function isMissing(value) {
    return value === null || value === undefined;
}

function normalizeIntegerString(value) {
    if (isMissing(value)) {
        return "";
    }

    let text = String(value);

    if (text.startsWith("+")) {
        text = text.slice(1);
    }

    return text;
}

function signOf(value) {
    const text = normalizeIntegerString(value);

    if (text === "" || text === "0") {
        return 0;
    }

    if (text.startsWith("-")) {
        return -1;
    }

    return 1;
}

function absString(value) {
    let text = normalizeIntegerString(value);

    if (text.startsWith("-")) {
        text = text.slice(1);
    }

    text = text.replace(/^0+/, "");

    if (text === "") {
        return "0";
    }

    return text;
}

function approximateLog10Abs(value) {
    const absolute = absString(value);

    if (absolute === "0") {
        return 0;
    }

    const prefixLength = Math.min(15, absolute.length);
    const prefix = absolute.slice(0, prefixLength);
    const prefixNumber = Number(prefix);

    return absolute.length - prefixLength + Math.log10(prefixNumber);
}

function shortenValue(value, maxLength = 4) {
    if (isMissing(value)) {
        return "";
    }

    const text = String(value);

    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, maxLength - 1) + "…";
}

function hexToRgb(hexColor) {
    const clean = hexColor.replace("#", "");

    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
    };
}

function rgbToHex(r, g, b) {
    const rr = Math.round(r).toString(16).padStart(2, "0");
    const gg = Math.round(g).toString(16).padStart(2, "0");
    const bb = Math.round(b).toString(16).padStart(2, "0");

    return `#${rr}${gg}${bb}`;
}

function blendColors(hexA, hexB, t) {
    const clamped = Math.max(0, Math.min(1, t));
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);

    return rgbToHex(
        a.r + (b.r - a.r) * clamped,
        a.g + (b.g - a.g) * clamped,
        a.b + (b.b - a.b) * clamped
    );
}

function textColorForBackground(hexColor) {
    const { r, g, b } = hexToRgb(hexColor);
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    if (brightness >= 160) {
        return "#111111";
    }

    return "#ffffff";
}

function isCyanLikeBackground(color) {
    if (!color || !color.startsWith("#")) {
        return false;
    }

    const { r, g, b } = hexToRgb(color);

    return g >= 120 && b >= 120 && g > r * 1.2 && b > r * 1.2;
}

function safeBigInt(value) {
    if (isMissing(value)) {
        return null;
    }

    return BigInt(String(value));
}

function positiveModulo(value, modulus) {
    const bigValue = safeBigInt(value);
    const bigModulus = BigInt(modulus);

    if (bigValue === null) {
        return 0;
    }

    const residue = ((bigValue % bigModulus) + bigModulus) % bigModulus;

    return Number(residue);
}

function valuation(value, prime) {
    if (isMissing(value)) {
        return 0;
    }

    let bigValue = safeBigInt(value);

    if (bigValue === 0n) {
        return 0;
    }

    if (bigValue < 0n) {
        bigValue = -bigValue;
    }

    const bigPrime = BigInt(prime);
    let count = 0;

    while (bigValue % bigPrime === 0n) {
        count += 1;
        bigValue = bigValue / bigPrime;
    }

    return count;
}

function collectAllValues(wallData) {
    if (!wallData || !wallData.rows) {
        return [];
    }

    const values = [];

    wallData.rows.forEach((row) => {
        row.values.forEach((value) => {
            if (!isMissing(value)) {
                values.push(value);
            }
        });
    });

    return values;
}

function computeGlobalLogScale(wallData) {
    const values = collectAllValues(wallData);
    let maxLog = 1;

    values.forEach((value) => {
        if (String(value) !== "0") {
            maxLog = Math.max(maxLog, approximateLog10Abs(value));
        }
    });

    return maxLog;
}

function computeRowLogScales(wallData) {
    const scales = {};

    if (!wallData || !wallData.rows) {
        return scales;
    }

    wallData.rows.forEach((row) => {
        let maxLog = 1;

        row.values.forEach((value) => {
            if (!isMissing(value) && String(value) !== "0") {
                maxLog = Math.max(maxLog, approximateLog10Abs(value));
            }
        });

        scales[row.row] = maxLog;
    });

    return scales;
}

function computeValuationScale(wallData, prime) {
    const values = collectAllValues(wallData);
    let maxValuation = 1;

    values.forEach((value) => {
        if (String(value) !== "0") {
            maxValuation = Math.max(maxValuation, valuation(value, prime));
        }
    });

    return maxValuation;
}

function signedLogColor(value, scale) {
    if (isMissing(value)) {
        return { background: "#0d0d0d", color: "#333333" };
    }

    if (String(value) === "0") {
        return { background: "#f4f4f4", color: "#111111" };
    }

    const sign = signOf(value);
    const amount = approximateLog10Abs(value) / Math.max(scale, 1);
    const clamped = Math.max(0, Math.min(1, amount));

    let background;

    if (sign > 0) {
        background = blendColors("#0b1220", "#4cc9f0", clamped);
    } else {
        background = blendColors("#200b0b", "#ff6b6b", clamped);
    }

    return {
        background,
        color: textColorForBackground(background),
    };
}

function cellColor(value, rowNumber, colorMode, scales, prime, modulus) {
    if (isMissing(value)) {
        return { background: "#0d0d0d", color: "#333333" };
    }

    const text = String(value);

    if (colorMode === "signed_log") {
        return signedLogColor(value, scales.globalLog);
    }

    if (colorMode === "row_signed_log") {
        return signedLogColor(value, scales.rowLogs[rowNumber] || scales.globalLog);
    }

    if (colorMode === "small_values") {
        const smallPalette = {
            "-2": { background: "#7a0019", color: "#ffffff" },
            "-1": { background: "#ff3b3b", color: "#ffffff" },
            "0": { background: "#f4f4f4", color: "#111111" },
            "1": { background: "#2f80ed", color: "#ffffff" },
            "2": { background: "#56ccf2", color: "#111111" },
        };

        if (smallPalette[text]) {
            return smallPalette[text];
        }

        return signedLogColor(value, scales.globalLog);
    }

    if (colorMode === "zero_windows") {
        if (text === "0") {
            return { background: "#f4f4f4", color: "#111111" };
        }

        return { background: "#070707", color: "#333333" };
    }

    if (colorMode === "valuation") {
        if (text === "0") {
            return { background: "#f4f4f4", color: "#111111" };
        }

        const v = valuation(value, prime);
        const amount = v / Math.max(scales.valuation, 1);
        const background = blendColors("#111111", "#ffd166", amount);

        return {
            background,
            color: textColorForBackground(background),
        };
    }

    if (colorMode === "mod") {
        const residue = positiveModulo(value, modulus);
        const hue = Math.round((360 * residue) / modulus);

        return {
            background: `hsl(${hue}, 78%, 58%)`,
            color: residue <= 2 ? "#111111" : "#ffffff",
        };
    }

    return signedLogColor(value, scales.globalLog);
}

export default function NumberWallsPage() {
    const wallFrameRef = useRef(null);
    const sequenceSidebarRef = useRef(null);

    const [indexItems, setIndexItems] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [wallData, setWallData] = useState(null);
    const [colorMode, setColorMode] = useState("mod");
    const [prime, setPrime] = useState(2);
    const [modulus, setModulus] = useState(DEFAULT_MODULUS);
    const [isModMenuOpen, setIsModMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [customSequenceValues, setCustomSequenceValues] = useState(
    Array.from({ length: 100 }, () => "")
);
    const [customInputMode, setCustomInputMode] = useState(CUSTOM_INPUT_MODES.SEQUENCE);
    const [customFunctionText, setCustomFunctionText] = useState("n(n+1)/2");
    const customFunctionState = useMemo(() => {
    if (customInputMode !== CUSTOM_INPUT_MODES.FUNCTION) {
        return {
            sequence: [],
            error: "",
        };
    }

    try {
        return {
            sequence: buildSequenceFromCustomFunction(customFunctionText, CUSTOM_FUNCTION_TERM_COUNT),
            error: "",
        };
    } catch (error) {
        return {
            sequence: [],
            error: error instanceof Error ? error.message : "Invalid function.",
        };
    }
}, [customInputMode, customFunctionText]);

    useEffect(() => {
        async function loadIndex() {
            const response = await fetch(`/number-walls/data/index.json?time=${Date.now()}`, {
    cache: "no-store",
});
            const items = await response.json();

            setIndexItems(items);

            if (items.length > 0) {
                setSelectedId(items[0].id);
            }
        }

        loadIndex();
    }, []);

    useEffect(() => {
        async function loadWall() {
            if (!selectedId || indexItems.length === 0) {
                return;
            }

            if (selectedId === CUSTOM_SEQUENCE_ID) {
    if (customInputMode === CUSTOM_INPUT_MODES.FUNCTION) {
        setWallData(buildCustomWallData(customFunctionState.sequence, {
            title: "Custom Function",
            emptyDescription: customFunctionState.error
                ? `Function error: ${customFunctionState.error}`
                : "Enter a function a(n) to generate the first 100 terms.",
            filledDescription: `a(n) = ${customFunctionText}. Generated for n = 0 through ${CUSTOM_FUNCTION_TERM_COUNT - 1}.`,
        }));
    } else {
        setWallData(buildCustomWallData(customSequenceValues, {
            title: "Custom Sequence",
            emptyDescription: "Enter up to 100 sequence entries. Each square can contain a whole number.",
        }));
    }

    setLoading(false);
    return;
}

            setLoading(true);

            const item = indexItems.find((entry) => entry.id === selectedId);

            if (!item) {
                setLoading(false);
                return;
            }

            const response = await fetch(`/number-walls/data/${item.filename}?time=${Date.now()}`, {
    cache: "no-store",
});
            const data = await response.json();

            setWallData(data);
            setLoading(false);
        }

        loadWall();
    }, [selectedId, indexItems, customSequenceValues, customInputMode, customFunctionText, customFunctionState]);

    const scales = useMemo(() => {
        return {
            globalLog: computeGlobalLogScale(wallData),
            rowLogs: computeRowLogScales(wallData),
            valuation: computeValuationScale(wallData, prime),
        };
    }, [wallData, prime]);

    useEffect(() => {
        const fitWallFrameToViewport = () => {
            const frame = wallFrameRef.current;

            if (!frame) {
                return;
            }

            const rect = frame.getBoundingClientRect();
            const bottomGap = 10;
            const availableHeight = Math.max(
                120,
                window.innerHeight - rect.top - bottomGap
            );

            frame.style.maxHeight = `${availableHeight}px`;
        };

        const animationFrame =
            window.requestAnimationFrame(fitWallFrameToViewport);

        window.addEventListener(
            "resize",
            fitWallFrameToViewport
        );

        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.removeEventListener(
                "resize",
                fitWallFrameToViewport
            );
        };
    }, [selectedId, customInputMode, wallData, loading]);

    useEffect(() => {
        const fitSequenceSidebarToViewport = () => {
            const sidebar = sequenceSidebarRef.current;

            if (!sidebar) {
                return;
            }

            const rect = sidebar.getBoundingClientRect();
            const bottomGap = 10;

            const availableHeight = Math.max(
                120,
                window.innerHeight - rect.top - bottomGap
            );

            sidebar.style.maxHeight = `${availableHeight}px`;
        };

        const animationFrame =
            window.requestAnimationFrame(
                fitSequenceSidebarToViewport
            );

        window.addEventListener(
            "resize",
            fitSequenceSidebarToViewport
        );

        return () => {
            window.cancelAnimationFrame(animationFrame);

            window.removeEventListener(
                "resize",
                fitSequenceSidebarToViewport
            );
        };
    }, []);

    const famousSequences = indexItems.filter(
        (item) => item.category === "famous-sequences"
    );

    return (
        <LayoutWrapper>
        <main className="number-walls-page">
            <style>{`
                .number-walls-page {
                    min-height: 100vh;
                    background: #101010;
                    color: #eeeeee;
                    font-family: Menlo, Monaco, Consolas, monospace;
                    padding: 12px 24px;
                    box-sizing: border-box;
                }

                .number-walls-title {
                    margin: 0 0 8px 0;
                    font-size: 30px;
                    font-weight: 500;
                }

                .number-walls-intro {
    max-width: none;
    margin: 0 0 14px 0;
    color: #bbbbbb;
    font-size: var(--intro-font-size);
    line-height: 1.45;
}

.number-walls-inline-title {
    color: #eeeeee;
    font-size: 16px;
    font-weight: 500;
}

                .number-walls-layout {
                    display: grid;
                    grid-template-columns: 200px minmax(0, 1fr);
                    column-gap: 20px;
                    align-items: start;
                }

                .number-walls-sidebar {
                    background: #171717;
                    border: 1px solid #303030;
                    padding: 14px;
                    box-sizing: border-box;
                    max-height: none;
                    overflow-y: auto;
                }

                .sidebar-heading {
                    margin: 14px 0 8px 0;
                    color: #ffd166;
                    font-size: 14px;
                    font-weight: 700;
                }

                .sidebar-heading:first-child {
                    margin-top: 0;
                }

                .sequence-button {
                    display: block;
                    width: 100%;
                    margin: 0 0 6px 0;
                    padding: 8px 9px;
                    background: #222222;
                    color: #eeeeee;
                    border: 1px solid #444444;
                    text-align: left;
                    font-family: Menlo, Monaco, Consolas, monospace;
                    font-size: 13px;
                    cursor: pointer;
                }

                .sequence-button:hover {
                    background: #303030;
                }

                .sequence-button.active {
                    background: #334b5f;
                    border-color: #75c7ff;
                    color: #ffffff;
                }

                .number-walls-main {
                    min-width: 0;
                }

                .control-panel {
    background: #171717;
    border: 1px solid #303030;
    padding: 10px 14px;
    margin-bottom: 10px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
}

.control-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 0;
}

.build-own-control-group {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
}

.build-own-control-label {
    color: #ffd166;
    font-size: var(--sidebar-heading-font-size);
    font-weight: 700;
    white-space: nowrap;
}

.build-own-control-button {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 7px 14px;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
    white-space: nowrap;
}

.build-own-control-button:hover {
    background: #303030;
}

.build-own-control-button.active {
    background: #334b5f;
    border-color: #75c7ff;
    color: #ffffff;
}

.control-label {
    display: inline-block;
    color: #aaaaaa;
    font-size: var(--control-font-size);
    white-space: nowrap;
}

.control-select {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 6px 8px;
    font-size: var(--control-font-size);
}

.mod-dropdown {
    position: relative;
    display: inline-block;
}

.mod-dropdown-button {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 0;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
    width: 45px;
    height: 30px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.mod-dropdown-button:hover {
    background: #303030;
}

.mod-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 50;
    width: 45px;
    max-height: 260px;
    overflow-y: auto;
    background: #171717;
    border: 1px solid #555555;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
}

.mod-dropdown-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 5px 0;
    background: #222222;
    color: #eeeeee;
    border: none;
    text-align: center;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
    box-sizing: border-box;
}

.mod-dropdown-option:hover {
    background: #303030;
}

.prime-modulus-option {
    background: #ffd166;
    color: #111111;
    font-weight: 700;
}

.prime-modulus-option:hover {
    background: #ffdf7a;
}

                .wall-title {
                    margin: 0 0 4px 0;
                    font-size: 22px;
                    font-weight: 500;
                }

                .wall-description {
                    margin: 0 0 8px 0;
                    color: #bbbbbb;
                    font-size: 13px;
                    line-height: 1.45;
                }

                .wall-frame {
                    overflow: auto;
                    width: 100%;
                    max-width: 100%;
                    max-height: none;
                    border: 1px solid #303030;
                    background: #080808;
                }

                .wall-table {
                    border-collapse: collapse;
                }

                .row-label {
                    position: sticky;
                    left: 0;
                    z-index: 2;
                    min-width: 50px;
                    height: 28px;
                    text-align: right;
                    padding-right: 8px;
                    color: #aaaaaa;
                    background: #181818;
                    border: 1px solid #2b2b2b;
                    font-size: 13px;
                }

                .wall-cell {
                    width: 28px;
                    min-width: 28px;
                    height: 28px;
                    border: 1px solid #2b2b2b;
                    text-align: center;
                    vertical-align: middle;
                    padding: 0;
                    font-size: 10px;
                    line-height: 1.05;
                    font-weight: 700;
                    overflow: hidden;
                }

                .cell-inner {
                    width: 100%;
                    height: 100%;
                    display: table;
                }

                .cell-text {
                    display: table-cell;
                    vertical-align: middle;
                    text-align: center;
                }

                .empty-note {
                    color: #888888;
                    font-size: 13px;
                    line-height: 1.5;
                }
                
                .number-walls-page,
.number-walls-page button,
.number-walls-page select,
.number-walls-page option {
    font-family: "Times New Roman", Times, serif;
}

.number-walls-page {
    --title-font-size: 16px;
    --intro-font-size: 13px;
    --sidebar-heading-font-size: 14px;
    --button-font-size: 13px;
    --control-font-size: 14px;
    --wall-title-font-size: 18px;
    --description-font-size: 14px;
    --row-label-font-size: 13px;
    --cell-font-size: 10px;
    --empty-note-font-size: 13px;
}

.number-walls-title {
    font-size: var(--title-font-size);
}

.number-walls-intro {
    font-size: var(--intro-font-size);
}

.sidebar-heading {
    font-size: var(--sidebar-heading-font-size);
}

.sequence-button {
    font-size: var(--button-font-size);
}

.control-label,
.control-select {
    font-size: var(--control-font-size);
}

.wall-title {
    font-size: var(--wall-title-font-size);
}

.wall-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 6px 0;
}

.wall-title-row .wall-title {
    margin: 0;
}

.custom-function-title-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    color: #bbbbbb;
    font-size: var(--description-font-size);
    white-space: nowrap;
}

.custom-function-title-current {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.custom-function-title-current .katex {
    font-size: 1.05em;
}

.custom-function-title-examples {
    margin-left: auto;
    color: #aaaaaa;
    white-space: nowrap;
}

.custom-function-title-examples .katex {
    font-size: 1em;
}

.clear-custom-sequence-button {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 3px 10px;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
}

.clear-custom-sequence-button:hover {
    background: #303030;
    border-color: #75c7ff;
}

.custom-input-panel {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 12px 0;
    padding: 10px;
    background: #171717;
    border: 1px solid #303030;
    box-sizing: border-box;
}

.custom-mode-toggle {
    display: flex;
    gap: 6px;
}

.custom-mode-button {
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 4px 10px;
    font-size: var(--control-font-size);
    font-family: "Times New Roman", Times, serif;
    cursor: pointer;
}

.custom-mode-button:hover {
    background: #303030;
}

.custom-mode-button.active {
    background: #334b5f;
    border-color: #75c7ff;
}

.custom-function-label {
    color: #aaaaaa;
    font-size: var(--control-font-size);
}

.custom-function-label .katex {
    font-size: 1.05em;
}

.custom-function-input {
    width: 260px;
    background: #222222;
    color: #eeeeee;
    border: 1px solid #555555;
    padding: 5px 8px;
    font-size: 16px;
    font-family: "KaTeX_Math", "KaTeX_Main", serif;
    font-style: normal;
    font-weight: normal;
    line-height: 1.2;
}

.custom-function-error {
    color: #ff8f8f;
    font-size: var(--control-font-size);
}

.custom-function-help {
    color: #aaaaaa;
    font-size: 13px;
}

.wall-description {
    font-size: var(--description-font-size);
}

.row-label {
    font-size: var(--row-label-font-size);
}

.wall-cell {
    font-size: var(--cell-font-size);
}

.empty-note {
    font-size: var(--empty-note-font-size);
}

.menu-scroll-box {
    background: #171717;
    border: 1px solid #303030;
    padding: 8px;
    box-sizing: border-box;
    overflow-y: auto;
    margin-bottom: 14px;
}

.custom-sequence-button {
    margin-top: 0;
    margin-bottom: 14px;
}

.wall-cell-input {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    padding: 0;
    margin: 0;
    background: transparent;
    color: inherit;
    text-align: center;
    font-family: "Times New Roman", Times, serif;
    font-size: var(--cell-font-size);
    font-weight: 700;
    line-height: 1;
    box-sizing: border-box;
}

.wall-cell-input:focus {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 0 0 1px #75c7ff;
}

            `}</style>

            <p className="number-walls-intro">
                <span className="number-walls-inline-title">Number Walls:</span>{" "}
                Select a sequence or enter a custom sequence, then choose a coloring mode.
                The entry row contains up to 100 terms. Prime valuation colors each square
                by how many times the selected prime divides the wall entry.
            </p>

            <div className="number-walls-layout">
                <aside
                    ref={sequenceSidebarRef}
                    className="number-walls-sidebar"
                >
    <div className="sidebar-heading">Famous Sequences</div>

<div className="famous-sequences-list">
    {famousSequences.map((item) => (
        <button
            key={item.id}
            className={selectedId === item.id ? "sequence-button active" : "sequence-button"}
            onClick={() => setSelectedId(item.id)}
        >
            {item.title}
        </button>
    ))}
</div>

</aside>

                <section className="number-walls-main">
                    <div className="control-panel">
                        <div className="control-row">
                            <span className="control-label">Color mode</span>
                            <select
                                className="control-select"
                                value={colorMode}
                                onChange={(event) => setColorMode(event.target.value)}
                            >
                                {COLOR_MODES.map((mode) => (
                                    <option key={mode.id} value={mode.id}>
                                        {mode.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {colorMode === "valuation" && (
                            <div className="control-row">
                                <span className="control-label">Prime</span>
                                <select
                                    className="control-select"
                                    value={prime}
                                    onChange={(event) => setPrime(Number(event.target.value))}
                                >
                                    {FIRST_100_PRIMES.map((p) => (
    <option key={p} value={p}>
        {p}
    </option>
))}
                                </select>
                            </div>
                        )}

                        {colorMode === "mod" && (
    <div className="control-row">
        <span className="control-label">Modulus</span>

        <div className="mod-dropdown">
            <button
                type="button"
                className="mod-dropdown-button"
                onClick={() => setIsModMenuOpen(!isModMenuOpen)}
            >
                {modulus}
            </button>

            {isModMenuOpen && (
                <div className="mod-dropdown-menu">
                    {Array.from({ length: 98 }, (_, index) => index + 2).map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={
                                isPrimeNumber(m)
                                    ? "mod-dropdown-option prime-modulus-option"
                                    : "mod-dropdown-option"
                            }
                            onClick={() => {
                                setModulus(m);
                                setIsModMenuOpen(false);
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </div>
)}

                        <div className="build-own-control-group">
                            <span className="build-own-control-label">
                                Build Your Own
                            </span>

                            <button
                                type="button"
                                className={
                                    selectedId === CUSTOM_SEQUENCE_ID
                                        ? "build-own-control-button active"
                                        : "build-own-control-button"
                                }
                                onClick={() => setSelectedId(CUSTOM_SEQUENCE_ID)}
                            >
                                Sequence / Function
                            </button>
                        </div>
                    </div>

                    {loading || !wallData ? (
                        <p className="empty-note">Loading number wall...</p>
                    ) : (
                        <>
                            <div className="wall-title-row">
    <h2 className="wall-title">{wallData.title}</h2>

    {selectedId === CUSTOM_SEQUENCE_ID && (
        <button
            type="button"
            className="clear-custom-sequence-button"
            onClick={() => {
                if (customInputMode === CUSTOM_INPUT_MODES.FUNCTION) {
    setCustomFunctionText("n(n+1)/2");
    return;
}

setCustomSequenceValues(Array.from({ length: 100 }, () => ""));

setTimeout(() => {
    const firstCell = document.getElementById("custom-sequence-cell-0");

    if (firstCell) {
        firstCell.focus();
    }
}, 0);
            }}
        >
            {customInputMode === CUSTOM_INPUT_MODES.FUNCTION ? "Reset" : "Clear"}
        </button>
    )}

    {selectedId === CUSTOM_SEQUENCE_ID &&
        customInputMode === CUSTOM_INPUT_MODES.FUNCTION && (
            <div className="custom-function-title-meta">
                {!customFunctionState.error && (
                    <span className="custom-function-title-current">
                        <InlineMath
                            math={`a(n)=${customFunctionToLatex(customFunctionText)}`}
                        />
                        <span>
                            Generated for
                        </span>
                        <InlineMath math={"n=0"} />
                        <span>through</span>
                        <InlineMath
                            math={String(CUSTOM_FUNCTION_TERM_COUNT - 1)}
                        />
                        <span>.</span>
                    </span>
                )}

                <span className="custom-function-title-examples">
                    Examples:{" "}
                    <InlineMath math={"\\frac{n(n+1)}{2}"} />
                    {", "}
                    <InlineMath math={"n^2"} />
                    {", "}
                    <InlineMath math={"2n+1"} />
                    {", "}
                    <InlineMath
                        math={"\\left\\lfloor n/2 \\right\\rfloor"}
                    />
                </span>
            </div>
        )}
</div>

                            {!(
                                selectedId === CUSTOM_SEQUENCE_ID &&
                                customInputMode === CUSTOM_INPUT_MODES.FUNCTION
                            ) && (
                                <p className="wall-description">
                                    {wallData.description}
                                </p>
                            )}
                            {selectedId === CUSTOM_SEQUENCE_ID && (
    <div className="custom-input-panel">
        <div className="custom-mode-toggle">
            <button
                type="button"
                className={
                    customInputMode === CUSTOM_INPUT_MODES.SEQUENCE
                        ? "custom-mode-button active"
                        : "custom-mode-button"
                }
                onClick={() => setCustomInputMode(CUSTOM_INPUT_MODES.SEQUENCE)}
            >
                Sequence
            </button>

            <button
                type="button"
                className={
                    customInputMode === CUSTOM_INPUT_MODES.FUNCTION
                        ? "custom-mode-button active"
                        : "custom-mode-button"
                }
                onClick={() => setCustomInputMode(CUSTOM_INPUT_MODES.FUNCTION)}
            >
                Function
            </button>
        </div>

        {customInputMode === CUSTOM_INPUT_MODES.FUNCTION && (
            <>
                <label className="custom-function-label" htmlFor="custom-function-input">
                    <InlineMath math={"a(n)="} />
                </label>

                <input
                    id="custom-function-input"
                    className="custom-function-input"
                    type="text"
                    value={customFunctionText}
                    onChange={(event) => setCustomFunctionText(event.target.value)}
                    placeholder="n(n+1)/2"
                />

                {customFunctionState.error && (
                    <span className="custom-function-error">
                        {customFunctionState.error}
                    </span>
                )}
            </>
        )}
    </div>
)}

                            <div
                                ref={wallFrameRef}
                                className="wall-frame"
                            >
                                <table className="wall-table">
                                    <tbody>
                                        {wallData.rows.map((row) => (
                                            <tr key={row.row}>
                                                <td className="row-label">{row.row}</td>

                                                {row.values.map((value, index) => {
    const isCustomSequenceMode =
    selectedId === CUSTOM_SEQUENCE_ID &&
    customInputMode === CUSTOM_INPUT_MODES.SEQUENCE;

const isCustomFunctionMode =
    selectedId === CUSTOM_SEQUENCE_ID &&
    customInputMode === CUSTOM_INPUT_MODES.FUNCTION;

const isCustomEntryCell = isCustomSequenceMode && row.row === 0;
const customUsedLength = getContiguousCustomLength(customSequenceValues);

const displayValue =
    selectedId === CUSTOM_SEQUENCE_ID && row.row === 0
        ? (
            isCustomFunctionMode
                ? value
                : (index <= customUsedLength ? customSequenceValues[index] : "")
        )
    : value;

let colors = cellColor(
    displayValue,
    row.row,
    colorMode,
    scales,
    prime,
    modulus
);

if (
    isCustomSequenceMode &&
    row.row === 0 &&
    String(displayValue || "").trim() === ""
) {
    colors = {
        background: "#3a0909",
        color: "#ffffff",
    };
}

    return (
        <td
            key={`${row.row}-${index}`}
            className="wall-cell"
            style={{
                background: colors.background,
                color: isCyanLikeBackground(colors.background) ? "#ffffff" : colors.color,
                textShadow: isCyanLikeBackground(colors.background) ? "0 0 2px #000000" : "none",
            }}
            title={isMissing(displayValue) ? "" : String(displayValue)}
        >
            <div className="cell-inner">
                {isCustomEntryCell ? (
                    <input
                        id={`custom-sequence-cell-${index}`}
                        className="wall-cell-input"
                        value={displayValue || ""}
                        onChange={(event) => {
                            const nextValue = sanitizeSequenceCellValue(event.target.value);

                            setCustomSequenceValues((previous) => {
                                const updated = [...previous];
                                updated[index] = nextValue;
                                return updated;
                            });
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "ArrowRight" || event.key === "Enter") {
                                event.preventDefault();
                                const next = document.getElementById(`custom-sequence-cell-${index + 1}`);

                                if (next) {
                                    next.focus();
                                }
                            }

                            if (event.key === "ArrowLeft") {
                                event.preventDefault();
                                const previous = document.getElementById(`custom-sequence-cell-${index - 1}`);

                                if (previous) {
                                    previous.focus();
                                }
                            }
                        }}
                    />
                ) : (
                    <span className="cell-text">
                        {shortenValue(value)}
                    </span>
                )}
            </div>
        </td>
    );
})}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            </div>
                </main>
    </LayoutWrapper>
    );
}