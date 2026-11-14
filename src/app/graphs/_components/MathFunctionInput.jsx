'use client';

import { cloneElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Use the same mathematical-italic variable convention
// as the MathLive equation field. Only variable glyphs
// receive this styling; surrounding UI text is unchanged.
const mathVariableStyle = {
  fontFamily:
    "'KaTeX_Math', 'Latin Modern Math', " +
    "'STIX Two Math', 'Times New Roman', serif",
  fontStyle: 'italic',
  fontWeight: 400
};

export function MathVariableLabel({ text }) {
  return (
    <>
      {String(text).split(/(z)/g).map((part, index) =>
        part === 'z' ? (
          <span key={index} style={mathVariableStyle}>
            z
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

import { inlineDivisionLatex } from '@/lib/math-function-input-parser';

// Function-library labels use the same MathLive typesetting
// engine as the main equation input. They are display-only;
// the surrounding button retains its original insertion action.
function LibraryFormula({ label, value }) {
  const hostRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let field = null;

    import('mathlive').then(({ MathfieldElement }) => {
      if (cancelled || !hostRef.current) return;

      field = new MathfieldElement();
      field.readOnly = true;
      field.mathVirtualKeyboardPolicy = 'manual';
      field.tabIndex = -1;

      // Templates contain #0 for the editable argument.
      // Display z there, just as in the original button label.
      const displayLatex = label === 'B(z,1−z)'
        ? String.raw`B\left(z,1-z\right)`
        : value.replaceAll('#0', 'z');

      field.value = displayLatex;

      field.style.cssText = [
        'display:inline-block',
        'width:auto',
        'max-width:100%',
        'min-width:0',
        'min-height:0',
        'height:auto',
        'margin:0',
        'padding:0',
        'border:0',
        'outline:0',
        'background:transparent',
        'color:inherit',
        'font-size:16px',
        'font-weight:400',
        'line-height:1',
        'vertical-align:middle',
        'pointer-events:none'
      ].join(';');

      hostRef.current.replaceChildren(field);
    }).catch(error => {
      if (!cancelled) {
        console.error(
          'Function-library typesetting unavailable:',
          error
        );
      }
    });

    return () => {
      cancelled = true;
      field?.remove();
    };
  }, [label, value]);

  return (
    <span
      ref={hostRef}
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
        pointerEvents: 'none'
      }}
    >
      <MathVariableLabel text={label} />
    </span>
  );
}

const KEY_GROUPS = [
  {
    title: 'Symbols & algebra',
    keys: [
      ['π', '\\pi'],
      ['+', '+'],
      ['−', '-'],
      ['×', '\\cdot '],
      ['÷', '\\mathbin{/}'],
      ['^', '^{#0}'],
      ['√', '\\sqrt{#0}'],
    ]
  },
  {
    title: 'Elementary functions',
    keys: [
      ['sin(z)', '\\sin\\left(#0\\right)'],
      ['cos(z)', '\\cos\\left(#0\\right)'],
      ['sinh(z)', '\\sinh\\left(#0\\right)'],
      ['cosh(z)', '\\cosh\\left(#0\\right)'],
      ['exp(z)', '\\exp\\left(#0\\right)'],
      ['log(z)', '\\log\\left(#0\\right)'],
    ]
  },
  {
    title: 'Special functions',
    keys: [
      ['Γ(z)', '\\Gamma\\left(#0\\right)'],
      ['Γ(1+z)Γ(1−z)', '\\Gamma\\left(1+z\\right)\\,\\Gamma\\left(1-z\\right)'],
      ['Li₂(z)', '\\operatorname{Li}_{2}\\left(#0\\right)'],
      ['ζ(z)', '\\zeta\\left(#0\\right)'],
      ['B(z,1−z)', '\\operatorname{Beta}\\left(z,1-z\\right)'],
      ['ψ(z)', '\\psi\\left(#0\\right)'],
      ['erf(z)', '\\operatorname{erf}\\left(#0\\right)'],
      ['Ai(z)', '\\operatorname{Ai}\\left(#0\\right)'],
    ]
  },
  {
    title: 'Planck geometries',
    keys: [
      [
        'G₀(z)',
        String.raw`-\left(4\pi/4\right)\sinh^{2}\left(z/4\right)`
      ],
      [
        'G₁(z)',
        String.raw`-\left(\sinh\left(\sinh\left(z/7\right)\right)\right)^{-1}`
      ],
      [
        'G₂(z)',
        String.raw`-\left(5/\sqrt{7}\right)\left(3^{-1/3}/\left(2^{5/4}\sqrt{\pi}\exp\left(\pi/8\right)\right)\right)\Gamma^{2}\left(z/4\right)`
      ],
      [
        'G₃(z)',
        String.raw`2\left(5/\sqrt{7}\right)^{2}\cos^{2}\left(5iz/2\right)\cos^{2}\left(7z/5\right)`
      ],
      [
        'G₄(z)',
        String.raw`-5\left(4\pi/2\right)\cos^{2}\left(7z/5\right)`
      ]
    ]
  },

];


const FUNCTION_LIBRARY_TITLES = {
  'G₀(z)': 'Planck time geometry',
  'G₁(z)': 'Planck length geometry',
  'G₂(z)': 'Planck charge geometry',
  'G₃(z)': 'Planck temperature geometry',
  'G₄(z)': 'Planck mass geometry',
  'sin(z)': 'Sine function',
  'cos(z)': 'Cosine function',
  'sinh(z)': 'Hyperbolic sine function',
  'cosh(z)': 'Hyperbolic cosine function',
  'exp(z)': 'Exponential function',
  'log(z)': 'Logarithm',
  'Γ(z)': 'Euler gamma function',
  'Γ(1+z)Γ(1−z)': 'Euler gamma reflection product',
  'Li₂(z)': 'Dilogarithm',
  'ζ(z)': 'Riemann zeta function',
  'B(z,1−z)': 'Euler beta function',
  'ψ(z)': 'Digamma function',
  'erf(z)': 'Error function',
  'Ai(z)': 'Airy Ai function'
};

const MONASTERY_KEYS = {
  numbers: [
    [
      ['7','7'], ['8','8'], ['9','9'],
      ['÷',String.raw`\mathbin{/}`],
      ['(','('], [')',')'],
      ['x²','^{2}'], ['xⁿ','^{#0}'],
      ['√',String.raw`\sqrt{#0}`],
      ['z','z'], ['i','i'],
      ['π',String.raw`\pi`]
    ],
    [
      ['4','4'], ['5','5'], ['6','6'],
      ['×',String.raw`\cdot `],
      ['=','='],
      ['≤',String.raw`\le`],
      ['≥',String.raw`\ge`],
      ['≠',String.raw`\ne`],
      ['exp',String.raw`\exp\left(#0\right)`],
      ['ln',String.raw`\ln\left(#0\right)`],
      ['e','e'],
      ['∞',String.raw`\infty`]
    ],
    [
      ['1','1'], ['2','2'], ['3','3'], ['−','-'],
      ['sin',String.raw`\sin\left(#0\right)`],
      ['cos',String.raw`\cos\left(#0\right)`],
      ['sinh',String.raw`\sinh\left(#0\right)`],
      ['cosh',String.raw`\cosh\left(#0\right)`],
      ['Γ',String.raw`\Gamma\left(#0\right)`],
      ['ζ',String.raw`\zeta\left(#0\right)`],
      ['∑',String.raw`\sum`],
      ['∫',String.raw`\int`]
    ],
    [
      ['0','0'], ['.','.'], [',',','], ['+','+'],
      ['|z|',String.raw`\left|#0\right|`],
      ['∂',String.raw`\partial`],
      ['√π',String.raw`\sqrt{\pi}`],
      ['Li₂',String.raw`\operatorname{Li}_{2}\left(#0\right)`],
      ['←',null,'moveToPreviousChar'],
      ['→',null,'moveToNextChar'],
      ['⌫',null,'deleteBackward'],
      ['Enter',null,'commit']
    ]
  ],

  symbols: [
    [
      ['π',String.raw`\pi`],
      ['∞',String.raw`\infty`],
      ['∑',String.raw`\sum`],
      ['∏',String.raw`\prod`],
      ['∫',String.raw`\int`],
      ['∂',String.raw`\partial`],
      ['∇',String.raw`\nabla`],
      ['√',String.raw`\sqrt{#0}`],
      ['∛',String.raw`\sqrt[3]{#0}`],
      ['±',String.raw`\pm`],
      ['∓',String.raw`\mp`],
      ['°',String.raw`^{\circ}`]
    ],
    [
      ['≤',String.raw`\le`],
      ['≥',String.raw`\ge`],
      ['≠',String.raw`\ne`],
      ['≈',String.raw`\approx`],
      ['≡',String.raw`\equiv`],
      ['∈',String.raw`\in`],
      ['∉',String.raw`\notin`],
      ['⊂',String.raw`\subset`],
      ['⊆',String.raw`\subseteq`],
      ['∪',String.raw`\cup`],
      ['∩',String.raw`\cap`],
      ['∅',String.raw`\varnothing`]
    ],
    [
      ['→',String.raw`\to`],
      ['⇒',String.raw`\Rightarrow`],
      ['↔',String.raw`\leftrightarrow`],
      ['∀',String.raw`\forall`],
      ['∃',String.raw`\exists`],
      ['∧',String.raw`\land`],
      ['∨',String.raw`\lor`],
      ['¬',String.raw`\neg`],
      ['⊗',String.raw`\otimes`],
      ['⊕',String.raw`\oplus`],
      ['×',String.raw`\times`],
      ['·',String.raw`\cdot`]
    ]
  ],

  letters: [
    ...['qwertyuiop','asdfghjkl','zxcvbnm']
      .map(row => [...row].map(c => [c,c]))
  ],

  greek: [
    [
      ['α',String.raw`\alpha`],
      ['β',String.raw`\beta`],
      ['γ',String.raw`\gamma`],
      ['δ',String.raw`\delta`],
      ['ε',String.raw`\epsilon`],
      ['ζ',String.raw`\zeta`],
      ['η',String.raw`\eta`],
      ['θ',String.raw`\theta`],
      ['ι',String.raw`\iota`],
      ['κ',String.raw`\kappa`],
      ['λ',String.raw`\lambda`],
      ['μ',String.raw`\mu`]
    ],
    [
      ['ν',String.raw`\nu`],
      ['ξ',String.raw`\xi`],
      ['π',String.raw`\pi`],
      ['ρ',String.raw`\rho`],
      ['σ',String.raw`\sigma`],
      ['τ',String.raw`\tau`],
      ['υ',String.raw`\upsilon`],
      ['φ',String.raw`\phi`],
      ['χ',String.raw`\chi`],
      ['ψ',String.raw`\psi`],
      ['ω',String.raw`\omega`],
      ['ϕ',String.raw`\varphi`]
    ],
    [
      ['Γ',String.raw`\Gamma`],
      ['Δ',String.raw`\Delta`],
      ['Θ',String.raw`\Theta`],
      ['Λ',String.raw`\Lambda`],
      ['Ξ',String.raw`\Xi`],
      ['Π',String.raw`\Pi`],
      ['Σ',String.raw`\Sigma`],
      ['Φ',String.raw`\Phi`],
      ['Ψ',String.raw`\Psi`],
      ['Ω',String.raw`\Omega`],
      ['ϑ',String.raw`\vartheta`],
      ['ϱ',String.raw`\varrho`]
    ]
  ]
};

function canonicalLibraryExpression(value) {
  return String(value ?? '')
    .replace(/\\(?:left|right)\s*/g, '')
    .replace(/\\(?:,|;|!)/g, '')
    .replace(/\s+/g, '');
}

export default function MathFunctionInput({
  latex,
  onLatexChange,
  onFunctionSelect,
  lockControl = null
}) {
  const hostRef = useRef(null);
  const fieldRef = useRef(null);
  const changeRef = useRef(onLatexChange);
  const [ready, setReady] = useState(false);
  const toolbarButtonSize = 31;
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [monasteryOpen, setMonasteryOpen] = useState(false);
  const [monasteryTab, setMonasteryTab] = useState('numbers');
  const monasteryPanelRef = useRef(null);
  const monasteryTriggerRef = useRef(null);
  const libraryButtonRef = useRef(null);
  const libraryMenuRef = useRef(null);

  // Permanent vertical alignment, calibrated at -5px.
  // Applies to all typeset mathematical expressions.
  const [loadError, setLoadError] = useState('');

  changeRef.current = onLatexChange;


  useEffect(() => {
    if (!monasteryOpen) return undefined;

    const dismiss = event => {
      if (monasteryPanelRef.current?.contains(event.target)) return;
      if (monasteryTriggerRef.current?.contains(event.target)) return;
      setMonasteryOpen(false);
    };

    const escape = event => {
      if (event.key === 'Escape') setMonasteryOpen(false);
    };

    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);

    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [monasteryOpen]);

  const selectedLibraryValue = value =>
    !value.includes('#') &&
    canonicalLibraryExpression(latex) ===
      canonicalLibraryExpression(value);


  // Close the Function Library when clicking anywhere
  // outside its trigger and dropdown.
  useEffect(() => {
    if (!keyboardOpen) return undefined;

    const dismissOutside = event => {
      const target = event.target;

      if (libraryButtonRef.current?.contains(target)) return;
      if (libraryMenuRef.current?.contains(target)) return;

      setKeyboardOpen(false);
    };

    const dismissEscape = event => {
      if (event.key === 'Escape') {
        setKeyboardOpen(false);
      }
    };

    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);

    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [keyboardOpen]);

  // MathLive mounts its virtual keyboard outside the math field,
  // so apply the keyboard theme to the document body.
  useEffect(() => {
    document.body.classList.add('geometry-keyboard-dark');

    return () => {
      document.body.classList.remove('geometry-keyboard-dark');
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let field = null;

    async function initialize() {
      try {
        const { MathfieldElement } = await import('mathlive');
        if (cancelled || !hostRef.current) return;

        field = new MathfieldElement();
        field.className = 'geometry-mathfield';
        field.mathVirtualKeyboardPolicy = 'manual';
        field.smartFence = true;
        field.value = inlineDivisionLatex(latex);
        field.setAttribute('aria-label', 'Mathematical function');

        field.style.width = '100%';
        field.style.height = '43px';
        field.style.minHeight = '43px';
        field.style.boxSizing = 'border-box';
        field.style.background = '#0d1420';
        field.style.color = '#eff4fb';
        field.style.border = '1px solid #54677f';
        field.style.borderRadius = '7px';
        field.style.fontSize = '19px';
        field.style.padding = '6px 9px';
        field.style.paddingRight = '9px';

        field.addEventListener('input', () => {
          changeRef.current(field.value);
        });

        // Convert complete fractions after editing.
        // Never rewrite the field during an active selection.
        field.addEventListener('blur', () => {
          const compact = inlineDivisionLatex(field.value);

          if (compact !== field.value) {
            field.value = compact;
            changeRef.current(compact);
          }
        });

        field.addEventListener('keydown', event => {
          if (
            event.key === '/' &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            event.preventDefault();
            event.stopPropagation();

            field.insert(String.raw`\mathbin{/}`, {
              format: 'latex',
              selectionMode: 'after'
            });

            changeRef.current(field.value);
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            field.closest('form')?.requestSubmit();
          }
        }, true);

        hostRef.current.appendChild(field);
        fieldRef.current = field;
        setReady(true);
      } catch (error) {
        if (!cancelled) setLoadError(error.message);
      }
    }

    initialize();

    return () => {
      cancelled = true;
      if (fieldRef.current === field) fieldRef.current = null;
      field?.remove();
    };
  }, []);

  const insert = text => {
    const field = fieldRef.current;
    if (!field) return;

    field.focus();

    const argumentTemplate = String.raw`\left(#0\right)`;

    if (text.endsWith(argumentTemplate)) {
      // Step 1: insert the complete function with an
      // explicit, selected argument placeholder.
      const template = text.replace(
        argumentTemplate,
        String.raw`\left(#?\right)`
      );

      const inserted = field.insert(template, {
        insertionMode: 'replaceSelection',
        selectionMode: 'placeholder',
        format: 'latex'
      });

      if (!inserted) return;

      // Step 2: replace ONLY the selected placeholder
      // with a mathematically neutral thin space.
      //
      // MathLive leaves the caret immediately after
      // that space, still inside the parentheses.
      // No backward navigation, offset arithmetic,
      // or deletion is performed.
      field.insert(String.raw`\,`, {
        insertionMode: 'replaceSelection',
        selectionMode: 'after',
        format: 'latex'
      });
    } else {
      // Preserve ordinary symbols, powers, fractions,
      // roots, and the two-argument Beta expression.
      field.insert(text, {
        selectionMode: 'placeholder'
      });
    }

    changeRef.current(field.value);
  };

  const keyboardCommand = command => {
    const field = fieldRef.current;
    if (!field) return;

    field.focus();

    if (command === 'commit') {
      field.closest('form')?.requestSubmit();
    } else if (command === 'copy') {
      navigator.clipboard?.writeText(field.value).catch(
        error => console.error('Could not copy equation:', error)
      );
    } else {
      field.executeCommand(command);
      changeRef.current(field.value);
    }
  };

  return (
    <div>
      <style>{`

        .monastery-keyboard-key,
        .monastery-keyboard-tab,
        .monastery-keyboard-action {
          font-family: 'Times New Roman', Times, serif;
          color: #eff4fb;
          background: #1b3048;
          border: 1px solid #526b86;
          border-radius: 6px;
          cursor: pointer;
          box-sizing: border-box;
        }

        .monastery-keyboard-key {
          min-width: 0;
          height: 40px;
          padding: 0 3px;
          font-size: 16px;
        }

        .monastery-keyboard-tab,
        .monastery-keyboard-action {
          height: 35px;
          padding: 0 12px;
          background: #0d1420;
          font-size: 14px;
        }

        .monastery-keyboard-key:hover,
        .monastery-keyboard-tab:hover,
        .monastery-keyboard-action:hover {
          background: #304965;
        }

        .monastery-keyboard-tab.is-selected {
          border-color: #a6c8ed;
          color: #fff;
          font-weight: 700;
          background: linear-gradient(
            155deg,
            rgba(205,225,246,0.25) 0%,
            rgba(91,115,145,0.13) 42%,
            rgba(12,19,30,0.92) 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.22),
            0 0 7px rgba(155,195,235,0.12);
        }

        @media (max-width: 620px) {
          .monastery-keyboard-key {
            height: 36px;
            font-size: 13px;
          }
        }


        /* Dark Physics Monastery MathLive keyboard */
        body.geometry-keyboard-dark {
          --keyboard-background: #101318;
          --keyboard-border: 1px solid #465a70;
          --keyboard-accent-color: #86bfff;
          --keyboard-zindex: 10000;

          --keyboard-toolbar-background: #142030;
          --keyboard-toolbar-background-hover: #263c56;
          --keyboard-toolbar-background-selected: #315779;
          --keyboard-toolbar-text: #b8cbe1;
          --keyboard-toolbar-text-active: #ffffff;

          --keycap-background: #1b2a3e;
          --keycap-background-hover: #304965;
          --keycap-background-active: #385a80;
          --keycap-background-pressed: #486d96;
          --keycap-border: 1px solid #465a70;
          --keycap-border-bottom: 1px solid #33465c;
          --keycap-text: #eff4fb;
          --keycap-text-hover: #ffffff;
          --keycap-text-active: #ffffff;
          --keycap-text-pressed: #ffffff;

          --keycap-primary-background: #315779;
          --keycap-primary-background-hover: #416b92;
          --keycap-primary-text: #ffffff;

          --keycap-secondary-background: #273c55;
          --keycap-secondary-background-hover: #385572;
          --keycap-secondary-text: #e0eaf7;
          --keycap-secondary-border: 1px solid #526b86;
          --keycap-secondary-border-bottom: 1px solid #394e67;

          --keycap-shift-text: #a5bbd4;
          --keycap-shift-color: #a5bbd4;
          --box-placeholder-color: #76b4f5;

          --variant-panel-background: #142030;
          --variant-keycap-text: #eff4fb;
          --variant-keycap-text-active: #ffffff;
          --variant-keycap-background-active: #385a80;

          --keycap-height: 36px;
          --keycap-gap: 4px;
          --keycap-font-size: 20px;
          --keycap-small-font-size: 13px;
          --keycap-shift-font-size: 11px;
          --keycap-extra-small-font-size: 10px;
          --keyboard-toolbar-font-size: 16px;

          --keyboard-padding-horizontal: 12px;
          --keyboard-padding-top: 5px;
          --keyboard-padding-bottom: 5px;
          --keyboard-row-padding-left: 4px;
          --keyboard-row-padding-right: 4px;
        }

        math-field.geometry-mathfield {
          /* No white background around the active argument. */
          --contains-highlight-background-color: transparent;

          /* Keep genuine text selections visible, but dark. */
          --selection-background-color: #315779;
          --selection-color: #ffffff;

          /* Clearly visible insertion caret. */
          --caret-color: #86bfff;
          --smart-fence-color: #ffffff;
        }

        math-field.geometry-mathfield::part(content) {
          transform: translateY(-5px);
          white-space: nowrap;
        }

        math-field.geometry-mathfield::part(virtual-keyboard-toggle) {
          display: none;
        }

        math-field.geometry-mathfield::part(menu-toggle) {
          display: none;
        }
      `}</style>

    <div style={{
      position: 'relative',
      display: 'block',
      width: '100%',
      marginTop: 8
    }}>
      <div
        role="group"
        aria-label="Mathematical input and graph controls"
        style={{
          position: 'absolute',
          right: 0,
          top: -toolbarButtonSize - 4,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          width: 'max-content',
          margin: 0,
          zIndex: 3
        }}
      >
      <button
        type="button"
        ref={libraryButtonRef}
        aria-label="Function library"
        title="Function library"
        aria-expanded={keyboardOpen}
        disabled={!ready}
        onMouseDown={event => event.preventDefault()}
        onClick={() => setKeyboardOpen(value => !value)}
        style={{
          position: 'relative',
          width: toolbarButtonSize,
          height: toolbarButtonSize,
          zIndex: 2,
          border: keyboardOpen
            ? '1px solid #a6c8ed'
            : '1px solid #54677f',
          borderRadius: 6,
          background: keyboardOpen
            ? 'linear-gradient(155deg, rgba(205,225,246,0.25) 0%, rgba(91,115,145,0.13) 42%, rgba(12,19,30,0.92) 100%)'
            : '#0d1420',
          boxShadow: keyboardOpen
            ? 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(120,155,190,0.12), 0 0 7px rgba(155,195,235,0.12)'
            : 'none',
          color: '#e7f2ff',
          fontSize: toolbarButtonSize * 23 / 35,
          fontStyle: 'italic',
          fontFamily: "'Times New Roman', Times, serif",
          cursor: ready ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0
        }}
      >
        ƒ
      </button>

      <button
        type="button"
        aria-label="Full mathematical keyboard"
        title="Physics Monastery keyboard"
        ref={monasteryTriggerRef}
        aria-expanded={monasteryOpen}
        disabled={!ready}
        onMouseDown={event => event.preventDefault()}
        onClick={() => {
          const field = fieldRef.current;
          if (!field) return;
          field.focus();
          window.mathVirtualKeyboard?.hide?.();
          setKeyboardOpen(false);
          setMonasteryOpen(open => !open);
        }}
        style={{
          position: 'relative',
          width: toolbarButtonSize,
          height: toolbarButtonSize,
          zIndex: 2,
          border: '1px solid #54677f',
          borderRadius: 7,
          background: '#0d1420',
          color: '#eff4fb',
          fontSize: toolbarButtonSize * 20 / 35,
          cursor: ready ? 'pointer' : 'default',
          fontFamily: "'Times New Roman', Times, serif"
        }}
      >
        ⌨
      </button>

        {lockControl && cloneElement(lockControl, {
          style: {
            ...lockControl.props.style,
            width: toolbarButtonSize,
            height: toolbarButtonSize
          }
        })}
      </div>

      <div
        ref={hostRef}
        style={{ width: '100%', minWidth: 0 }}
      />



      {!ready && !loadError && (
        <span style={{ color: '#aabed4', fontSize: 13 }}>
          Initializing mathematics editor…
        </span>
      )}

      {loadError && (
        <span role="alert" style={{ color: '#ffc2c2' }}>
          Math editor unavailable: {loadError}
        </span>
      )}




      {monasteryOpen && createPortal(
        <div
          ref={monasteryPanelRef}
          role="group"
          aria-label="Physics Monastery mathematical keyboard"
          onMouseDown={event => event.preventDefault()}
          style={{
            position: 'fixed',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(1060px, calc(100vw - 28px))',
            maxHeight: 'calc(100dvh - 80px)',
            overflowY: 'auto',
            zIndex: 10001,
            padding: 12,
            boxSizing: 'border-box',
            background: 'rgba(16,26,43,0.97)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid #607c9a',
            borderRadius: 11,
            boxShadow: '0 18px 50px rgba(0,0,0,0.7)',
            color: '#eff4fb',
            fontFamily: "'Times New Roman', Times, serif"
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            marginBottom: 9,
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6
            }}>
              {[
                ['numbers','123'],
                ['symbols','∞≠∈'],
                ['letters','abc'],
                ['greek','αβγ']
              ].map(([id, title]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={monasteryTab === id}
                  className={
                    `monastery-keyboard-tab ${
                      monasteryTab === id ? 'is-selected' : ''
                    }`
                  }
                  onClick={() => setMonasteryTab(id)}
                >
                  {title}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {[
                ['Undo','undo'],
                ['Redo','redo'],
                ['Copy','copy']
              ].map(([title, command]) => (
                <button
                  key={command}
                  type="button"
                  title={title}
                  className="monastery-keyboard-action"
                  onClick={() => keyboardCommand(command)}
                >
                  {title}
                </button>
              ))}

              <button
                type="button"
                title="Close keyboard"
                aria-label="Close keyboard"
                className="monastery-keyboard-action"
                onClick={() => setMonasteryOpen(false)}
                style={{ fontSize: 22 }}
              >
                ×
              </button>
            </div>
          </div>

          {MONASTERY_KEYS[monasteryTab].map((row, rowIndex) => (
            <div
              key={`${monasteryTab}-${rowIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  `repeat(${row.length}, minmax(0, 1fr))`,
                gap: 5,
                marginTop: 5
              }}
            >
              {row.map(([label, value, command], index) => (
                <button
                  key={`${rowIndex}-${index}`}
                  type="button"
                  className="monastery-keyboard-key"
                  title={label}
                  onClick={() =>
                    command
                      ? keyboardCommand(command)
                      : insert(value)
                  }
                >
                  <MathVariableLabel text={label} />
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}

      {keyboardOpen && (
        <div
          role="group"
          ref={libraryMenuRef}
          aria-label="Function library keys"
          style={{
            position: 'absolute',
            top: 'calc(100% + 7px)',
            left: 0,
            right: 0,
            zIndex: 250,
            width: '100%',
            boxSizing: 'border-box',
            padding: 10,
            background: '#101a2b',
            border: '1px solid #607c9a',
            borderRadius: 9,
            boxShadow: '0 12px 30px rgba(0,0,0,0.65)',
            display: 'grid',
            gap: 12,
            maxHeight: 'min(70vh, 530px)',
            overflowY: 'auto'
          }}
        >
          {KEY_GROUPS.map(group => (
            <div
              key={group.title}
              style={{
                display: 'block',
                minWidth: 0
              }}
            >
              <div style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: 5,
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'hidden'
              }}>
                {group.keys.map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      if (group.title === 'Symbols & algebra') {
                        // Algebra keys remain cursor insertions.
                        insert(value);
                        return;
                      }

                      // Library functions are complete presets:
                      // replace the input rather than append at
                      // the current cursor position.
                      const field = fieldRef.current;
                      if (!field) return;

                      let selected = value.replaceAll('#0', 'z');

                      // Preserve the verified thin space in
                      // the gamma reflection product.
                      if (label === 'Γ(1+z)Γ(1−z)') {
                        selected = String.raw`\Gamma\left(1+z\right)\,\Gamma\left(1-z\right)`;
                      }

                      field.value = selected;
                      changeRef.current(field.value);

                      // Update the name after changing the value.
                      onFunctionSelect?.(
                        FUNCTION_LIBRARY_TITLES[label] ?? ''
                      );

                      setKeyboardOpen(false);
                      field.focus();
                    }}
                    aria-pressed={selectedLibraryValue(value)}
                    style={{
                      position: 'relative',
                      height: 32,
                      flex: '0 0 auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      padding: group.title === 'Symbols & algebra'
                        ? '0 9px'
                        : group.title === 'Planck geometries'
                          ? '0 8px'
                          : '0 3px',
                      boxSizing: 'border-box',
                      border: selectedLibraryValue(value)
                        ? '1px solid #a6c8ed' : '1px solid #526b86',
                      borderRadius: 5,
                      background: selectedLibraryValue(value)
                        ? 'linear-gradient(155deg, rgba(205,225,246,0.25) 0%, rgba(91,115,145,0.13) 42%, rgba(12,19,30,0.92) 100%)'
                        : '#0d1420',
                      boxShadow: selectedLibraryValue(value)
                        ? 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(120,155,190,0.12), 0 0 7px rgba(155,195,235,0.12)'
                        : 'none',
                      color: '#eff4fb',
                      fontSize: 16,
                      fontFamily: 'inherit',
                      fontWeight: selectedLibraryValue(value) ? 700 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      lineHeight: 1
                    }}
                  >
                    <span style={{
                      pointerEvents: 'none'
                    }}>
                      {group.title === 'Symbols & algebra'
                        ? <MathVariableLabel text={label} />
                        : group.title === 'Planck geometries'
                        ? <MathVariableLabel text={label} />
                        : <LibraryFormula label={label} value={value} />}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2,
                        cursor: 'pointer'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    </div>
  );
}
